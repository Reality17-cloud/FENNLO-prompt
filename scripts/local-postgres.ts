import EmbeddedPostgres from "embedded-postgres";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { controlPostgres } from "./postgres-control";
// Generic donor development-only PostgreSQL pattern; no donor data or schemas.
const cluster = new EmbeddedPostgres({
  databaseDir: resolve("work/postgres"),
  user: "fennlo",
  password: "fennlo-local-only",
  port: 55435,
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});
try {
  if (!existsSync("work/postgres/PG_VERSION")) await cluster.initialise();
  await controlPostgres("work/postgres", 55435, "start");
  const c = cluster.getPgClient("postgres", "127.0.0.1");
  await c.connect();
  for (const name of ["fennlo_prompt", "fennlo_prompt_test"]) {
    if (
      !(await c.query("SELECT 1 FROM pg_database WHERE datname=$1", [name]))
        .rowCount
    )
      await c.query(
        `CREATE DATABASE ${name} WITH TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`,
      );
  }
  await c.end();
  console.log("Durable local PostgreSQL ready on 127.0.0.1:55435.");
  const keepAlive = setInterval(() => {}, 60_000);
  const stop = async () => {
    clearInterval(keepAlive);
    await controlPostgres("work/postgres", 55435, "stop");
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} catch {
  console.error("Local PostgreSQL could not start.");
  await controlPostgres("work/postgres", 55435, "stop");
  process.exitCode = 1;
}
