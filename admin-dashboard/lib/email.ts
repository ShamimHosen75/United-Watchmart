import "server-only";

/**
 * Email through Resend (https://resend.com). Needs RESEND_API_KEY and RESEND_FROM
 * (e.g. "United WatchMart <hello@yourdomain.com>") on the server.
 */
export const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);

export interface OutgoingEmail { to: string; subject: string; text: string }

export async function sendEmails(list: OutgoingEmail[]): Promise<number> {
  if (!emailConfigured) throw new Error("Email is not set up. Add RESEND_API_KEY and RESEND_FROM.");
  let sent = 0;
  for (let i = 0; i < list.length; i += 100) {
    const batch = list.slice(i, i + 100).map((m) => ({ from: process.env.RESEND_FROM, to: [m.to], subject: m.subject, text: m.text }));
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`Email service refused the request (${res.status}). ${sent} sent before the error.`);
    sent += batch.length;
  }
  return sent;
}
