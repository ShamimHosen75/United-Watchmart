/** Email settings from the environment (see .env.example). */
export function emailConfig() {
  return {
    resendKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.ENQUIRY_FROM_EMAIL ?? "",
    boutique: process.env.BOUTIQUE_EMAIL ?? "",
    /** Log emails instead of sending them (local testing without Resend). */
    dryRun: process.env.ENQUIRY_DRY_RUN === "true",
  };
}
