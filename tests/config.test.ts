import { describe, expect, it } from "vitest";
import { readAIConfig } from "../src/lib/config";

const base = {
  AI_API_KEY: "private-test-key",
  AI_BASE_URL: "https://provider.example/v1",
  AI_MODEL: "configurable-model",
};
describe("server configuration", () => {
  it("requires an explicit key, base URL, and model with no paid defaults", () => {
    for (const field of Object.keys(base))
      expect(() => readAIConfig({ ...base, [field]: "" })).toThrow(
        "Fennlo is not ready",
      );
    expect(readAIConfig(base)).toMatchObject({
      AI_OUTPUT_MODE: "json_object",
      AI_TIMEOUT_MS: 30000,
      AI_MAX_OUTPUT_TOKENS: 2400,
    });
  });
  it.each([
    "http://provider.example/v1",
    "ftp://provider.example/v1",
    "https://user:secret@provider.example/v1",
    "https://provider.example/v1?key=secret",
    "https://provider.example/v1#secret",
  ])("rejects unsafe credential destinations %s", (url) => {
    expect(() => readAIConfig({ ...base, AI_BASE_URL: url })).toThrow(
      "Fennlo is not ready",
    );
  });
  it("permits HTTP only on loopback for local provider tests", () => {
    expect(
      readAIConfig({ ...base, AI_BASE_URL: "http://127.0.0.1:3101/v1" })
        .AI_MODEL,
    ).toBe(base.AI_MODEL);
  });
  it("requires operator acknowledgement of Alibaba's console billing control", () => {
    const alibaba = {
      ...base,
      AI_BASE_URL:
        "https://workspace.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
    };
    expect(() => readAIConfig(alibaba)).toThrow("Fennlo is not ready");
    expect(() =>
      readAIConfig({ ...alibaba, AI_FREE_QUOTA_ONLY_CONFIRMED: "false" }),
    ).toThrow();
    expect(
      readAIConfig({ ...alibaba, AI_FREE_QUOTA_ONLY_CONFIRMED: "true" })
        .AI_FREE_QUOTA_ONLY_CONFIRMED,
    ).toBe(true);
  });
  it.each([
    { AI_TIMEOUT_MS: "999" },
    { AI_TIMEOUT_MS: "60001" },
    { AI_MAX_OUTPUT_TOKENS: "100000" },
    { AI_OUTPUT_MODE: "auto" },
    { AI_ENABLE_THINKING: "yes" },
  ])("rejects unbounded or unknown options %#", (options) => {
    expect(() => readAIConfig({ ...base, ...options })).toThrow(
      "Fennlo is not ready",
    );
  });
  it("empty optional values use defaults and omit provider-specific extensions", () => {
    expect(
      readAIConfig({
        ...base,
        AI_TIMEOUT_MS: "",
        AI_OUTPUT_MODE: "",
        AI_ENABLE_THINKING: "",
      }),
    ).toMatchObject({
      AI_TIMEOUT_MS: 30000,
      AI_OUTPUT_MODE: "json_object",
      AI_ENABLE_THINKING: undefined,
    });
  });
});
