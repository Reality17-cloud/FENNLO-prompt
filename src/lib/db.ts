import "server-only";
import { Pool, type PoolClient } from "pg";
import { appConfig } from "./app-config";

const globals = globalThis as unknown as { fennloPool?: Pool };
export function database() {
  if (!globals.fennloPool) {
    globals.fennloPool = new Pool({
      connectionString: appConfig().databaseUrl,
      max: 12,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 15_000,
      lock_timeout: 5_000,
      idle_in_transaction_session_timeout: 20_000,
    });
    globals.fennloPool.on("error", () =>
      console.error(JSON.stringify({ event: "database_connection_failed" })),
    );
  }
  return globals.fennloPool;
}
export async function transaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const value = await work(c);
    await c.query("COMMIT");
    return value;
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    c.release();
  }
}
