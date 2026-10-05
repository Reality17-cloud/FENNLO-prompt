import { z } from "zod";
import { publicNextMoveSchema } from "./schemas";
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));
export const credentialsSchema = z
  .object({ email: emailSchema, password: z.string().min(1).max(128) })
  .strict();
export const signupSchema = credentialsSchema.extend({
  password: z.string().min(15).max(128),
});
export const createThreadSchema = z
  .object({
    title: z.string().trim().max(120).optional(),
    goal: z.string().trim().min(1).max(4000),
  })
  .strict();
export const updateThreadSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    goal: z.string().trim().min(1).max(4000).optional(),
    status: z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]).optional(),
    version: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (v) =>
      v.title !== undefined || v.goal !== undefined || v.status !== undefined,
  );
export const turnInputSchema = z
  .object({ id: z.uuid(), reality: z.string().trim().min(1).max(20000) })
  .strict();
export const threadSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    goal: z.string(),
    status: z.enum(["ACTIVE", "ARCHIVED", "COMPLETED"]),
    version: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
    processing: z.boolean(),
  })
  .strict();
export const turnSchema = z
  .object({
    id: z.uuid(),
    sequence: z.string(),
    kind: z.enum(["REALITY", "GOAL"]),
    reality: z.string(),
    goalAtTurn: z.string(),
    status: z.enum(["PENDING", "COMPLETE", "FAILED", "EVENT"]),
    result: publicNextMoveSchema.nullable(),
    error: z.string().nullable(),
    createdAt: z.string(),
  })
  .strict();
export const detailSchema = z
  .object({
    thread: threadSchema,
    turns: z.array(turnSchema),
    older: z.boolean(),
  })
  .strict();
export type ClientThread = z.infer<typeof threadSchema>;
export type ThreadTurn = z.infer<typeof turnSchema>;
export type ThreadDetail = z.infer<typeof detailSchema>;
export function parseDetail(value: unknown): ThreadDetail {
  const parsed = detailSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "Fennlo returned an invalid thread. Refresh to check the saved result.",
    );
  return parsed.data;
}
