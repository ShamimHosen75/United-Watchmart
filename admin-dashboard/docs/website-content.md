# Using admin content on the website

The admin's **Website → Pages** screen stores page text and images. The public website reads the
published version through this API (no key needed; only published content is returned):

```
GET https://ADMIN-HOST/api/public/content/home?locale=en
GET https://ADMIN-HOST/api/public/content/home?locale=ar     # Arabic, falls back to English per field
GET https://ADMIN-HOST/api/public/content                    # list of pages and publish times
```

Pages: `home`, `anatomy`, `collection`, `pricing`, `about`, `legal`, `global` (announcement bar and footer).

Response shape:

```json
{
  "slug": "home",
  "locale": "en",
  "published_at": "2026-11-05T09:00:00Z",
  "seo": { "title": "…", "description": "…", "image": "https://…" },
  "sections": [
    { "id": "hero-1", "type": "hero", "eyebrow": "Heritage 42", "title": "Time, taken apart.", "intro": "…",
      "cta_label": "Explore the collection", "cta_link": "/collection", "image": "https://…", "image_alt": "…" },
    { "id": "disassembly-2", "type": "disassembly", "heading": "…", "steps": [{ "part": "Sapphire crystal", "caption": "…" }] }
  ]
}
```

Hidden sections are left out. Section types and their fields are defined in `lib/cms/schema.ts`
(`SECTION_TYPES`). Render each section by `type` and skip types you don't know.

## In the Next.js website

```ts
// lib/content.ts
const ADMIN = process.env.ADMIN_URL!; // e.g. https://admin.unitedwatchmart.com

export async function getPage(slug: string, locale: "en" | "ar") {
  const res = await fetch(`${ADMIN}/api/public/content/${slug}?locale=${locale}`, {
    next: { tags: [`page:${slug}`], revalidate: 3600 },
  });
  if (!res.ok) return null; // fall back to the copy in messages/*.json
  return res.json();
}
```

```tsx
// app/[locale]/page.tsx
const page = await getPage("home", locale);
const hero = page?.sections.find((s) => s.type === "hero");
```

```ts
// app/[locale]/page.tsx (metadata)
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const page = await getPage("home", locale);
  return { title: page?.seo.title, description: page?.seo.description, openGraph: { images: page?.seo.image ? [page.seo.image] : [] } };
}
```

Add the Supabase storage host to `images.remotePatterns` in `next.config` so `next/image` can load uploads:

```ts
images: { remotePatterns: [{ protocol: "https", hostname: "YOUR-PROJECT.supabase.co", pathname: "/storage/v1/object/public/site-media/**" }] }
```

## Instant updates on publish

When someone presses **Publish**, the admin POSTs to `SITE_REVALIDATE_URL` with
`Authorization: Bearer SITE_REVALIDATE_SECRET` and `{ "slug": "home", "path": "/" }`.
Add this route to the website:

```ts
// app/api/revalidate/route.ts
import { revalidateTag } from "next/cache";

export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.REVALIDATE_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { slug } = await req.json();
  revalidateTag(`page:${slug}`);
  if (slug === "global") revalidateTag("page:global");
  return Response.json({ ok: true });
}
```

Set on the admin: `SITE_REVALIDATE_URL=https://unitedwatchmart.com/api/revalidate` and `SITE_REVALIDATE_SECRET=<long random string>`.
Set on the website: `REVALIDATE_SECRET` to the same string. Without this, pages refresh within the `revalidate` window (one hour above).
