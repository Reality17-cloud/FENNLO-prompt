import "server-only";
import { AppError } from "./errors";

export function appConfig(
  env: Record<string, string | undefined> = process.env,
) {
  try {
    const url = new URL(env.APP_URL ?? "");
    const database = new URL(env.DATABASE_URL ?? "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.origin !== (env.APP_URL ?? "").replace(/\/$/, "") ||
      (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    )
      throw new Error();
    if (
      process.env.NODE_ENV === "production" &&
      url.protocol !== "https:" &&
      !local
    )
      throw new Error();
    if (
      !["postgres:", "postgresql:"].includes(database.protocol) ||
      !database.hostname ||
      !database.pathname.slice(1)
    )
      throw new Error();
    const trustedHeader = env.TRUSTED_CLIENT_IP_HEADER?.toLowerCase() || null;
    if (trustedHeader && !/^[a-z0-9-]+$/.test(trustedHeader)) throw new Error();
    return {
      origin: url.origin,
      secure: url.protocol === "https:",
      databaseUrl: env.DATABASE_URL!,
      trustedHeader,
    };
  } catch {
    throw new AppError("APP_NOT_CONFIGURED");
  }
}
