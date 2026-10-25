/** Server-side enquiry settings from the environment (see .env.example). */

// Cloudflare's published test secret: always passes. Used only outside production.
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

export function enquiryConfig() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY || (isProd ? "" : TURNSTILE_TEST_SECRET),
    resendKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.ENQUIRY_FROM_EMAIL ?? "",
    boutique: process.env.BOUTIQUE_EMAIL ?? "",
    /** Log emails instead of sending them (local testing without Resend). */
    dryRun: process.env.ENQUIRY_DRY_RUN === "true",
  };
}
