import { z } from "zod";

export const INPUT_LIMITS = { conversation: 20_000, goal: 4_000 } as const;
const text = (max: number) => z.string().trim().min(1).max(max);

export const nextMoveInputSchema = z
  .object({
    conversation: text(INPUT_LIMITS.conversation),
    goal: text(INPUT_LIMITS.goal),
  })
  .strict();

// null means deliberately do not send anything; never a copyable placeholder.
export const publicNextMoveSchema = z
  .object({
    next_move: text(600),
    send: text(3_000).nullable(),
    why: text(600),
  })
  .strict();

export const internalNextMoveSchema = publicNextMoveSchema
  .extend({
    current_state: text(1_200),
    formed: z.array(text(500)).max(8),
    missing: z.array(text(500)).max(8),
    constraint: text(800),
    next_formation: text(800),
  })
  .strict();

export type NextMoveInput = z.infer<typeof nextMoveInputSchema>;
export type InternalNextMove = z.infer<typeof internalNextMoveSchema>;
export type PublicNextMove = z.infer<typeof publicNextMoveSchema>;
