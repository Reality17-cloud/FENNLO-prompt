import { NextResponse } from "next/server";
import { nextMoveInputSchema, publicResult } from "@/lib/formation";
import { determineNextMove } from "@/lib/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = nextMoveInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add the client conversation and your goal." },
      { status: 400 },
    );
  }

  try {
    const result = await determineNextMove(parsed.data);
    return NextResponse.json(publicResult(result), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("next-move failure", error instanceof Error ? error.message : "unknown");
    return NextResponse.json(
      { error: "Fennlo couldn't determine the next move. Try again." },
      { status: 502 },
    );
  }
}
