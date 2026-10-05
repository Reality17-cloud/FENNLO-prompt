import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "./errors";
import { appConfig } from "./app-config";
import { readBoundedText } from "./bounded-body";
export const privateHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== appConfig().origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AppError("CROSS_ORIGIN");
}
export async function readJson(request: Request): Promise<unknown> {
  checkOrigin(request);
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new AppError("UNSUPPORTED_MEDIA");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > 160_000))
    throw new AppError("BODY_TOO_LARGE");
  const signal = AbortSignal.timeout(10_000);
  try {
    return JSON.parse(
      await readBoundedText(
        request.body,
        160_000,
        signal,
        new AppError("BODY_TOO_LARGE"),
      ),
    );
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(signal.aborted ? "BODY_TIMEOUT" : "INVALID_BODY");
  }
}
export function clientIp(request: Request) {
  const header = appConfig().trustedHeader;
  return header ? request.headers.get(header)?.slice(0, 200) : undefined;
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: privateHeaders });
}
export function failure(error: unknown) {
  const safe =
    error instanceof AppError
      ? error
      : new AppError(
          error instanceof z.ZodError ? "INVALID_ACTION" : "INTERNAL_ERROR",
        );
  if (safe.status >= 500)
    console.error(
      JSON.stringify({
        event: "request_failed",
        code: safe.code,
        status: safe.status,
      }),
    );
  return json({ error: safe.message, code: safe.code }, safe.status);
}
