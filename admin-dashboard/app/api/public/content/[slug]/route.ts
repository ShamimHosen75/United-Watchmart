import { NextResponse, type NextRequest } from "next/server";
import { getPublishedContent } from "@/lib/data/content";
import { PAGES, resolvePage } from "@/lib/cms/schema";

/**
 * Published website content, for the public site.
 * GET /api/public/content/home?locale=en   -> one language, Arabic falls back to English per field
 * GET /api/public/content/home?locale=all  -> both languages as stored
 */
const headers = () => ({
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN ?? "",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
});

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: headers() });
}

export async function GET(request: NextRequest, ctx: RouteContext<"/api/public/content/[slug]">) {
  const { slug } = await ctx.params;
  if (!PAGES.some((p) => p.slug === slug)) return NextResponse.json({ error: "Unknown page" }, { status: 404, headers: headers() });
  const locale = request.nextUrl.searchParams.get("locale") ?? "en";
  if (!["en", "ar", "all"].includes(locale)) return NextResponse.json({ error: "locale must be en, ar or all" }, { status: 400, headers: headers() });
  const page = await getPublishedContent(slug);
  if (!page) return NextResponse.json({ error: "Not published yet" }, { status: 404, headers: headers() });
  const body = locale === "all"
    ? { slug, locale, published_at: page.published_at, ...page.content }
    : { slug, locale, published_at: page.published_at, ...resolvePage(page.content, locale as "en" | "ar") };
  return NextResponse.json(body, { headers: headers() });
}
