import nextEnv from "@next/env";
import { Pool } from "pg";
import { migrate } from "./migration-lib";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before migrating.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await migrate(pool);
  console.log("Migrations applied.");
} finally {
  await pool.end();
}
