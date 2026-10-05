// Adapted solely from donor generic security infrastructure.
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const parameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const prefix = "scrypt$v1$32768$8$3";
export const dummyPasswordHash = `${prefix}$${"0".repeat(32)}$${"0".repeat(128)}`;
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, parameters, (e, key) =>
      e ? reject(e) : resolve(key),
    ),
  );
}
export async function hashAccountPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${prefix}$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyAccountPassword(password: string, hash: string) {
  if (Buffer.byteLength(password) > 1024) return false;
  const m = /^scrypt\$v1\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(
    hash,
  );
  return m
    ? timingSafeEqual(await derive(password, m[1]), Buffer.from(m[2], "hex"))
    : false;
}
export function fingerprint(value: unknown) {
  return tokenHash(JSON.stringify(value));
}
