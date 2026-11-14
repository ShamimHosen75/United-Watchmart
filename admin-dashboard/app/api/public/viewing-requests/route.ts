import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demo } from "@/lib/data/demo-store";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { emailConfigured, sendEmails } from "@/lib/email";
import type { StoreSettings } from "@/lib/types";

/**
 * Endpoint for the public website's "Request a viewing" form.
 * POST JSON { name, email, phone?, product_slug?, branch_code?, preferred_at?, message? }.
 * Set ALLOWED_ORIGIN to the website's address so browsers may call it.
 */
const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  phone: z.string().trim().max(40).optional(),
  product_slug: z.string().trim().max(120).optional(),
  branch_code: z.string().trim().max(20).optional(),
  preferred_at: z.iso.datetime({ offset: true }).optional(),
  message: z.string().trim().max(2000).optional(),
  website: z.string().max(0).optional(), // honeypot: must stay empty
});

const cors = () => ({
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN ?? "",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: cors() });
  const d = parsed.data;

  let productId: string | null = null;
  let branchId: string | null = null;
  if (isDemoMode) {
    productId = demo.products.find((p) => p.slug === d.product_slug)?.id ?? null;
    branchId = demo.branches.find((b) => b.code === d.branch_code)?.id ?? null;
    demo.viewings.push({
      id: crypto.randomUUID(), customer_id: null, stock_item_id: null, assigned_to: null, source: "website",
      message: d.message ?? null, staff_notes: null, name: d.name, email: d.email, phone: d.phone ?? null,
      product_id: productId, branch_id: branchId, preferred_at: d.preferred_at ?? null, status: "new", created_at: new Date().toISOString(),
    });
  } else {
    const supabase = await createClient();
    if (d.product_slug) {
      const { data } = await supabase.from("products").select("id").eq("slug", d.product_slug).maybeSingle();
      productId = (data as { id: string } | null)?.id ?? null;
    }
    // Branches are not readable by the public; the boutique assigns one when confirming.
    const { error } = await supabase.from("viewing_requests").insert({
      name: d.name, email: d.email, phone: d.phone ?? null, product_id: productId, preferred_at: d.preferred_at ?? null,
      message: d.message ?? null, source: "website", status: "new",
    });
    if (error) return NextResponse.json({ error: "Could not save the request" }, { status: 500, headers: cors() });
  }
  await notifyStaff(d).catch((e) => console.error("Viewing alert email failed", e));
  return NextResponse.json({ ok: true }, { status: 201, headers: cors() });
}

/** Emails the boutique when Settings → Notifications asks for it. Never blocks the request. */
async function notifyStaff(d: z.infer<typeof schema>) {
  if (!emailConfigured) return;
  let n: StoreSettings["notifications"] | undefined;
  if (isDemoMode) n = demo.settings.notifications;
  else if (hasServiceRole) {
    // The website caller is anonymous, so settings are read with the server-only key.
    const { data } = await createAdminClient().from("store_settings").select("notifications").eq("id", 1).maybeSingle();
    n = (data as { notifications: StoreSettings["notifications"] } | null)?.notifications;
  }
  if (!n?.viewing_email || !n.notify_email) return;
  await sendEmails([{
    to: n.notify_email,
    subject: `New viewing request from ${d.name}`,
    text: [
      `${d.name} asked for a viewing through the website.`,
      `Email: ${d.email}`, d.phone && `Phone: ${d.phone}`, d.product_slug && `Watch: ${d.product_slug}`,
      d.preferred_at && `Preferred time: ${d.preferred_at}`, d.message && `Message: ${d.message}`,
      "", "Open Viewings in the admin to confirm it.",
    ].filter((x): x is string => typeof x === "string").join("\n"),
  }]);
}
