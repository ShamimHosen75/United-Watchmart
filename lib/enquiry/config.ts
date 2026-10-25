/** Turnstile settings from the environment (email settings live in lib/email/config.ts). */

// Cloudflare's published test secret: always passes. Used only outside production.
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

export function enquiryConfig() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    turnstileSecret: process.env.TURNSTILE_SECRET_KEY || (isProd ? "" : TURNSTILE_TEST_SECRET),
  };
}
