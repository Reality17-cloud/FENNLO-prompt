import { authService, requireAccount } from "@/lib/auth";
import { database } from "@/lib/db";
import { failure, json, readJson } from "@/lib/http";
import { ThreadService } from "@/lib/threads";
export const runtime = "nodejs";
export async function GET() {
  try {
    const user = await requireAccount();
    return json({ threads: await new ThreadService(database()).list(user.id) });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const data = await readJson(request);
    const user = await requireAccount();
    await authService().limit(`thread:${user.id}`, 60);
    return json(
      { thread: await new ThreadService(database()).create(user.id, data) },
      201,
    );
  } catch (e) {
    return failure(e);
  }
}
