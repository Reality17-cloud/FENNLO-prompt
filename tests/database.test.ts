import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { migrate } from "../scripts/migration-lib";
import { AuthService } from "../src/lib/auth-service";
import { ThreadService } from "../src/lib/threads";
import { tokenHash } from "../src/lib/security";
import fixtures from "./fixtures/formation-cases.json";
const url =
  process.env.TEST_DATABASE_URL ??
  "postgresql://fennlo:fennlo-local-only@127.0.0.1:55435/fennlo_prompt_test";
const schema = `test_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString: url });
const pool = new Pool({
  connectionString: url,
  options: `-c search_path=${schema}`,
});
const auth = new AuthService(pool),
  threads = new ThreadService(pool),
  password = "a strong test passphrase";
const first = fixtures[0],
  second = fixtures[1];
let a: Awaited<ReturnType<AuthService["signup"]>>, b: typeof a;
beforeAll(async () => {
  if (!new URL(url).pathname.endsWith("_test"))
    throw new Error(
      "TEST_DATABASE_URL must name a dedicated database ending in _test.",
    );
  await admin.query(`CREATE SCHEMA ${schema}`);
  await migrate(pool);
  await migrate(pool);
  a = await auth.signup({ email: "a@example.test", password });
  b = await auth.signup({ email: "b@example.test", password });
}, 20_000);
afterAll(async () => {
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await admin.end();
});
describe("real PostgreSQL workspace", () => {
  it("persists and edits client identity without changing goals, turns, Formation or provider input", async () => {
    const t = await threads.create(a.user.id, {
      clientName: " Sarah Chen ",
      title: "Acme Website",
      goal: first.goal,
    });
    expect(t.clientName).toBe("Sarah Chen");
    expect(await threads.list(a.user.id)).toContainEqual({
      id: t.id,
      title: "Acme Website",
      status: "ACTIVE",
      clientName: "Sarah Chen",
    });
    const generate = vi.fn(async () => first.mock_result);
    await threads.determine(
      a.user.id,
      t.id,
      { id: randomUUID(), reality: first.conversation },
      { generate },
    );
    expect(JSON.stringify(generate.mock.calls)).not.toContain("Sarah Chen");
    const before = await threads.detail(a.user.id, t.id);
    const formation = (
      await pool.query("SELECT formation FROM client_threads WHERE id=$1", [
        t.id,
      ])
    ).rows[0].formation;
    await expect(
      threads.update(b.user.id, t.id, {
        clientName: "Stolen",
        version: before.thread.version,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await threads.update(a.user.id, t.id, {
      clientName: "Daniel Tan",
      version: before.thread.version,
    });
    const after = await threads.detail(a.user.id, t.id);
    expect(after.thread.clientName).toBe("Daniel Tan");
    expect(after.thread.goal).toBe(before.thread.goal);
    expect(after.thread.title).toBe(before.thread.title);
    expect(after.turns).toEqual(before.turns);
    expect(
      (
        await pool.query("SELECT formation FROM client_threads WHERE id=$1", [
          t.id,
        ])
      ).rows[0].formation,
    ).toEqual(formation);
    const legacy = await threads.create(a.user.id, { goal: first.goal });
    expect(legacy.clientName).toBeNull();
    await threads.update(a.user.id, legacy.id, {
      title: "Existing project",
      version: 0,
    });
    expect(
      (await threads.detail(a.user.id, legacy.id)).thread.clientName,
    ).toBeNull();
  });
  it("stores only password and session hashes; opaque expiring sessions authenticate", async () => {
    const user = (
      await pool.query("SELECT * FROM users WHERE id=$1", [a.user.id])
    ).rows[0];
    expect(user.password_hash).toMatch(/^scrypt\$v1\$/);
    expect(user.password_hash).not.toContain(password);
    const s = (
      await pool.query("SELECT * FROM user_sessions WHERE user_id=$1", [
        a.user.id,
      ])
    ).rows[0];
    expect(s.token_hash).toBe(tokenHash(a.token));
    expect(s.token_hash).not.toBe(a.token);
    expect(await auth.authenticate(a.token)).toEqual(a.user);
    expect(await auth.authenticate("invalid")).toBeNull();
  });
  it("signs in, rejects bad passwords generically and revokes logout", async () => {
    await expect(
      auth.signin({ email: a.user.email, password: "bad" }),
    ).rejects.toMatchObject({ code: "AUTH_INVALID" });
    await expect(
      auth.signin({ email: "missing@example.test", password }),
    ).rejects.toMatchObject({ code: "AUTH_INVALID" });
    const login = await auth.signin({
      email: a.user.email.toUpperCase(),
      password,
    });
    expect(await auth.authenticate(login.token)).toEqual(a.user);
    await auth.logout(login.token);
    expect(await auth.authenticate(login.token)).toBeNull();
  });
  it("expires sessions and applies durable rate limits", async () => {
    const login = await auth.signin({ email: a.user.email, password });
    await pool.query(
      "UPDATE user_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",
      [tokenHash(login.token)],
    );
    expect(await auth.authenticate(login.token)).toBeNull();
    await auth.limit("test-limit", 1);
    await expect(auth.limit("test-limit", 1)).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
    for (let i = 0; i < 5; i++)
      await expect(
        auth.signup({ email: a.user.email, password }),
      ).rejects.toBeDefined();
    await expect(
      auth.signup({ email: a.user.email, password }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
  it("creates independent threads, persists chronology, continues from saved state, replays IDs without duplicate AI", async () => {
    const t = await threads.create(a.user.id, {
      title: "Acme",
      goal: first.goal,
    });
    const other = await threads.create(a.user.id, {
      title: "Video",
      goal: "Keep the relationship.",
    });
    expect((await threads.detail(a.user.id, t.id)).thread.goal).toBe(
      first.goal,
    );
    const id = randomUUID();
    await threads.determine(
      a.user.id,
      t.id,
      { id, reality: first.conversation },
      { generate: async () => first.mock_result },
    );
    const generate = vi.fn(async () => ({
      ...second.mock_result,
      formed: [first.conversation, second.conversation],
    }));
    const continued = await threads.determine(
      a.user.id,
      t.id,
      { id: randomUUID(), reality: second.conversation },
      { generate },
    );
    expect(continued.turns).toHaveLength(2);
    expect(continued.thread.goal).toBe(first.goal);
    expect(JSON.stringify(continued)).not.toContain("current_state");
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previous_state: expect.objectContaining({
            formed: [first.conversation],
          }),
        }),
      }),
    );
    const restartedPool = new Pool({
      connectionString: url,
      options: `-c search_path=${schema}`,
    });
    try {
      expect(
        await new ThreadService(restartedPool).detail(a.user.id, t.id),
      ).toEqual(continued);
    } finally {
      await restartedPool.end();
    }
    expect((await threads.detail(a.user.id, other.id)).turns).toHaveLength(0);
    const replay = vi.fn();
    await threads.determine(
      a.user.id,
      t.id,
      { id, reality: first.conversation },
      { generate: replay },
    );
    expect(replay).not.toHaveBeenCalled();
    expect((await threads.detail(a.user.id, t.id)).turns).toHaveLength(2);
  });
  it("isolates owners for detail, updates, determinations and lists", async () => {
    const t = await threads.create(a.user.id, { goal: first.goal });
    await expect(threads.detail(b.user.id, t.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      threads.update(b.user.id, t.id, { title: "stolen", version: 0 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const generate = vi.fn();
    await expect(
      threads.determine(
        b.user.id,
        t.id,
        { id: randomUUID(), reality: first.conversation },
        { generate },
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(generate).not.toHaveBeenCalled();
    expect(await threads.list(b.user.id)).toEqual([]);
  });
  it("only explicit actions change goal, rename, archive, complete and reopen", async () => {
    const t = await threads.create(a.user.id, {
      title: "old",
      goal: first.goal,
    });
    await threads.update(a.user.id, t.id, {
      title: "new",
      goal: "Decline respectfully.",
      version: 0,
    });
    let d = await threads.detail(a.user.id, t.id);
    expect(d.thread.title).toBe("new");
    expect(d.turns[0]).toMatchObject({
      kind: "GOAL",
      reality: "Decline respectfully.",
      goalAtTurn: first.goal,
    });
    await threads.update(a.user.id, t.id, {
      status: "ARCHIVED",
      version: d.thread.version,
    });
    await expect(
      threads.determine(
        a.user.id,
        t.id,
        { id: randomUUID(), reality: first.conversation },
        { generate: async () => first.mock_result },
      ),
    ).rejects.toMatchObject({ code: "THREAD_CLOSED" });
    d = await threads.detail(a.user.id, t.id);
    await threads.update(a.user.id, t.id, {
      status: "ACTIVE",
      version: d.thread.version,
    });
    d = await threads.detail(a.user.id, t.id);
    await threads.update(a.user.id, t.id, {
      status: "COMPLETED",
      version: d.thread.version,
    });
    expect((await threads.detail(a.user.id, t.id)).thread.status).toBe(
      "COMPLETED",
    );
    await expect(
      threads.update(a.user.id, t.id, { title: "stale", version: 0 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("rejects invalid model state without overwriting verified Formation and retries saved Reality", async () => {
    const t = await threads.create(a.user.id, { goal: first.goal });
    await threads.determine(
      a.user.id,
      t.id,
      { id: randomUUID(), reality: first.conversation },
      { generate: async () => first.mock_result },
    );
    const before = (
      await pool.query("SELECT formation FROM client_threads WHERE id=$1", [
        t.id,
      ])
    ).rows[0].formation;
    const id = randomUUID();
    await expect(
      threads.determine(
        a.user.id,
        t.id,
        { id, reality: second.conversation },
        {
          generate: async () => ({ ...second.mock_result, goal: "overwrite" }),
        },
      ),
    ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE" });
    expect(
      (
        await pool.query("SELECT formation FROM client_threads WHERE id=$1", [
          t.id,
        ])
      ).rows[0].formation,
    ).toEqual(before);
    expect((await threads.detail(a.user.id, t.id)).turns[1].status).toBe(
      "FAILED",
    );
    await expect(
      threads.determine(
        a.user.id,
        t.id,
        { id: randomUUID(), reality: "Another fact" },
        { generate: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await threads.determine(
      a.user.id,
      t.id,
      { id, reality: second.conversation },
      { generate: async () => second.mock_result },
    );
    expect((await threads.detail(a.user.id, t.id)).turns).toHaveLength(2);
  });
  it("serializes concurrent turns, blocks goal edits during inference and recovers expired leases", async () => {
    const t = await threads.create(a.user.id, { goal: first.goal });
    let release!: (v: unknown) => void;
    const output = new Promise((resolve) => {
      release = resolve;
    });
    const generate = vi.fn(() => output);
    const running = threads.determine(
      a.user.id,
      t.id,
      { id: randomUUID(), reality: first.conversation },
      { generate },
    );
    await vi.waitFor(() => expect(generate).toHaveBeenCalled());
    await expect(
      threads.update(a.user.id, t.id, { goal: "override", version: 0 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      threads.determine(
        a.user.id,
        t.id,
        { id: randomUUID(), reality: second.conversation },
        { generate: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    release(first.mock_result);
    await running;
    const id = randomUUID();
    await pool.query(
      "INSERT INTO thread_turns(id,thread_id,kind,reality,goal_at_turn,status) VALUES($1,$2,'REALITY',$3,$4,'PENDING')",
      [id, t.id, second.conversation, first.goal],
    );
    await pool.query(
      "UPDATE client_threads SET pending_id=$2,pending_until=now()-interval '1 second' WHERE id=$1",
      [t.id, id],
    );
    expect((await threads.detail(a.user.id, t.id)).turns[1].status).toBe(
      "FAILED",
    );
    await threads.determine(
      a.user.id,
      t.id,
      { id, reality: second.conversation },
      { generate: async () => second.mock_result },
    );
    expect((await threads.detail(a.user.id, t.id)).turns[1].status).toBe(
      "COMPLETE",
    );
  });
  it("prevents an expired worker from committing over a retry of the same turn", async () => {
    const t = await threads.create(a.user.id, { goal: first.goal });
    const id = randomUUID();
    let oldRelease!: (v: unknown) => void, newRelease!: (v: unknown) => void;
    const oldOutput = new Promise((resolve) => {
      oldRelease = resolve;
    });
    const newOutput = new Promise((resolve) => {
      newRelease = resolve;
    });
    const oldGenerate = vi.fn(() => oldOutput),
      newGenerate = vi.fn(() => newOutput);
    const oldRun = threads.determine(
      a.user.id,
      t.id,
      { id, reality: first.conversation },
      { generate: oldGenerate },
    );
    const oldRejected = expect(oldRun).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await vi.waitFor(() => expect(oldGenerate).toHaveBeenCalled());
    await pool.query(
      "UPDATE client_threads SET pending_until=now()-interval '1 second' WHERE id=$1",
      [t.id],
    );
    const newRun = threads.determine(
      a.user.id,
      t.id,
      { id, reality: first.conversation },
      { generate: newGenerate },
    );
    await vi.waitFor(() => expect(newGenerate).toHaveBeenCalled());
    oldRelease(first.mock_result);
    await oldRejected;
    expect((await threads.detail(a.user.id, t.id)).thread.processing).toBe(
      true,
    );
    newRelease(first.mock_result);
    await newRun;
    expect((await threads.detail(a.user.id, t.id)).turns[0].status).toBe(
      "COMPLETE",
    );
  });
  it("cannot recreate account data when erasure happens during inference", async () => {
    const c = await auth.signup({ email: "inflight@example.test", password });
    const t = await threads.create(c.user.id, { goal: first.goal });
    let release!: (v: unknown) => void;
    const output = new Promise((resolve) => {
      release = resolve;
    });
    const generate = vi.fn(() => output);
    const running = threads.determine(
      c.user.id,
      t.id,
      { id: randomUUID(), reality: first.conversation },
      { generate },
    );
    const rejected = expect(running).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await vi.waitFor(() => expect(generate).toHaveBeenCalled());
    await auth.deleteAccount(c.user.id, password);
    release(first.mock_result);
    await rejected;
    expect(await auth.authenticate(c.token)).toBeNull();
    expect(
      (
        await pool.query("SELECT id FROM thread_turns WHERE thread_id=$1", [
          t.id,
        ])
      ).rowCount,
    ).toBe(0);
  });
  it("paginates a long timeline chronologically", async () => {
    const t = await threads.create(a.user.id, { goal: first.goal });
    for (let i = 0; i < 55; i++)
      await pool.query(
        "INSERT INTO thread_turns(id,thread_id,kind,reality,goal_at_turn,status) VALUES($1,$2,'GOAL',$3,$4,'EVENT')",
        [randomUUID(), t.id, `Goal ${i}`, first.goal],
      );
    const latest = await threads.detail(a.user.id, t.id);
    expect(latest.turns).toHaveLength(50);
    expect(latest.older).toBe(true);
    const earlier = await threads.detail(
      a.user.id,
      t.id,
      latest.turns[0].sequence,
    );
    expect(earlier.turns).toHaveLength(5);
    expect(earlier.turns[0].reality).toBe("Goal 0");
    expect(earlier.older).toBe(false);
  });
  it("account deletion cascades all data and invalidates all sessions", async () => {
    const secondSession = await auth.signin({ email: b.user.email, password });
    const t = await threads.create(b.user.id, { goal: first.goal });
    await threads.determine(
      b.user.id,
      t.id,
      { id: randomUUID(), reality: first.conversation },
      { generate: async () => first.mock_result },
    );
    await expect(auth.deleteAccount(b.user.id, "wrong")).rejects.toMatchObject({
      code: "AUTH_INVALID",
    });
    await auth.deleteAccount(b.user.id, password);
    expect(await auth.authenticate(b.token)).toBeNull();
    expect(await auth.authenticate(secondSession.token)).toBeNull();
    expect(
      (
        await pool.query("SELECT * FROM thread_turns WHERE thread_id=$1", [
          t.id,
        ])
      ).rowCount,
    ).toBe(0);
    expect(
      (await pool.query("SELECT * FROM client_threads WHERE id=$1", [t.id]))
        .rowCount,
    ).toBe(0);
    expect(await auth.authenticate(a.token)).toEqual(a.user);
  });
});
