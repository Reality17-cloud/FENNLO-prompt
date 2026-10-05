import { describe, expect, it } from "vitest";
import { appConfig } from "../src/lib/app-config";
const env = {
  APP_URL: "https://fennlo.example",
  DATABASE_URL: "postgresql://user:password@db.example/fennlo",
};
describe("deployment configuration", () => {
  it("uses secure cookies on HTTPS and permits loopback development", () => {
    expect(appConfig(env).secure).toBe(true);
    expect(appConfig({ ...env, APP_URL: "http://127.0.0.1:3000" }).secure).toBe(
      false,
    );
  });
  it.each([
    "http://public.example",
    "https://a:b@fennlo.example",
    "https://fennlo.example/path",
    "https://fennlo.example?x=y",
    "",
  ])("rejects unsafe APP_URL %s", (APP_URL) => {
    expect(() => appConfig({ ...env, APP_URL })).toThrow();
  });
  it.each(["", "sqlite:test", "postgresql://localhost"])(
    "requires PostgreSQL %s",
    (DATABASE_URL) => {
      expect(() => appConfig({ ...env, DATABASE_URL })).toThrow();
    },
  );
});
