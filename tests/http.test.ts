import { describe, expect, it, vi, afterEach } from "vitest";
import { checkOrigin, readJson, clientIp, failure } from "../src/lib/http";
const env = () => {
  vi.stubEnv("APP_URL", "https://fennlo.example");
  vi.stubEnv("DATABASE_URL", "postgresql://user:local@localhost/test");
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("authenticated mutation boundary", () => {
  it("uses configured origin instead of attacker controlled Host and forwarded headers", () => {
    env();
    expect(() =>
      checkOrigin(
        new Request("http://internal/api", {
          headers: {
            Origin: "https://attacker.example",
            Host: "attacker.example",
            "X-Forwarded-Host": "fennlo.example",
          },
        }),
      ),
    ).toThrow();
    expect(() =>
      checkOrigin(
        new Request("http://internal/api", {
          headers: { Origin: "https://fennlo.example" },
        }),
      ),
    ).not.toThrow();
  });
  it("rejects cross-site, non-JSON, malformed and oversized bodies", async () => {
    env();
    const r = (body: string, headers = {}) =>
      new Request("https://fennlo.example/api", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json", ...headers },
      });
    await expect(
      readJson(r("{}", { "Sec-Fetch-Site": "cross-site" })),
    ).rejects.toMatchObject({ code: "CROSS_ORIGIN" });
    await expect(
      readJson(r("{}", { "Content-Type": "text/plain" })),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA" });
    await expect(readJson(r("bad"))).rejects.toMatchObject({
      code: "INVALID_BODY",
    });
    await expect(readJson(r("x".repeat(160001)))).rejects.toMatchObject({
      code: "BODY_TOO_LARGE",
    });
  });
  it("ignores IP headers unless the operator configures a trusted proxy header", () => {
    env();
    const r = new Request("https://fennlo.example", {
      headers: { "X-Forwarded-For": "spoofed", "X-Client-IP": "127.0.0.1" },
    });
    expect(clientIp(r)).toBeUndefined();
    vi.stubEnv("TRUSTED_CLIENT_IP_HEADER", "X-Client-IP");
    expect(clientIp(r)).toBe("127.0.0.1");
  });
  it("never returns or logs unexpected database/provider details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = failure(new Error("private query, password, client text"));
    expect(await response.json()).toEqual({
      code: "INTERNAL_ERROR",
      error: "Fennlo couldn't complete this request. Please try again.",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private");
  });
});
