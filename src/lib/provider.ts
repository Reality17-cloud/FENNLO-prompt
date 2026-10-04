import { z } from "zod";
import {
  FENNLO_SYSTEM,
  internalNextMoveSchema,
  nextMoveJsonSchema,
  type InternalNextMove,
  type NextMoveInput,
} from "./formation";

const responseEnvelopeSchema = z
  .object({
    status: z.string(),
    output: z.array(
      z
        .object({
          type: z.string(),
          content: z
            .array(
              z
                .object({
                  type: z.string(),
                  text: z.string().optional(),
                })
                .passthrough(),
            )
            .optional(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

function requiredEnv(name: "OPENAI_API_KEY" | "OPENAI_MODEL") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export async function determineNextMove(
  input: NextMoveInput,
): Promise<InternalNextMove> {
  const apiKey = requiredEnv("OPENAI_API_KEY");
  const model = requiredEnv("OPENAI_MODEL");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      store: false,
      instructions: FENNLO_SYSTEM,
      input: JSON.stringify({
        client_conversation: input.conversation,
        user_goal: input.goal,
      }),
      text: { format: nextMoveJsonSchema },
      max_output_tokens: 2600,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status}.`);
  }

  const envelope = responseEnvelopeSchema.parse(await response.json());
  if (envelope.status !== "completed") {
    throw new Error("AI provider returned an incomplete response.");
  }

  const content = envelope.output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? []);

  if (content.some((part) => part.type === "refusal")) {
    throw new Error("AI provider declined the request.");
  }

  const text = content
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) throw new Error("AI provider returned no structured output.");

  return internalNextMoveSchema.parse(JSON.parse(text));
}
