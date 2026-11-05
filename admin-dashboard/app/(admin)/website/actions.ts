"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/data";
import {
  deleteMedia, discardDraft, getSitePage, notifyWebsite, publishPage, restoreVersion, saveDraft, updateMediaAlt, uploadMedia,
} from "@/lib/data/content";
import { validatePage } from "@/lib/cms/validate";
import { errorMessage } from "@/lib/form";
import type { PageContent } from "@/lib/cms/schema";
import type { SiteMedia } from "@/lib/types";

export interface ContentResult { ok?: string; error?: string }

const canEdit = async () => {
  const u = await getCurrentUser();
  return Boolean(u?.is_active && ["owner", "admin", "manager"].includes(u.role));
};
const touch = (slug: string) => {
  revalidatePath("/website");
  revalidatePath(`/website/${slug}`);
  revalidatePath(`/preview/${slug}`);
};

export async function saveDraftAction(slug: string, content: PageContent): Promise<ContentResult> {
  if (!(await canEdit())) return { error: "Only a manager can edit website content." };
  if (!(await getSitePage(slug))) return { error: "Page not found." };
  const problem = validatePage(content);
  if (problem) return { error: problem };
  try { await saveDraft(slug, content); } catch (e) { return { error: errorMessage(e, "Could not save.") }; }
  touch(slug);
  return { ok: "Draft saved. The website is unchanged until you publish." };
}

export async function publishAction(slug: string, content: PageContent): Promise<ContentResult> {
  if (!(await canEdit())) return { error: "Only a manager can publish website content." };
  const problem = validatePage(content);
  if (problem) return { error: problem };
  try {
    await saveDraft(slug, content);
    await publishPage(slug);
  } catch (e) {
    return { error: errorMessage(e, "Could not publish.") };
  }
  touch(slug);
  const site = await notifyWebsite(slug);
  return {
    ok: site === "sent" ? "Published. The website has been told to refresh this page."
      : site === "failed" ? "Published, but the website didn't answer the refresh call. It will update on its next rebuild."
      : "Published. The website picks it up on its next refresh.",
  };
}

export async function discardAction(slug: string): Promise<ContentResult> {
  if (!(await canEdit())) return { error: "Only a manager can edit website content." };
  try { await discardDraft(slug); } catch (e) { return { error: errorMessage(e, "Could not discard.") }; }
  touch(slug);
  return { ok: "Unpublished changes discarded." };
}

export async function restoreVersionAction(slug: string, id: number): Promise<ContentResult> {
  if (!(await canEdit())) return { error: "Only a manager can edit website content." };
  try { await restoreVersion(slug, id); } catch (e) { return { error: errorMessage(e, "Could not restore.") }; }
  touch(slug);
  return { ok: "Earlier version loaded as a draft. Publish to put it live." };
}

export async function uploadMediaAction(formData: FormData): Promise<{ media?: SiteMedia; error?: string }> {
  if (!(await canEdit())) return { error: "Only a manager can upload images." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  const num = (k: string) => { const v = Number(formData.get(k)); return Number.isFinite(v) && v > 0 ? Math.round(v) : null; };
  const alt = String(formData.get("alt") ?? "").trim().slice(0, 300) || null;
  try {
    const media = await uploadMedia(file, { width: num("width"), height: num("height"), alt });
    revalidatePath("/media");
    return { media };
  } catch (e) {
    return { error: errorMessage(e, "Upload failed.") };
  }
}

export async function updateMediaAltAction(id: string, alt: string): Promise<ContentResult> {
  if (!(await canEdit())) return { error: "Only a manager can edit images." };
  await updateMediaAlt(id, alt.trim().slice(0, 300) || null);
  revalidatePath("/media");
  return { ok: "Saved." };
}

export async function deleteMediaAction(id: string): Promise<ContentResult> {
  if (!(await canEdit())) return { error: "Only a manager can delete images." };
  try { await deleteMedia(id); } catch (e) { return { error: errorMessage(e, "Could not delete.") }; }
  revalidatePath("/media");
  return { ok: "Deleted." };
}
