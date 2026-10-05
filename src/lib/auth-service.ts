import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { credentialsSchema, signupSchema } from "./workspace-schema";
import {
  dummyPasswordHash,
  hashAccountPassword,
  tokenHash,
  verifyAccountPassword,
} from "./security";
import { AppError } from "./errors";
import { transaction } from "./db";

export type Account = { id: string; email: string };
const validToken = (t: string) => /^[a-f0-9]{64}$/.test(t);
export class AuthService {
  constructor(private readonly pool: Pool) {}
  async limit(key: string, max: number, seconds = 900) {
    const { rows } = await this.pool.query<{ attempts: number }>(
      `INSERT INTO rate_limits(key,attempts) VALUES($1,1)
      ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN rate_limits.window_started_at<now()-($2*interval '1 second') THEN 1 ELSE rate_limits.attempts+1 END,
      window_started_at=CASE WHEN rate_limits.window_started_at<now()-($2*interval '1 second') THEN now() ELSE rate_limits.window_started_at END RETURNING attempts`,
      [key, seconds],
    );
    if (rows[0].attempts > max) throw new AppError("RATE_LIMITED");
  }
  private async authLimit(action: string, email: string, ip?: string) {
    await this.limit(
      `auth:${action}:global`,
      action === "signup" ? 100 : 1000,
      3600,
    );
    await this.limit(
      `auth:${action}:${tokenHash(email)}`,
      action === "signup" ? 5 : 20,
    );
    if (ip)
      await this.limit(
        `auth:${action}:ip:${tokenHash(ip)}`,
        action === "signup" ? 10 : 60,
      );
  }
  async signup(input: unknown, ip?: string) {
    const data = signupSchema.parse(input);
    await this.authLimit("signup", data.email, ip);
    const hash = await hashAccountPassword(data.password);
    try {
      return await transaction(this.pool, async (c) => {
        const user = { id: randomUUID(), email: data.email };
        await c.query(
          "INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3)",
          [user.id, user.email, hash],
        );
        return { user, token: await this.session(c, user.id) };
      });
    } catch (e) {
      if ((e as { code?: string }).code === "23505")
        throw new AppError("ACCOUNT_UNAVAILABLE");
      throw e;
    }
  }
  async signin(input: unknown, ip?: string) {
    const data = credentialsSchema.parse(input);
    await this.authLimit("signin", data.email, ip);
    const { rows } = await this.pool.query<Account & { password_hash: string }>(
      "SELECT id,email,password_hash FROM users WHERE email=$1",
      [data.email],
    );
    const row = rows[0];
    const valid = await verifyAccountPassword(
      data.password,
      row?.password_hash ?? dummyPasswordHash,
    );
    if (!row || !valid) throw new AppError("AUTH_INVALID");
    return transaction(this.pool, async (c) => {
      const current = await c.query(
        "SELECT id FROM users WHERE id=$1 AND password_hash=$2 FOR SHARE",
        [row.id, row.password_hash],
      );
      if (!current.rowCount) throw new AppError("AUTH_INVALID");
      return {
        user: { id: row.id, email: row.email },
        token: await this.session(c, row.id),
      };
    });
  }
  async authenticate(token: string): Promise<Account | null> {
    if (!validToken(token)) return null;
    const { rows } = await this.pool.query<Account>(
      "SELECT u.id,u.email FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()",
      [tokenHash(token)],
    );
    return rows[0] ?? null;
  }
  async logout(token: string) {
    if (validToken(token))
      await this.pool.query("DELETE FROM user_sessions WHERE token_hash=$1", [
        tokenHash(token),
      ]);
  }
  async deleteAccount(userId: string, password: string) {
    await this.limit(`delete:${userId}`, 5);
    const { rows } = await this.pool.query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id=$1",
      [userId],
    );
    if (
      !rows[0] ||
      !(await verifyAccountPassword(password, rows[0].password_hash))
    )
      throw new AppError("AUTH_INVALID");
    await transaction(this.pool, async (c) => {
      const erased = await c.query(
        "DELETE FROM users WHERE id=$1 AND password_hash=$2 RETURNING id",
        [userId, rows[0].password_hash],
      );
      if (!erased.rowCount) throw new AppError("AUTH_INVALID");
      await c.query("DELETE FROM rate_limits WHERE key=ANY($1::text[])", [
        [`delete:${userId}`, `ai:user:${userId}`, `thread:${userId}`],
      ]);
    });
  }
  private async session(c: PoolClient, userId: string) {
    const token = randomBytes(32).toString("hex");
    await c.query("DELETE FROM user_sessions WHERE expires_at<=now()");
    await c.query(
      "DELETE FROM rate_limits WHERE window_started_at<now()-interval '1 day'",
    );
    await c.query(
      "INSERT INTO user_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '12 hours')",
      [tokenHash(token), userId],
    );
    return token;
  }
}
