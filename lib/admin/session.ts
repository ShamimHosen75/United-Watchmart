import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Admin session: a signed, httpOnly cookie scoped to /admin, valid for 12 hours.
 * Changing ADMIN_PASSWORD_HASH signs everyone out (the signature includes it).
 */

const COOKIE = "uwm_admin";
const MAX_AGE_S = 12 * 60 * 60;

function key() {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  const hash = process.env.ADMIN_PASSWORD_HASH ?? "";
  if (secret.length < 32 || !hash) throw new Error("ADMIN_SESSION_SECRET (32+ chars) and ADMIN_PASSWORD_HASH must be set");
  return `${secret}:${hash}`;
}

const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");

export function adminConfigured() {
  return (process.env.ADMIN_SESSION_SECRET ?? "").length >= 32 && Boolean(process.env.ADMIN_PASSWORD_HASH);
}

export async function createSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + MAX_AGE_S * 1000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: MAX_AGE_S,
  });
}

export async function destroySession() {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp: number };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

/** For admin pages and server actions: sends anyone without a valid session to the login page. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
