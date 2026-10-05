import { expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { migrate } from "../scripts/migration-lib";
import { ThreadService } from "../src/lib/threads";
import { snapshotSchema } from "../src/lib/formation";
import fixtures from "./fixtures/formation-cases.json";

it("upgrades an existing workspace without rewriting its history, goal or Formation", async () => {
  const url =
    process.env.TEST_DATABASE_URL ??
    "postgresql://fennlo:fennlo-local-only@127.0.0.1:55435/fennlo_prompt_test";
  if (!new URL(url).pathname.endsWith("_test"))
    throw new Error(
      "Migration verification requires a dedicated test database.",
    );
  const schema = `legacy_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: url });
  const pool = new Pool({
    connectionString: url,
    options: `-c search_path=${schema}`,
  });
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    await pool.query(
      "CREATE TABLE schema_migrations(version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const version of ["001_workspace.sql", "002_generation_lease.sql"]) {
      const sql = await readFile(`migrations/${version}`, "utf8");
      await pool.query(sql);
      await pool.query(
        "INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)",
        [version, createHash("sha256").update(sql).digest("hex")],
      );
    }
    const owner = randomUUID(),
      id = randomUUID(),
      turn = randomUUID();
    const f = fixtures[0];
    await pool.query(
      "INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)",
      [owner, "legacy@example.test", "migration-fixture-only"],
    );
    await pool.query(
      "INSERT INTO client_threads(id,owner_id,title,goal,formation,version) VALUES($1,$2,$3,$4,$5,1)",
      [
        id,
        owner,
        "Existing project",
        f.goal,
        snapshotSchema.parse(f.mock_result),
      ],
    );
    await pool.query(
      "INSERT INTO thread_turns(id,thread_id,kind,reality,goal_at_turn,status,result) VALUES($1,$2,'REALITY',$3,$4,'COMPLETE',$5)",
      [
        turn,
        id,
        f.conversation,
        f.goal,
        {
          next_move: f.mock_result.next_move,
          send: f.mock_result.send,
          why: f.mock_result.why,
        },
      ],
    );
    const before = (
      await pool.query("SELECT * FROM client_threads WHERE id=$1", [id])
    ).rows[0];
    const history = (
      await pool.query("SELECT * FROM thread_turns WHERE thread_id=$1", [id])
    ).rows;
    await migrate(pool);
    await migrate(pool);
    expect(
      (await pool.query("SELECT * FROM client_threads WHERE id=$1", [id]))
        .rows[0],
    ).toEqual({ ...before, client_name: null });
    expect(
      (await pool.query("SELECT * FROM thread_turns WHERE thread_id=$1", [id]))
        .rows,
    ).toEqual(history);
    const service = new ThreadService(pool);
    expect((await service.detail(owner, id)).thread.clientName).toBeNull();
    await service.update(owner, id, { clientName: "Sarah Chen", version: 1 });
    expect((await service.detail(owner, id)).thread.clientName).toBe(
      "Sarah Chen",
    );
    expect(
      (
        await pool.query("SELECT formation FROM client_threads WHERE id=$1", [
          id,
        ])
      ).rows[0].formation,
    ).toEqual(before.formation);
  } finally {
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
}, 20000);
