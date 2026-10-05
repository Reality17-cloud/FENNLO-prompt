import "server-only";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import {
  createThreadSchema,
  updateThreadSchema,
  turnInputSchema,
  threadSchema,
  turnSchema,
  type ThreadDetail,
  type ClientThread,
} from "./workspace-schema";
import { AppError } from "./errors";
import { transaction } from "./db";
import {
  determineTransition,
  snapshotSchema,
  type FormationSnapshot,
} from "./formation";
import type { AIProvider } from "./provider";

type ThreadRow = {
  id: string;
  owner_id: string;
  title: string;
  goal: string;
  status: "ACTIVE" | "ARCHIVED" | "COMPLETED";
  version: number;
  formation: FormationSnapshot | null;
  pending_id: string | null;
  pending_token: string | null;
  pending_until: Date | null;
  created_at: Date;
  updated_at: Date;
};
type TurnRow = {
  id: string;
  sequence: string;
  kind: "REALITY" | "GOAL";
  reality: string;
  goal_at_turn: string;
  status: "PENDING" | "COMPLETE" | "FAILED" | "EVENT";
  result: unknown;
  error_code: string | null;
  created_at: Date;
};
const pending = (t: ThreadRow) =>
  Boolean(
    t.pending_id && t.pending_until && t.pending_until.getTime() > Date.now(),
  );
const publicThread = (t: ThreadRow) =>
  threadSchema.parse({
    id: t.id,
    title: t.title,
    goal: t.goal,
    status: t.status,
    version: t.version,
    createdAt: t.created_at.toISOString(),
    updatedAt: t.updated_at.toISOString(),
    processing: pending(t),
  });
function publicTurn(r: TurnRow, thread: ThreadRow) {
  const stale = r.status === "PENDING" && !pending(thread);
  const failed = r.status === "FAILED" || stale;
  return turnSchema.parse({
    id: r.id,
    sequence: String(r.sequence),
    kind: r.kind,
    reality: r.reality,
    goalAtTurn: r.goal_at_turn,
    status: stale ? "FAILED" : r.status,
    result: r.result,
    error: failed
      ? new AppError(
          stale
            ? "CONFLICT"
            : (r.error_code as ConstructorParameters<typeof AppError>[0]) ||
                "INTERNAL_ERROR",
        ).message
      : null,
    createdAt: r.created_at.toISOString(),
  });
}
export class ThreadService {
  constructor(private readonly pool: Pool) {}
  async list(owner: string) {
    const { rows } = await this.pool.query<
      Pick<ClientThread, "id" | "title" | "status">
    >(
      "SELECT id,title,status FROM client_threads WHERE owner_id=$1 ORDER BY updated_at DESC,id",
      [owner],
    );
    return rows;
  }
  async create(owner: string, input: unknown) {
    const data = createThreadSchema.parse(input);
    return transaction(this.pool, async (c) => {
      await c.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [owner]);
      const count = await c.query<{ count: string }>(
        "SELECT count(*) FROM client_threads WHERE owner_id=$1",
        [owner],
      );
      if (Number(count.rows[0].count) >= 1000)
        throw new AppError("RATE_LIMITED");
      const { rows } = await c.query<ThreadRow>(
        "INSERT INTO client_threads(id,owner_id,title,goal) VALUES($1,$2,$3,$4) RETURNING *",
        [randomUUID(), owner, data.title || "Untitled client", data.goal],
      );
      return publicThread(rows[0]);
    });
  }
  async detail(
    owner: string,
    id: string,
    before?: string,
  ): Promise<ThreadDetail> {
    if (
      !z.uuid().safeParse(id).success ||
      (before &&
        (!/^\d{1,19}$/.test(before) || BigInt(before) > 9223372036854775807n))
    )
      throw new AppError("NOT_FOUND");
    return transaction(this.pool, async (c) => {
      const t = await this.lock(c, owner, id, "SHARE");
      const { rows } = await c.query<TurnRow>(
        "SELECT * FROM thread_turns WHERE thread_id=$1 AND ($2::bigint IS NULL OR sequence<$2) ORDER BY sequence DESC LIMIT 51",
        [id, before ?? null],
      );
      return {
        thread: publicThread(t),
        turns: rows
          .slice(0, 50)
          .reverse()
          .map((r) => publicTurn(r, t)),
        older: rows.length > 50,
      };
    });
  }
  async update(owner: string, id: string, input: unknown) {
    const data = updateThreadSchema.parse(input);
    return transaction(this.pool, async (c) => {
      const t = await this.lock(c, owner, id);
      if (pending(t) || t.version !== data.version)
        throw new AppError("CONFLICT");
      if (data.goal !== undefined && data.goal !== t.goal) {
        const unresolved = await c.query(
          "SELECT 1 FROM thread_turns WHERE thread_id=$1 AND status IN ('FAILED','PENDING') LIMIT 1",
          [id],
        );
        if (unresolved.rowCount) throw new AppError("CONFLICT");
        await c.query(
          "INSERT INTO thread_turns(id,thread_id,kind,reality,goal_at_turn,status) VALUES($1,$2,'GOAL',$3,$4,'EVENT')",
          [randomUUID(), id, data.goal, t.goal],
        );
      }
      await c.query(
        "UPDATE client_threads SET title=$3,goal=$4,status=$5,version=version+1,updated_at=now() WHERE id=$1 AND owner_id=$2",
        [
          id,
          owner,
          data.title ?? t.title,
          data.goal ?? t.goal,
          data.status ?? t.status,
        ],
      );
    });
  }
  async determine(
    owner: string,
    id: string,
    input: unknown,
    provider: AIProvider,
  ) {
    const data = turnInputSchema.parse(input);
    const reserved = await transaction(this.pool, async (c) => {
      const t = await this.lock(c, owner, id);
      if (t.status !== "ACTIVE") throw new AppError("THREAD_CLOSED");
      if (pending(t)) throw new AppError("CONFLICT");
      if (t.pending_id) {
        await c.query(
          "UPDATE thread_turns SET status='FAILED',error_code='CONFLICT' WHERE id=$1 AND thread_id=$2 AND status='PENDING'",
          [t.pending_id, id],
        );
      }
      const old = await c.query<TurnRow>(
        "SELECT * FROM thread_turns WHERE id=$1 AND thread_id=$2",
        [data.id, id],
      );
      if (old.rows[0]) {
        if (
          old.rows[0].reality !== data.reality ||
          old.rows[0].kind !== "REALITY"
        )
          throw new AppError("CONFLICT");
        if (old.rows[0].status === "COMPLETE") return null;
      }
      const unresolved = await c.query<{ id: string }>(
        "SELECT id FROM thread_turns WHERE thread_id=$1 AND status IN ('PENDING','FAILED') AND id<>$2 LIMIT 1",
        [id, data.id],
      );
      if (unresolved.rowCount) throw new AppError("CONFLICT");
      if (!old.rows[0]) {
        await c.query(
          "INSERT INTO thread_turns(id,thread_id,kind,reality,goal_at_turn,status) VALUES($1,$2,'REALITY',$3,$4,'PENDING')",
          [data.id, id, data.reality, t.goal],
        );
      } else {
        await c.query(
          "UPDATE thread_turns SET status='PENDING',error_code=NULL WHERE id=$1",
          [data.id],
        );
      }
      const token = randomUUID();
      await c.query(
        "UPDATE client_threads SET pending_id=$2,pending_token=$3,pending_until=now()+interval '90 seconds',updated_at=now() WHERE id=$1",
        [id, data.id, token],
      );
      return {
        token,
        goal: t.goal,
        snapshot: t.formation ? snapshotSchema.parse(t.formation) : null,
        version: t.version,
      };
    });
    if (!reserved) return this.detail(owner, id);
    try {
      const output = await determineTransition(
        reserved.goal,
        data.reality,
        reserved.snapshot,
        provider,
      );
      await transaction(this.pool, async (c) => {
        const t = await this.lock(c, owner, id);
        if (
          t.pending_id !== data.id ||
          t.pending_token !== reserved.token ||
          !pending(t) ||
          t.version !== reserved.version
        )
          throw new AppError("CONFLICT");
        await c.query(
          "UPDATE thread_turns SET status='COMPLETE',result=$2::jsonb,formation=$3::jsonb,determined_at=now() WHERE id=$1 AND thread_id=$4",
          [
            data.id,
            JSON.stringify(output.result),
            JSON.stringify(output.snapshot),
            id,
          ],
        );
        await c.query(
          "UPDATE client_threads SET formation=$2::jsonb,version=version+1,pending_id=NULL,pending_token=NULL,pending_until=NULL,updated_at=now() WHERE id=$1",
          [id, JSON.stringify(output.snapshot)],
        );
      });
    } catch (error) {
      const safe =
        error instanceof AppError ? error : new AppError("INTERNAL_ERROR");
      await transaction(this.pool, async (c) => {
        // Account erasure may have removed the thread while the provider was running.
        const locked = await c.query<ThreadRow>(
          "SELECT * FROM client_threads WHERE id=$1 AND owner_id=$2 FOR UPDATE",
          [id, owner],
        );
        if (
          locked.rows[0]?.pending_id === data.id &&
          locked.rows[0]?.pending_token === reserved.token
        ) {
          await c.query(
            "UPDATE thread_turns SET status='FAILED',error_code=$2 WHERE id=$1 AND thread_id=$3 AND status='PENDING'",
            [data.id, safe.code, id],
          );
          await c.query(
            "UPDATE client_threads SET pending_id=NULL,pending_token=NULL,pending_until=NULL WHERE id=$1",
            [id],
          );
        }
      });
      throw safe;
    }
    return this.detail(owner, id);
  }
  private async lock(
    c: PoolClient,
    owner: string,
    id: string,
    mode: "UPDATE" | "SHARE" = "UPDATE",
  ) {
    if (!z.uuid().safeParse(id).success) throw new AppError("NOT_FOUND");
    const { rows } = await c.query<ThreadRow>(
      `SELECT * FROM client_threads WHERE id=$1 AND owner_id=$2 FOR ${mode}`,
      [id, owner],
    );
    if (!rows[0]) throw new AppError("NOT_FOUND");
    return rows[0];
  }
}
