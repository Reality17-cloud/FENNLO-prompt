import { quotaForAccount, requireAccount } from "@/lib/auth";
import { database } from "@/lib/db";
import { failure, json, readJson } from "@/lib/http";
import { ThreadService } from "@/lib/threads";
import { createProvider } from "@/lib/provider";
export const runtime = "nodejs";
export const maxDuration = 75;
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const data = await readJson(request);
    const user = await requireAccount();
    const { id } = await context.params;
    const service = new ThreadService(database());
    await service.detail(user.id, id);
    await quotaForAccount(user.id);
    return json(await service.determine(user.id, id, data, createProvider()));
  } catch (e) {
    return failure(e);
  }
}
