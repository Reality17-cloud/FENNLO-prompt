// Uses a real isolated PostgreSQL cluster and production Next process. No live AI.
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import EmbeddedPostgres from "embedded-postgres";
import { Pool } from "pg";
import { migrate } from "./migration-lib";
import { controlPostgres } from "./postgres-control";
import fixtures from "../tests/fixtures/formation-cases.json";
const cluster = new EmbeddedPostgres({
  databaseDir: resolve("work/restart-postgres"),
  user: "fennlo",
  password: "restart-test-only",
  port: 55436,
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});
const dbUrl =
  "postgresql://fennlo:restart-test-only@127.0.0.1:55436/fennlo_prompt_restart_test";
const base = "http://127.0.0.1:3110";
const env = {
  ...process.env,
  APP_URL: base,
  DATABASE_URL: dbUrl,
  TRUSTED_CLIENT_IP_HEADER: "",
  AI_API_KEY: "local-browser-test-only",
  AI_BASE_URL: "http://127.0.0.1:3111/v1",
  AI_MODEL: "fixture-only",
  AI_OUTPUT_MODE: "json_object",
  AI_TIMEOUT_MS: "1500",
  AI_MAX_OUTPUT_TOKENS: "2400",
  AI_ENABLE_THINKING: "",
  AI_FREE_QUOTA_ONLY_CONFIRMED: "false",
  NEXT_TELEMETRY_DISABLED: "1",
};
let app: ChildProcess | undefined, provider: ChildProcess | undefined;
async function ready(url: string, child: ChildProcess) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null)
      throw new Error("Test server exited before readiness.");
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {
      /* Startup may take a moment. */
    }
    await delay(200);
  }
  throw new Error("Test server did not start.");
}
async function startApp() {
  app = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3110",
    ],
    { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  await ready(base, app);
}
async function stop(child?: ChildProcess) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise<void>((r) => child.once("exit", () => r()));
  child.kill();
  await exited;
}
let cookie = "";
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  expected = 200,
) {
  const res = await fetch(base + path, {
    method,
    headers: {
      Cookie: cookie,
      Origin: base,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.equal(res.status, expected, `${method} ${path} status`);
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return res.json();
}
try {
  if (!existsSync("work/restart-postgres/PG_VERSION"))
    await cluster.initialise();
  await controlPostgres("work/restart-postgres", 55436, "start");
  const admin = cluster.getPgClient("postgres", "127.0.0.1");
  await admin.connect();
  if (
    !(
      await admin.query(
        "SELECT 1 FROM pg_database WHERE datname='fennlo_prompt_restart_test'",
      )
    ).rowCount
  )
    await admin.query("CREATE DATABASE fennlo_prompt_restart_test");
  await admin.end();
  const pool = new Pool({ connectionString: dbUrl });
  try {
    await migrate(pool);
  } finally {
    await pool.end();
  }
  provider = spawn(process.execPath, ["tests/browser/mock-provider.mjs"], {
    env: { ...env, FIXTURE_PORT: "3111" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await ready("http://127.0.0.1:3111/health", provider);
  await startApp();
  const credentials = {
    email: `${randomUUID()}@restart.example.test`,
    password: "a durable restart test passphrase",
  };
  await request("/api/auth/signup", "POST", credentials, 201);
  const sessionBefore = cookie;
  const { thread } = await request(
    "/api/threads",
    "POST",
    {
      title: "Restart persistence",
      clientName: "Sarah Chen",
      goal: fixtures[0].goal,
    },
    201,
  );
  const before = await request(`/api/threads/${thread.id}/turns`, "POST", {
    id: randomUUID(),
    reality: fixtures[0].conversation,
  });
  assert.equal(before.thread.clientName, "Sarah Chen");
  assert.equal(before.turns.length, 1);
  assert.equal(before.turns[0].result.send, fixtures[0].mock_result.send);
  await stop(app);
  app = undefined;
  await controlPostgres("work/restart-postgres", 55436, "stop");
  console.log("Stopped the application and PostgreSQL processes.");
  await controlPostgres("work/restart-postgres", 55436, "start");
  await startApp();
  assert.deepEqual(
    await request(`/api/threads/${thread.id}`),
    before,
    "same persisted goal, Reality, result and timestamps after app/database restart",
  );
  await request("/api/auth/signout", "POST", {});
  await request("/api/auth/signin", "POST", credentials);
  assert.notEqual(cookie, sessionBefore);
  const reopened = await request(`/api/threads/${thread.id}`);
  assert.deepEqual(reopened, before);
  const after = await request(`/api/threads/${thread.id}/turns`, "POST", {
    id: randomUUID(),
    reality: "__continue__",
  });
  assert.equal(after.thread.clientName, "Sarah Chen");
  assert.equal(after.turns.length, 2);
  assert.equal(after.thread.goal, fixtures[0].goal);
  assert.equal(after.turns[1].result.send, fixtures[1].mock_result.send);
  assert.ok(after.thread.version > before.thread.version);
  assert.ok(!JSON.stringify(after).includes("current_state"));
  await request("/api/auth/delete", "POST", {
    password: credentials.password,
    confirmation: "DELETE",
  });
  console.log(
    "PASS: signup → saved thread/goal/Reality/result → stop app + PostgreSQL → restart both → signin → reopen → continue using persisted Formation → delete account.",
  );
} finally {
  await stop(app);
  await stop(provider);
  await controlPostgres("work/restart-postgres", 55436, "stop");
}
