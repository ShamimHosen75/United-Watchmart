import { desc, eq } from "drizzle-orm";
import { sampleReviews, type Review } from "@/data/reviews";
import type { Locale } from "@/i18n/routing";

/**
 * Where reviews come from:
 * - DATABASE_URL set (Supabase): approved rows in the `reviews` table. If the table has none yet,
 *   the sample reviews are shown so the sections are never empty.
 * - Not set: the sample reviews in data/reviews.ts.
 */
async function loadAll(): Promise<readonly Review[]> {
  if (!process.env.DATABASE_URL) return sampleReviews;
  try {
    const { getDb, schema } = await import("@/lib/db");
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.reviews)
      .where(eq(schema.reviews.status, "approved"))
      .orderBy(desc(schema.reviews.createdAt));
    if (rows.length === 0) return sampleReviews;
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      rating: Math.min(5, Math.max(1, r.rating)) as Review["rating"],
      title: r.title ?? undefined,
      body: r.body,
      authorName: r.authorName,
      authorCity: r.authorCity ?? undefined,
      verified: r.verified,
      featured: r.featured,
      date: r.createdAt.toISOString().slice(0, 10),
    }));
  } catch (err) {
    console.error("[reviews] falling back to sample reviews:", err);
    return sampleReviews;
  }
}

const newestFirst = (a: Review, b: Review) => b.date.localeCompare(a.date);

export type ReviewSummary = {
  count: number;
  /** Average rating, one decimal place. 0 when there are no reviews. */
  average: number;
  /** Number of reviews per star, index 0 = 5 stars … index 4 = 1 star. */
  breakdown: [number, number, number, number, number];
};

export function summarize(list: readonly Review[]): ReviewSummary {
  const breakdown: ReviewSummary["breakdown"] = [0, 0, 0, 0, 0];
  let total = 0;
  for (const r of list) {
    breakdown[5 - r.rating]! += 1;
    total += r.rating;
  }
  const count = list.length;
  return { count, average: count ? Math.round((total / count) * 10) / 10 : 0, breakdown };
}

/** Featured reviews for the home page, plus a summary across every review. */
export async function getFeaturedReviews(locale: Locale, limit = 6) {
  const all = await loadAll();
  const featured = all.filter((r) => r.featured).sort(newestFirst);
  const list = (featured.length ? featured : [...all].sort(newestFirst)).slice(0, limit);
  return { reviews: list, summary: summarize(all) };
}

/** Every review for one watch, newest first, plus its summary. */
export async function getWatchReviews(slug: string, locale: Locale) {
  const list = (await loadAll()).filter((r) => r.slug === slug).sort(newestFirst);
  return { reviews: list, summary: summarize(list) };
}
