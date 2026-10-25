import { getDb } from "@/lib/db";
import { getAvailability } from "@/lib/shop/orders";

export const dynamic = "force-dynamic";

/** Live availability per watch, so product pages can stay static. */
export async function GET() {
  try {
    const availability = await getAvailability(await getDb());
    const body = Object.fromEntries(Object.entries(availability).map(([slug, a]) => [slug, a.available]));
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[stock] failed", err);
    return Response.json({}, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
