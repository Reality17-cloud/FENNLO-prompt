import { NextResponse } from "next/server";
import { nextMoveInputSchema } from "@/lib/schemas";
import { determineNextMove } from "@/lib/formation";
import { createProvider } from "@/lib/provider";
import { AppError } from "@/lib/errors";
import { readBoundedText } from "@/lib/bounded-body";
import { requireAccount, quotaForAccount } from "@/lib/auth";
import { checkOrigin } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 75;
const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const MAX_BODY_BYTES = 160_000;

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (
      request.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      throw new AppError("UNSUPPORTED_MEDIA");
    const length = request.headers.get("content-length");
    if (length && (!/^\d+$/u.test(length) || Number(length) > MAX_BODY_BYTES))
      throw new AppError("BODY_TOO_LARGE");
    let body: unknown;
    const signal = AbortSignal.timeout(10_000);
    try {
      const text = await readBoundedText(
        request.body,
        MAX_BODY_BYTES,
        signal,
        new AppError("BODY_TOO_LARGE"),
      );
      body = JSON.parse(text);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(signal.aborted ? "BODY_TIMEOUT" : "INVALID_BODY");
    }
    const parsed = nextMoveInputSchema.safeParse(body);
    if (!parsed.success) throw new AppError("INVALID_INPUT");
    const account = await requireAccount();
    await quotaForAccount(account.id);
    const result = await determineNextMove(parsed.data, createProvider());
    return NextResponse.json(result, { headers });
  } catch (error) {
    const safe =
      error instanceof AppError ? error : new AppError("INTERNAL_ERROR");
    if (safe.status >= 500)
      console.error(
        JSON.stringify({
          event: "next_move_failed",
          code: safe.code,
          status: safe.status,
        }),
      );
    return NextResponse.json(
      { error: safe.message },
      { status: safe.status, headers },
    );
  }
}
