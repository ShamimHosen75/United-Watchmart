import { NextResponse } from "next/server";
import { getPublishedContent } from "@/lib/data/content";
import { PAGES } from "@/lib/cms/schema";

/** Lists the website pages and when each was last published. */
export async function GET() {
  const pages = await Promise.all(PAGES.map(async (p) => ({ slug: p.slug, path: p.path, published_at: (await getPublishedContent(p.slug))?.published_at ?? null })));
  return NextResponse.json({ pages }, {
    headers: { "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN ?? "", "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" },
  });
}
