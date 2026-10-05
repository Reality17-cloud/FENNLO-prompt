import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  retries: 0,
  globalSetup: "./tests/browser/setup.ts",
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1050 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  // Explicit local fixture endpoint. Never uses .env.local credentials or live quota.
  webServer: [
    {
      command: "node tests/browser/mock-provider.mjs",
      url: "http://127.0.0.1:3101/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      env: {
        APP_URL: "http://127.0.0.1:3100",
        DATABASE_URL:
          process.env.TEST_DATABASE_URL ??
          "postgresql://fennlo:fennlo-local-only@127.0.0.1:55435/fennlo_prompt_test",
        TRUSTED_CLIENT_IP_HEADER: "",
        AI_API_KEY: "local-browser-test-only",
        AI_BASE_URL: "http://127.0.0.1:3101/v1",
        AI_MODEL: "fixture-only",
        AI_OUTPUT_MODE: "json_object",
        AI_TIMEOUT_MS: "1500",
        AI_MAX_OUTPUT_TOKENS: "2400",
        AI_ENABLE_THINKING: "",
        AI_FREE_QUOTA_ONLY_CONFIRMED: "false",
        NEXT_TELEMETRY_DISABLED: "1",
      },
    },
  ],
});
