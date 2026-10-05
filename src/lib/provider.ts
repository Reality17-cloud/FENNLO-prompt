import "server-only";
import { z } from "zod";
import { readAIConfig, type AIConfig } from "./config";
import { AppError } from "./errors";
import { readBoundedText } from "./bounded-body";

export interface ModelRequest {
  system: string;
  data: unknown;
  schema: Record<string, unknown>;
}
export interface AIProvider {
  generate(request: ModelRequest): Promise<unknown>;
}

const envelopeSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.literal("stop"),
        message: z.object({
          content: z.string().trim().min(1).max(24_000),
          refusal: z.string().nullable().optional(),
          tool_calls: z.array(z.unknown()).max(0).optional(),
        }),
      }),
    )
    .length(1),
});

export class CompatibleProvider implements AIProvider {
  constructor(
    private readonly config: AIConfig,
    private readonly request: typeof fetch = fetch,
  ) {}
  async generate(modelRequest: ModelRequest): Promise<unknown> {
    const c = this.config;
    const body = JSON.stringify({
      model: c.AI_MODEL,
      messages: [
        {
          role: "system",
          content: `${modelRequest.system}\nRequired JSON schema: ${JSON.stringify(modelRequest.schema)}`,
        },
        { role: "user", content: JSON.stringify(modelRequest.data) },
      ],
      max_tokens: c.AI_MAX_OUTPUT_TOKENS,
      temperature: 0,
      ...(c.AI_OUTPUT_MODE === "json_schema"
        ? {
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "fennlo_next_move",
                strict: true,
                schema: modelRequest.schema,
              },
            },
          }
        : c.AI_OUTPUT_MODE === "json_object"
          ? { response_format: { type: "json_object" } }
          : {}),
      ...(c.AI_ENABLE_THINKING !== undefined
        ? { enable_thinking: c.AI_ENABLE_THINKING }
        : {}),
    });
    if (Buffer.byteLength(body) > 180_000) throw new AppError("INVALID_INPUT");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new AppError("AI_TIMEOUT"));
      }, c.AI_TIMEOUT_MS);
    });
    const call = async () => {
      const response = await this.request(
        `${c.AI_BASE_URL.replace(/\/+$/u, "")}/chat/completions`,
        {
          method: "POST",
          redirect: "error",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${c.AI_API_KEY}`,
          },
          body,
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        void response.body?.cancel().catch(() => undefined);
        throw new AppError("AI_UNAVAILABLE");
      }
      const text = await readBoundedText(
        response.body,
        65_536,
        controller.signal,
        new AppError("AI_RESPONSE_LIMIT"),
      );
      try {
        const envelope = envelopeSchema.parse(JSON.parse(text));
        const choice = envelope.choices[0];
        if (choice.message.refusal) throw new AppError("AI_INVALID_RESPONSE");
        return JSON.parse(choice.message.content) as unknown;
      } catch {
        throw new AppError("AI_INVALID_RESPONSE");
      }
    };
    try {
      return await Promise.race([call(), deadline]);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        controller.signal.aborted ? "AI_TIMEOUT" : "AI_UNAVAILABLE",
      );
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
}

// No other provider, paid fallback, retry, or production mock exists.
export function createProvider(): AIProvider {
  return new CompatibleProvider(readAIConfig());
}
