import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthService } from "./auth-service";
import { database } from "./db";
import { appConfig } from "./app-config";
import { AppError } from "./errors";
export const COOKIE = "fennlo_session";
export const authService = () => new AuthService(database());
export async function currentAccount() {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? authService().authenticate(token) : null;
}
export async function requireAccount() {
  const user = await currentAccount();
  if (!user) throw new AppError("AUTH_REQUIRED");
  return user;
}
export async function pageAccount() {
  const user = await currentAccount();
  if (!user) redirect("/signin");
  return user;
}
export async function establishSession(token: string) {
  const jar = await cookies();
  const old = jar.get(COOKIE)?.value;
  if (old) await authService().logout(old);
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: appConfig().secure,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 3600,
  });
}
export async function clearSession() {
  const jar = await cookies();
  const old = jar.get(COOKIE)?.value;
  if (old) await authService().logout(old);
  jar.set(COOKIE, "", {
    httpOnly: true,
    secure: appConfig().secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
export async function quotaForAccount(id: string) {
  await authService().limit(`ai:user:${id}`, 30);
  await authService().limit("ai:global", 500);
}
