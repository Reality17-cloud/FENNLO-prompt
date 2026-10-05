import {
  authService,
  clearSession,
  establishSession,
  requireAccount,
} from "@/lib/auth";
import { clientIp, failure, json, readJson } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { z } from "zod";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await context.params;
    const data = await readJson(request);
    if (action === "signup" || action === "signin") {
      const result =
        action === "signup"
          ? await authService().signup(data, clientIp(request))
          : await authService().signin(data, clientIp(request));
      await establishSession(result.token);
      return json(
        { email: result.user.email },
        action === "signup" ? 201 : 200,
      );
    }
    if (action === "signout") {
      await clearSession();
      return json({ ok: true });
    }
    if (action === "delete") {
      const account = await requireAccount();
      const parsed = z
        .object({
          password: z.string().min(1).max(128),
          confirmation: z.literal("DELETE"),
        })
        .strict()
        .safeParse(data);
      if (!parsed.success) throw new AppError("DELETE_CONFIRMATION");
      await authService().deleteAccount(account.id, parsed.data.password);
      await clearSession();
      return json({ ok: true });
    }
    throw new AppError("NOT_FOUND");
  } catch (error) {
    return failure(error);
  }
}
