import "server-only";
import { isDemoMode } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demo } from "./demo-store";
import { getCurrentUser, listStaff } from "./index";
import { PAGES, starterContent, type PageContent } from "@/lib/cms/schema";
import type { SiteMedia } from "@/lib/types";

export const MEDIA_BUCKET = "site-media";
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

interface PageRow {
  slug: string;
  title: string;
  draft: PageContent | null;
  published: PageContent | null;
  published_at: string | null;
  draft_updated_at: string | null;
}

const isEmpty = (c: PageContent | null | undefined) => !c || !Array.isArray(c.sections) || (c.sections.length === 0 && !c.seo?.title);

async function rows(): Promise<PageRow[]> {
  if (isDemoMode) return demo.sitePages;
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_pages").select("slug,title,draft,published,published_at,draft_updated_at");
  if (error) throw error;
  return data as PageRow[];
}

export interface SitePageSummary {
  slug: string;
  title: string;
  path: string;
  description: string;
  status: "draft" | "published" | "changed";
  published_at: string | null;
  draft_updated_at: string | null;
  sections: number;
}

export async function listSitePages(): Promise<SitePageSummary[]> {
  const list = await rows();
  return PAGES.map((p) => {
    const r = list.find((x) => x.slug === p.slug);
    const draft = r && !isEmpty(r.draft) ? r.draft! : starterContent(p.slug);
    const changed = r?.published ? JSON.stringify(r.published) !== JSON.stringify(draft) : true;
    return {
      ...p, status: !r?.published ? "draft" : changed ? "changed" : "published",
      published_at: r?.published_at ?? null, draft_updated_at: r?.draft_updated_at ?? null,
      sections: draft.sections.filter((s) => !s.hidden).length,
    };
  });
}

export interface SitePage {
  slug: string;
  title: string;
  path: string;
  draft: PageContent;
  published: PageContent | null;
  published_at: string | null;
  draft_updated_at: string | null;
  changed: boolean;
}

export async function getSitePage(slug: string): Promise<SitePage | null> {
  const meta = PAGES.find((p) => p.slug === slug);
  if (!meta) return null;
  const r = (await rows()).find((x) => x.slug === slug);
  const draft = r && !isEmpty(r.draft) ? r.draft! : starterContent(slug);
  return {
    slug, title: meta.title, path: meta.path, draft, published: r?.published ?? null,
    published_at: r?.published_at ?? null, draft_updated_at: r?.draft_updated_at ?? null,
    changed: !r?.published || JSON.stringify(r.published) !== JSON.stringify(draft),
  };
}

export async function saveDraft(slug: string, content: PageContent): Promise<void> {
  const now = new Date().toISOString();
  if (isDemoMode) {
    const r = demo.sitePages.find((x) => x.slug === slug);
    if (!r) throw new Error("Page not found.");
    r.draft = structuredClone(content);
    r.draft_updated_at = now;
    return;
  }
  const supabase = await createClient();
  const me = await getCurrentUser();
  const { error } = await supabase.from("site_pages").update({ draft: content, draft_updated_at: now, draft_updated_by: me?.id ?? null }).eq("slug", slug);
  if (error) throw new Error(error.message);
}

export async function publishPage(slug: string): Promise<void> {
  if (isDemoMode) {
    const r = demo.sitePages.find((x) => x.slug === slug);
    if (!r) throw new Error("Page not found.");
    const content = r.draft ?? starterContent(slug);
    r.draft = structuredClone(content);
    r.published = structuredClone(content);
    r.published_at = new Date().toISOString();
    const me = await getCurrentUser();
    demo.siteVersions.unshift({ id: demo.siteVersions.length + 1, slug, content: structuredClone(content), published_at: r.published_at, published_by: me?.id ?? null });
    return;
  }
  const supabase = await createClient();
  // A page that was never edited still holds an empty draft: store the starter content first.
  const page = await getSitePage(slug);
  if (page) await saveDraft(slug, page.draft);
  const { error } = await supabase.rpc("publish_site_page", { p_slug: slug });
  if (error) throw new Error(error.message);
}

/** Throws away unpublished edits. */
export async function discardDraft(slug: string): Promise<void> {
  const page = await getSitePage(slug);
  if (!page?.published) throw new Error("This page has never been published.");
  await saveDraft(slug, page.published);
}

export interface PageVersion { id: number; published_at: string; by: string | null }

export async function listVersions(slug: string): Promise<PageVersion[]> {
  const staff = await listStaff();
  const name = (id: string | null) => staff.find((s) => s.id === id)?.full_name ?? null;
  if (isDemoMode) return demo.siteVersions.filter((v) => v.slug === slug).slice(0, 20).map((v) => ({ id: v.id, published_at: v.published_at, by: name(v.published_by) }));
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_page_versions").select("id,published_at,published_by").eq("slug", slug).order("published_at", { ascending: false }).limit(20);
  if (error) throw error;
  return (data as { id: number; published_at: string; published_by: string | null }[]).map((v) => ({ id: v.id, published_at: v.published_at, by: name(v.published_by) }));
}

/** Loads an earlier published version into the draft, to review and publish again. */
export async function restoreVersion(slug: string, id: number): Promise<void> {
  let content: PageContent | undefined;
  if (isDemoMode) content = demo.siteVersions.find((v) => v.id === id && v.slug === slug)?.content;
  else {
    const supabase = await createClient();
    const { data } = await supabase.from("site_page_versions").select("content").eq("id", id).eq("slug", slug).maybeSingle();
    content = (data as { content: PageContent } | null)?.content;
  }
  if (!content) throw new Error("Version not found.");
  await saveDraft(slug, content);
}

/** Published content for the public API. Uses the visitor's (anonymous) access. */
export async function getPublishedContent(slug: string): Promise<{ content: PageContent; published_at: string } | null> {
  if (isDemoMode) {
    const r = demo.sitePages.find((x) => x.slug === slug);
    return r?.published ? { content: r.published, published_at: r.published_at! } : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_published_page", { p_slug: slug });
  if (error || !data) return null;
  const d = data as { content: PageContent; published_at: string };
  return { content: d.content, published_at: d.published_at };
}

/** Tells the website to rebuild a page straight away (see README, "Website content"). */
export async function notifyWebsite(slug: string): Promise<"sent" | "not_configured" | "failed"> {
  const url = process.env.SITE_REVALIDATE_URL;
  if (!url) return "not_configured";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.SITE_REVALIDATE_SECRET ?? ""}` },
      body: JSON.stringify({ slug, path: PAGES.find((p) => p.slug === slug)?.path }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

/* ------------------------------------------------------------------ */
/* Media library                                                       */
/* ------------------------------------------------------------------ */

export async function listMedia(): Promise<SiteMedia[]> {
  if (isDemoMode) return [...demo.media].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_media").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return data as SiteMedia[];
}

export async function uploadMedia(file: File, meta: { width: number | null; height: number | null; alt: string | null }): Promise<SiteMedia> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Use a JPG, PNG, WebP, AVIF or GIF image.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Images must be 8 MB or smaller.");
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "image";
  const path = `${new Date().toISOString().slice(0, 7)}/${base}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const now = new Date().toISOString();
  const row = { path, file_name: file.name.slice(0, 200), mime_type: file.type, size_bytes: file.size, width: meta.width, height: meta.height, alt: meta.alt };

  if (isDemoMode) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const media: SiteMedia = { ...row, id: crypto.randomUUID(), url: `data:${file.type};base64,${bytes.toString("base64")}`, created_at: now };
    demo.media.push(media);
    return media;
  }
  const supabase = await createClient();
  const { error: upErr } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (upErr) throw new Error(upErr.message);
  const url = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  const me = await getCurrentUser();
  const { data, error } = await supabase.from("site_media").insert({ ...row, url, created_by: me?.id ?? null }).select("*").single();
  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    throw new Error(error.message);
  }
  return data as SiteMedia;
}

export async function updateMediaAlt(id: string, alt: string | null): Promise<void> {
  if (isDemoMode) {
    const m = demo.media.find((x) => x.id === id);
    if (m) m.alt = alt;
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("site_media").update({ alt }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Pages whose draft or published content uses this image. */
export async function mediaUsage(url: string): Promise<string[]> {
  const list = await rows();
  return PAGES.filter((p) => {
    const r = list.find((x) => x.slug === p.slug);
    return [r?.draft, r?.published].some((c) => c && JSON.stringify(c).includes(url));
  }).map((p) => p.title);
}

export async function deleteMedia(id: string): Promise<void> {
  const media = (await listMedia()).find((m) => m.id === id);
  if (!media) return;
  const used = await mediaUsage(media.url);
  if (used.length) throw new Error(`Still used on: ${used.join(", ")}. Replace it there first.`);
  if (isDemoMode) {
    demo.media = demo.media.filter((m) => m.id !== id);
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([media.path]);
  if (error) throw new Error(error.message);
  await supabase.from("site_media").delete().eq("id", id);
}
