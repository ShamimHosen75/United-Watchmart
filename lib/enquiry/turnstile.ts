import { enquiryConfig } from "./config";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Verifies a Turnstile token with Cloudflare. Returns false on any failure. */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  const { turnstileSecret } = enquiryConfig();
  if (!turnstileSecret || !token) return false;

  const body = new URLSearchParams({ secret: turnstileSecret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
