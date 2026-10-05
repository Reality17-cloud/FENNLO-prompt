import { Pool } from "pg";
import { migrate } from "../../scripts/migration-lib";
export default async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ??
    "postgresql://fennlo:fennlo-local-only@127.0.0.1:55435/fennlo_prompt_test";
  if (!new URL(url).pathname.endsWith("_test"))
    throw new Error("Browser tests require a dedicated _test database.");
  const pool = new Pool({ connectionString: url });
  try {
    await migrate(pool);
    await pool.query("TRUNCATE users,rate_limits CASCADE");
  } finally {
    await pool.end();
  }
}
