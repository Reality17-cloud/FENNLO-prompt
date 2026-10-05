import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../src/app/api/next-move/route";
import fixtures from "./fixtures/formation-cases.json";
vi.mock("../src/lib/auth", () => ({
  requireAccount: vi.fn(async () => ({ id: "test-owner" })),
  quotaForAccount: vi.fn(async () => undefined),
}));

const fixture = fixtures[0];
const input = { conversation: fixture.conversation, goal: fixture.goal };
function req(body: unknown = input, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/next-move", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const modelEnvelope = (raw: unknown = fixture.mock_result) => ({
  choices: [
    { finish_reason: "stop", message: { content: JSON.stringify(raw) } },
  ],
});
let fetch: ReturnType<typeof vi.fn>;
let log: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubEnv("DATABASE_URL", "postgresql://user:local@localhost/test");
  vi.stubEnv("AI_API_KEY", "private-test-secret");
  vi.stubEnv("AI_BASE_URL", "https://provider.example/v1");
  vi.stubEnv("AI_MODEL", "configurable-qwen");
  vi.stubEnv("AI_TIMEOUT_MS", "1000");
  vi.stubEnv("AI_OUTPUT_MODE", "json_object");
  vi.stubEnv("AI_MAX_OUTPUT_TOKENS", "2400");
  vi.stubEnv("AI_ENABLE_THINKING", "");
  fetch = vi.fn().mockResolvedValue(Response.json(modelEnvelope()));
  vi.stubGlobal("fetch", fetch);
  log = vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("next-move HTTP boundary", () => {
  it("runs the whole formation/provider pipeline and returns only public fields", async () => {
    const response = await POST(req());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const result = await response.json();
    expect(result).toEqual({
      next_move: fixture.mock_result.next_move,
      send: fixture.mock_result.send,
      why: fixture.mock_result.why,
    });
    expect(Object.keys(result).sort()).toEqual(["next_move", "send", "why"]);
    expect(fetch).toHaveBeenCalledOnce();
    expect(log).not.toHaveBeenCalled();
  });
  it("represents a valid wait as null without leaking internal state", async () => {
    const wait = fixtures.find((f) => f.id === "wait-for-review")!;
    fetch.mockResolvedValue(Response.json(modelEnvelope(wait.mock_result)));
    const response = await POST(
      req({ conversation: wait.conversation, goal: wait.goal }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ send: null });
  });
  it.each([
    {},
    [],
    null,
    { ...input, goal: " " },
    { ...input, conversation: 12 },
    { ...input, model: "override" },
    { ...input, conversation: "x".repeat(20001) },
    { ...input, goal: "x".repeat(4001) },
  ])("rejects invalid input before calling AI %#", async (body) => {
    const response = await POST(req(body));
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["{bad-json", "", "not JSON"])(
    "rejects malformed body %s",
    async (body) => {
      const response = await POST(req(body));
      expect(response.status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("rejects non-JSON and cross-origin requests without spending quota", async () => {
    expect(
      (await POST(req(input, { "Content-Type": "text/plain" }))).status,
    ).toBe(415);
    expect(
      (await POST(req(input, { Origin: "https://malicious.example" }))).status,
    ).toBe(403);
    expect(
      (await POST(req(input, { "Sec-Fetch-Site": "cross-site" }))).status,
    ).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("accepts a public Host/Origin when Next reconstructs an internal request URL", async () => {
    vi.stubEnv("APP_URL", "https://beta.example");
    const response = await POST(
      req(input, { Host: "beta.example", Origin: "https://beta.example" }),
    );
    expect(response.status).toBe(200);
  });
  it("rejects invalid Origin text safely", async () => {
    expect((await POST(req(input, { Origin: "null" }))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("bounds both declared size and streamed size without trusting Content-Length", async () => {
    expect(
      (await POST(req(input, { "Content-Length": "160001" }))).status,
    ).toBe(413);
    expect(
      (await POST(req("x".repeat(160001), { "Content-Length": "1" }))).status,
    ).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("accepts long multilingual UTF-8 input within the documented limits", async () => {
    const conversation = "客".repeat(20_000);
    fetch.mockResolvedValue(
      Response.json(modelEnvelope({ ...fixture.mock_result, formed: ["客"] })),
    );
    expect(
      (await POST(req({ conversation, goal: "目".repeat(4000) }))).status,
    ).toBe(200);
  });
  it("gives a safe unconfigured error without logging secrets", async () => {
    vi.stubEnv("AI_API_KEY", "");
    const response = await POST(req());
    expect(response.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain("AI_API_KEY");
  });
  it.each([
    "not-json",
    JSON.stringify({ next_move: "Close", send: "Pay", why: "Trust me" }),
    JSON.stringify({
      ...fixture.mock_result,
      formed: ["invented client fact"],
    }),
  ])(
    "rejects invalid model output without revealing payload %s",
    async (content) => {
      fetch.mockResolvedValue(
        Response.json({
          choices: [{ finish_reason: "stop", message: { content } }],
        }),
      );
      const response = await POST(req());
      expect(response.status).toBe(502);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.text()).not.toContain(content);
      expect(JSON.stringify(log.mock.calls)).not.toContain(content);
      expect(log).toHaveBeenCalledWith(
        JSON.stringify({
          event: "next_move_failed",
          code: "AI_INVALID_RESPONSE",
          status: 502,
        }),
      );
      expect(fetch).toHaveBeenCalledOnce();
    },
  );
  it("maps quota exhaustion to a safe error and never falls back", async () => {
    fetch.mockResolvedValue(
      new Response("private upstream credentials", { status: 429 }),
    );
    const response = await POST(req());
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("quota is exhausted");
    expect(fetch).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain("private");
  });
  it("returns 504 on provider timeout and preserves privacy", async () => {
    vi.useFakeTimers();
    fetch.mockImplementation(() => new Promise(() => undefined));
    const responsePromise = POST(req());
    await vi.advanceTimersByTimeAsync(1001);
    const response = await responsePromise;
    expect(response.status).toBe(504);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(log.mock.calls)).not.toContain(fixture.conversation);
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-test-secret");
  });
});
