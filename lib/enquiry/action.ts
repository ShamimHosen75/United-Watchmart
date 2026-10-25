"use server";

import { headers } from "next/headers";
import { sendEnquiryEmails } from "./email";
import { takeToken } from "./rate-limit";
import { enquiryRequestSchema, type EnquiryField, type EnquiryResult } from "./schema";
import { verifyTurnstile } from "./turnstile";

/** Handles a "Request a viewing" submission. Never throws; always returns a typed result. */
export async function submitEnquiry(input: unknown): Promise<EnquiryResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";

  if (!takeToken(ip)) return { ok: false, error: "rate" };

  const parsed = enquiryRequestSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Partial<Record<EnquiryField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "token") return { ok: false, error: "captcha" };
      if (typeof key === "string" && !(key in fields)) fields[key as EnquiryField] = issue.message;
    }
    return { ok: false, error: "invalid", fields };
  }

  const { token, locale, website, ...data } = parsed.data;
  if (website) return { ok: true }; // honeypot filled: pretend success, send nothing

  if (!(await verifyTurnstile(token, ip))) return { ok: false, error: "captcha" };

  try {
    await sendEnquiryEmails(data, locale);
    return { ok: true };
  } catch (err) {
    console.error("[enquiry] send failed", err);
    return { ok: false, error: "server" };
  }
}
