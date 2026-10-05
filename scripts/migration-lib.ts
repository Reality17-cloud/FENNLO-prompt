import type { Pool } from "pg";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
export async function migrate(pool: Pool) {
  const c = await pool.connect();
  try {
    await c.query(
      "SELECT pg_advisory_lock(hashtextextended('fennlo-prompt-migrations',0))",
    );
    await c.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const file of (await readdir("migrations"))
      .filter((f) => /^\d+.*\.sql$/.test(f))
      .sort()) {
      const sql = await readFile(`migrations/${file}`, "utf8"),
        checksum = createHash("sha256").update(sql).digest("hex"),
        prior = await c.query<{ checksum: string }>(
          "SELECT checksum FROM schema_migrations WHERE version=$1",
          [file],
        );
      if (prior.rows[0]) {
        if (prior.rows[0].checksum !== checksum)
          throw new Error("Applied migration checksum changed.");
        continue;
      }
      await c.query("BEGIN");
      try {
        await c.query(sql);
        await c.query(
          "INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)",
          [file, checksum],
        );
        await c.query("COMMIT");
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      }
    }
  } finally {
    await c.query(
      "SELECT pg_advisory_unlock(hashtextextended('fennlo-prompt-migrations',0))",
    );
    c.release();
  }
}
