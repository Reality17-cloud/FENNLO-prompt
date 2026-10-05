import "server-only";
import { z } from "zod";
import { AppError } from "./errors";

const optionalBoolean = z
  .enum(["true", "false"])
  .transform((v) => v === "true")
  .optional();
const schema = z.object({
  AI_API_KEY: z
    .string()
    .trim()
    .min(1)
    .max(4096)
    .regex(/^[^\s]+$/u),
  AI_BASE_URL: z.url().max(2048),
  AI_MODEL: z.string().trim().min(1).max(200),
  AI_OUTPUT_MODE: z
    .enum(["json_schema", "json_object", "json_only"])
    .default("json_object"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(30_000),
  AI_MAX_OUTPUT_TOKENS: z.coerce
    .number()
    .int()
    .min(512)
    .max(4096)
    .default(2400),
  AI_ENABLE_THINKING: optionalBoolean,
  AI_FREE_QUOTA_ONLY_CONFIRMED: optionalBoolean,
});

export type AIConfig = z.infer<typeof schema>;

export function readAIConfig(
  env: Record<string, string | undefined> = process.env,
): AIConfig {
  const values = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [
      key,
      value?.trim() || undefined,
    ]),
  );
  const parsed = schema.safeParse(values);
  if (!parsed.success) throw new AppError("AI_NOT_CONFIGURED");
  const config = parsed.data;
  const url = new URL(config.AI_BASE_URL);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new AppError("AI_NOT_CONFIGURED");
  const alibaba =
    url.hostname.endsWith(".aliyuncs.com") ||
    url.hostname.endsWith(".alibabacloud.com");
  if (alibaba && config.AI_FREE_QUOTA_ONLY_CONFIRMED !== true)
    throw new AppError("AI_NOT_CONFIGURED");
  return config;
}
