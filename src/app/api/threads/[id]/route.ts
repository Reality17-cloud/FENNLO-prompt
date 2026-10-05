import { requireAccount } from "@/lib/auth";
import { database } from "@/lib/db";
import { failure, json, readJson } from "@/lib/http";
import { ThreadService } from "@/lib/threads";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const user = await requireAccount();
    const { id } = await context.params;
    return json(
      await new ThreadService(database()).detail(
        user.id,
        id,
        new URL(request.url).searchParams.get("before") ?? undefined,
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const data = await readJson(request);
    const user = await requireAccount();
    const { id } = await context.params;
    const service = new ThreadService(database());
    await service.update(user.id, id, data);
    return json(await service.detail(user.id, id));
  } catch (e) {
    return failure(e);
  }
}
