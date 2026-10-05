import { afterEach, describe, expect, it, vi } from "vitest";
import { CompatibleProvider, type ModelRequest } from "../src/lib/provider";
import { readAIConfig } from "../src/lib/config";

const config = readAIConfig({
  AI_API_KEY: "private-test-key",
  AI_BASE_URL: "https://provider.example/v1/",
  AI_MODEL: "qwen-configurable",
  AI_TIMEOUT_MS: "1000",
});
const request: ModelRequest = {
  system: "Return JSON only.",
  data: {
    client_conversation: "Private client text",
    user_goal: "Private goal",
  },
  schema: { type: "object", properties: {} },
};
const envelope = (content = '{"ok":true}', finish_reason = "stop") => ({
  choices: [{ finish_reason, message: { content } }],
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("OpenAI-compatible provider transport", () => {
  it.each(["json_schema", "json_object", "json_only"] as const)(
    "makes one bounded request in %s mode",
    async (mode) => {
      const fetch = vi.fn().mockResolvedValue(Response.json(envelope()));
      expect(
        await new CompatibleProvider(
          { ...config, AI_OUTPUT_MODE: mode },
          fetch,
        ).generate(request),
      ).toEqual({ ok: true });
      expect(fetch).toHaveBeenCalledOnce();
      const [url, init] = fetch.mock.calls[0];
      expect(url).toBe("https://provider.example/v1/chat/completions");
      expect(init).toMatchObject({
        cache: "no-store",
        redirect: "error",
        headers: { Authorization: "Bearer private-test-key" },
      });
      const body = JSON.parse(init.body);
      expect(body.model).toBe("qwen-configurable");
      expect(body.max_tokens).toBe(2400);
      expect(body.messages[1]).toEqual({
        role: "user",
        content: JSON.stringify(request.data),
      });
      expect(body.messages[0].content).toContain("Required JSON schema");
      expect(body).not.toHaveProperty("enable_thinking");
      if (mode === "json_schema")
        expect(body.response_format).toMatchObject({
          type: "json_schema",
          json_schema: { strict: true, schema: request.schema },
        });
      if (mode === "json_object")
        expect(body.response_format).toEqual({ type: "json_object" });
      if (mode === "json_only")
        expect(body).not.toHaveProperty("response_format");
    },
  );
  it("can disable Qwen thinking explicitly without hard-coding a model", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(envelope()));
    await new CompatibleProvider(
      { ...config, AI_ENABLE_THINKING: false },
      fetch,
    ).generate(request);
    expect(JSON.parse(fetch.mock.calls[0][1].body).enable_thinking).toBe(false);
  });
  it("times out a stalled connection, aborts it, and never retries", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(() => new Promise<Response>(() => undefined));
    const operation = new CompatibleProvider(config, fetch).generate(request);
    const assertion = expect(operation).rejects.toMatchObject({
      code: "AI_TIMEOUT",
      status: 504,
    });
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
    expect(fetch).toHaveBeenCalledOnce();
    expect(
      (fetch.mock.calls as unknown as [string, RequestInit][])[0][1].signal
        ?.aborted,
    ).toBe(true);
  });
  it("the same timeout covers a stalled response body and cancels the stream", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode('{"choices":'));
          },
          cancel,
        }),
      ),
    );
    const assertion = expect(
      new CompatibleProvider(config, fetch).generate(request),
    ).rejects.toMatchObject({ code: "AI_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
    expect(cancel).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledOnce();
  });
  it.each([400, 401, 403, 429, 500, 503])(
    "%i safely cancels upstream errors without a paid or schema fallback",
    async (status) => {
      const cancel = vi.fn();
      const fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(new ReadableStream({ cancel }), { status }),
        );
      await expect(
        new CompatibleProvider(config, fetch).generate(request),
      ).rejects.toMatchObject({ code: "AI_UNAVAILABLE", status: 503 });
      expect(cancel).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledOnce();
    },
  );
  it.each(["{broken", "```json\n{}\n```", "", "null"])(
    'rejects unusable model JSON "%s"',
    async (content) => {
      const fetch = vi.fn().mockResolvedValue(Response.json(envelope(content)));
      if (content === "null")
        expect(
          await new CompatibleProvider(config, fetch).generate(request),
        ).toBeNull(); // Formation validation then rejects it.
      else
        await expect(
          new CompatibleProvider(config, fetch).generate(request),
        ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
      expect(fetch).toHaveBeenCalledOnce();
    },
  );
  it.each([
    envelope("{}", "length"),
    envelope("{}", "content_filter"),
    { choices: [] },
    {
      choices: [
        { finish_reason: "stop", message: { content: "{}", refusal: "No" } },
      ],
    },
    {
      choices: [
        {
          finish_reason: "stop",
          message: { content: "{}", tool_calls: [{ id: "a" }] },
        },
      ],
    },
  ])("rejects incomplete, refused, or tool output %#", async (body) => {
    const fetch = vi.fn().mockResolvedValue(Response.json(body));
    await expect(
      new CompatibleProvider(config, fetch).generate(request),
    ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
  });
  it("bounds response bytes while streaming and cancels oversized bodies", async () => {
    const cancel = vi.fn();
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array(65_537));
          },
          cancel,
        }),
      ),
    );
    await expect(
      new CompatibleProvider(config, fetch).generate(request),
    ).rejects.toMatchObject({ code: "AI_RESPONSE_LIMIT" });
    expect(cancel).toHaveBeenCalled();
  });
  it("fails safely on corrupt outer JSON and transport errors", async () => {
    await expect(
      new CompatibleProvider(
        config,
        vi.fn().mockResolvedValue(new Response("private-malformed")),
      ).generate(request),
    ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
    await expect(
      new CompatibleProvider(
        config,
        vi.fn().mockRejectedValue(new Error("private-key and payload")),
      ).generate(request),
    ).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  });
  it("bounds outbound input before sending credentials", async () => {
    const fetch = vi.fn();
    await expect(
      new CompatibleProvider(config, fetch).generate({
        ...request,
        data: "x".repeat(180_001),
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
