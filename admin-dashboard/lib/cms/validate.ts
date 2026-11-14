import { z } from "zod";
import { sectionDef, type FieldDef, type PageContent } from "./schema";

const MAX_TEXT = 4000;

/** Links may be site paths, anchors, mailto/tel, or http(s) addresses. Never javascript: and the like. */
export const isSafeLink = (v: string) => v === "" || /^(\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(v.trim());
/** Images must come from the media library (https) or, in demo mode, an inline image. */
export const isSafeImage = (v: string) => v === "" || /^https:\/\//i.test(v) || /^data:image\/(jpeg|png|webp|avif|gif);base64,/i.test(v) || (/^http:\/\/(localhost|127\.0\.0\.1)/i.test(v));

const localized = z.object({ en: z.string().max(MAX_TEXT).optional(), ar: z.string().max(MAX_TEXT).optional() }).strict();

function checkField(f: FieldDef, v: unknown, where: string): string | null {
  if (v === undefined) return null;
  if (f.localized) return localized.safeParse(v).success ? null : `${where}: "${f.label}" is not valid text.`;
  if (typeof v !== "string") return `${where}: "${f.label}" must be text.`;
  if (v.length > (f.kind === "image" ? 15_000_000 : MAX_TEXT)) return `${where}: "${f.label}" is too long.`;
  if (f.kind === "link" && !isSafeLink(v)) return `${where}: "${f.label}" must start with /, #, https://, mailto: or tel:.`;
  if (f.kind === "image" && !isSafeImage(v)) return `${where}: "${f.label}" must be an image from the media library.`;
  if (f.kind === "select" && !f.options?.some((o) => o.value === v)) return `${where}: pick a value for "${f.label}".`;
  return null;
}

/** Checks a page against the section definitions. Returns the first problem, or null. */
export function validatePage(content: unknown): string | null {
  const shape = z.object({
    seo: z.object({ title: localized.optional(), description: localized.optional(), image: z.string().optional() }),
    sections: z.array(z.object({ id: z.string().min(1).max(80), type: z.string(), hidden: z.boolean().optional(), data: z.record(z.string(), z.unknown()) })).max(40),
  }).safeParse(content);
  if (!shape.success) return "The page content is not in the expected shape.";
  const page = content as PageContent;
  if (page.seo.image && !isSafeImage(page.seo.image)) return "The sharing image must come from the media library.";
  const ids = new Set<string>();
  for (const [i, s] of page.sections.entries()) {
    const def = sectionDef(s.type);
    if (!def) return `Section ${i + 1} has an unknown type.`;
    if (ids.has(s.id)) return "Two sections share the same id.";
    ids.add(s.id);
    const where = `${def.label} (section ${i + 1})`;
    for (const f of def.fields) {
      const err = checkField(f, s.data[f.key], where);
      if (err) return err;
    }
    if (def.list) {
      const items = s.data[def.list.key] ?? [];
      if (!Array.isArray(items)) return `${where}: ${def.list.label} is not a list.`;
      if (def.list.max && items.length > def.list.max) return `${where}: at most ${def.list.max} ${def.list.label.toLowerCase()}.`;
      for (const [j, item] of items.entries()) {
        if (!item || typeof item !== "object") return `${where}: ${def.list.itemLabel} ${j + 1} is not valid.`;
        for (const f of def.list.fields) {
          const err = checkField(f, (item as Record<string, unknown>)[f.key], `${where}, ${def.list.itemLabel.toLowerCase()} ${j + 1}`);
          if (err) return err;
        }
      }
    }
  }
  return null;
}
