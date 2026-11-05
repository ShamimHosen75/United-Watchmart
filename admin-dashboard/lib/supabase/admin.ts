import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Service-role client, used only to send staff invite emails.
 * Needs SUPABASE_SERVICE_ROLE_KEY on the server (never NEXT_PUBLIC_).
 */
export const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && SUPABASE_URL);

export function createAdminClient() {
  if (!hasServiceRole) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}
