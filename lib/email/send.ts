import { Resend } from "resend";
import { emailConfig } from "./config";

export type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string };

/** Sends emails through Resend, or logs them when ENQUIRY_DRY_RUN=true. Throws on failure. */
export async function sendMail(mails: Mail[], tag: string) {
  const cfg = emailConfig();
  if (cfg.dryRun) {
    console.info(`[${tag}:dry-run]`, JSON.stringify(mails.map(({ to, subject, text }) => ({ to, subject, text }))));
    return;
  }
  if (!cfg.resendKey || !cfg.from) throw new Error("Email is not configured (RESEND_API_KEY, ENQUIRY_FROM_EMAIL)");

  const resend = new Resend(cfg.resendKey);
  const results = await Promise.all(mails.map((m) => resend.emails.send({ from: cfg.from, ...m })));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`Resend: ${failed.error.message}`);
}
