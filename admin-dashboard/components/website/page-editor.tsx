"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, ExternalLink, Globe, ImageIcon, Plus, Search, Trash2, Undo2 } from "lucide-react";
import { discardAction, publishAction, saveDraftAction, type ContentResult } from "@/app/(admin)/website/actions";
import { MediaPicker } from "./media-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  SECTION_TYPES, blankSection, sectionDef, type FieldDef, type FieldValue, type ItemValue, type Locale, type Localized, type PageContent, type Section,
} from "@/lib/cms/schema";
import type { SiteMedia } from "@/lib/types";

type Selected = "seo" | number;

const textOf = (v: unknown, locale: Locale = "en") =>
  typeof v === "string" ? v : v && typeof v === "object" ? ((v as Localized)[locale] ?? "") : "";

/** A short line that identifies a section in the list. */
function summary(s: Section) {
  const d = s.data;
  for (const k of ["title", "heading", "text", "brand_line"]) {
    const t = textOf(d[k]);
    if (t) return t;
  }
  const def = sectionDef(s.type);
  const list = def?.list ? (d[def.list.key] as ItemValue[] | undefined) : undefined;
  return list ? `${list.length} ${def!.list!.label.toLowerCase()}` : "";
}

export function PageEditor({ slug, path, initial, hasPublished, changed: initialChanged, media: initialMedia, canEdit }: {
  slug: string;
  path: string;
  initial: PageContent;
  hasPublished: boolean;
  changed: boolean;
  media: SiteMedia[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState<PageContent>(initial);
  const [selected, setSelected] = useState<Selected>(initial.sections.length ? 0 : "seo");
  const [locale, setLocale] = useState<Locale>("en");
  const [dirty, setDirty] = useState(false);
  const [unpublished, setUnpublished] = useState(initialChanged);
  const [result, setResult] = useState<ContentResult>({});
  const [pending, start] = useTransition();
  const [media, setMedia] = useState(initialMedia);
  const [picker, setPicker] = useState<null | ((url: string, m: SiteMedia) => void)>(null);
  const [addType, setAddType] = useState(SECTION_TYPES[4].type);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (fn: (c: PageContent) => PageContent) => {
    setContent((c) => fn(structuredClone(c)));
    setDirty(true);
    setUnpublished(true);
    setResult({});
  };
  const setData = (i: number, key: string, value: FieldValue | ItemValue[]) => update((c) => { c.sections[i].data[key] = value; return c; });
  const move = (i: number, by: number) => update((c) => {
    const [s] = c.sections.splice(i, 1);
    c.sections.splice(i + by, 0, s);
    return c;
  });

  const run = (fn: () => Promise<ContentResult>, after?: () => void) => start(async () => {
    const res = await fn();
    setResult(res);
    if (res.ok) { setDirty(false); after?.(); router.refresh(); }
  });

  const section = typeof selected === "number" ? content.sections[selected] : null;
  const def = section ? sectionDef(section.type) : null;
  const arMissing = useMemo(() => JSON.stringify(content).includes('"ar":""'), [content]);

  /* ---------- field renderers ---------- */

  const renderField = (f: FieldDef, value: FieldValue | undefined, onChange: (v: FieldValue) => void, idPrefix: string) => {
    const id = `${idPrefix}-${f.key}`;
    if (f.kind === "image") {
      const url = typeof value === "string" ? value : "";
      return (
        <Field key={f.key} label={f.label} hint={f.hint} className="sm:col-span-2">
          <div className="flex items-center gap-3">
            <div className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {url ? <img src={url} alt="" className="size-full object-cover" /> : <ImageIcon className="size-5 text-muted" aria-hidden />}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={!canEdit} onClick={() => setPicker(() => (u: string) => onChange(u))}>{url ? "Change image" : "Choose image"}</Button>
              {url && <Button type="button" variant="ghost" disabled={!canEdit} onClick={() => onChange("")}>Remove</Button>}
            </div>
          </div>
        </Field>
      );
    }
    if (f.kind === "select") {
      return (
        <Field key={f.key} label={f.label}>
          <Select id={id} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} disabled={!canEdit}>
            {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
      );
    }
    const isLong = f.kind === "textarea";
    const current = f.localized ? textOf(value, locale) : textOf(value);
    const english = f.localized ? textOf(value, "en") : "";
    const set = (t: string) => onChange(f.localized ? { ...(typeof value === "object" ? value : {}), [locale]: t } : t);
    const rtl = f.localized && locale === "ar";
    const props = { id, value: current, disabled: !canEdit, dir: rtl ? ("rtl" as const) : undefined, lang: f.localized ? locale : undefined };
    return (
      <Field key={f.key} label={`${f.label}${f.localized ? ` · ${locale === "en" ? "English" : "Arabic"}` : ""}`}
        hint={rtl && !current && english ? `Empty, so the website shows the English: "${english.slice(0, 80)}${english.length > 80 ? "…" : ""}"` : f.hint}
        className={isLong || f.kind === "link" ? "sm:col-span-2" : undefined}>
        {isLong
          ? <Textarea rows={4} {...props} onChange={(e) => set(e.target.value)} />
          : <Input {...props} placeholder={f.kind === "link" ? "/collection" : undefined} onChange={(e) => set(e.target.value)} />}
      </Field>
    );
  };

  /* ---------- layout ---------- */

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr] [&>*]:min-w-0">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/95 px-4 py-3 backdrop-blur lg:col-span-2">
        {!hasPublished ? <Badge>Not published yet</Badge> : unpublished ? <Badge tone="warning">Unpublished changes</Badge> : <Badge tone="success">Live</Badge>}
        {dirty && <span className="text-xs text-muted">Not saved</span>}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5" role="group" aria-label="Language">
            {(["en", "ar"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLocale(l)} aria-pressed={locale === l}
                className={cn("rounded-md px-2.5 py-1 text-xs", locale === l ? "bg-surface-2 font-medium" : "text-muted")}>{l === "en" ? "English" : "العربية"}</button>
            ))}
          </div>
          <a href={`/preview/${slug}?locale=${locale}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted hover:bg-surface-2 hover:text-text">
            <ExternalLink className="size-4" />Preview{dirty && " (saved draft)"}
          </a>
          {canEdit && hasPublished && unpublished && !dirty && (
            <Button type="button" variant="ghost" disabled={pending} onClick={() => { if (confirm("Throw away all unpublished changes to this page?")) run(() => discardAction(slug), () => location.reload()); }}>
              <Undo2 className="size-4" />Discard changes
            </Button>
          )}
          {canEdit && <Button type="button" variant="secondary" disabled={pending || !dirty} onClick={() => run(() => saveDraftAction(slug, content))}>Save draft</Button>}
          {canEdit && <Button type="button" disabled={pending || (!unpublished && hasPublished)} onClick={() => run(() => publishAction(slug, content), () => setUnpublished(false))}><Globe className="size-4" />{pending ? "Working…" : "Publish"}</Button>}
        </div>
        {(result.error || result.ok) && (
          <p role={result.error ? "alert" : "status"} className={cn("w-full rounded-lg px-3 py-2 text-sm", result.error ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>{result.error ?? result.ok}</p>
        )}
        {locale === "ar" && arMissing && <p className="w-full text-xs text-muted">Some Arabic fields are empty. The Arabic site shows the English text for those until you fill them in.</p>}
      </div>

      {/* Section list */}
      <aside className="space-y-3">
        <nav aria-label="Sections" className="overflow-hidden rounded-xl border border-border bg-surface">
          <button type="button" onClick={() => setSelected("seo")} aria-current={selected === "seo" ? "true" : undefined}
            className={cn("flex w-full items-center gap-2 border-b border-border px-4 py-3 text-left text-sm", selected === "seo" ? "bg-accent-soft font-medium" : "hover:bg-surface-2")}>
            <Search className="size-4 text-muted" aria-hidden />Search and sharing
          </button>
          <ol>
            {content.sections.map((s, i) => {
              const d = sectionDef(s.type);
              return (
                <li key={s.id} className={cn("border-b border-border last:border-0", selected === i && "bg-accent-soft")}>
                  <button type="button" onClick={() => setSelected(i)} aria-current={selected === i ? "true" : undefined} className="block w-full px-4 pt-3 pb-1 text-left">
                    <span className={cn("block text-sm", selected === i && "font-medium", s.hidden && "text-muted line-through")}>{i + 1}. {d?.label ?? s.type}</span>
                    <span className="block truncate text-xs text-muted">{summary(s) || "Empty"}</span>
                  </button>
                  {canEdit && (
                    <div className="flex gap-0.5 px-3 pb-2">
                      <IconBtn label="Move up" disabled={i === 0} onClick={() => { move(i, -1); setSelected(i - 1); }}><ArrowUp className="size-3.5" /></IconBtn>
                      <IconBtn label="Move down" disabled={i === content.sections.length - 1} onClick={() => { move(i, 1); setSelected(i + 1); }}><ArrowDown className="size-3.5" /></IconBtn>
                      <IconBtn label={s.hidden ? "Show on website" : "Hide from website"} onClick={() => update((c) => { c.sections[i].hidden = !c.sections[i].hidden; return c; })}>
                        {s.hidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </IconBtn>
                      <IconBtn label="Delete section" danger onClick={() => {
                        if (!confirm(`Delete the ${d?.label ?? "section"} section?`)) return;
                        update((c) => { c.sections.splice(i, 1); return c; });
                        setSelected(content.sections.length > 1 ? Math.max(0, i - 1) : "seo");
                      }}><Trash2 className="size-3.5" /></IconBtn>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        {canEdit && content.sections.length < 40 && (
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="add-type">Section type</label>
            <Select id="add-type" value={addType} onChange={(e) => setAddType(e.target.value)}>
              {SECTION_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
            </Select>
            <Button type="button" variant="secondary" onClick={() => {
              const id = `${addType}-${Date.now().toString(36)}`;
              update((c) => { c.sections.push(blankSection(addType, id)); return c; });
              setSelected(content.sections.length);
            }}><Plus className="size-4" />Add</Button>
          </div>
        )}
        <p className="px-1 text-xs text-muted">Shown on the website at <span className="font-mono">{path}</span>. Hidden sections stay here but don&apos;t appear.</p>
      </aside>

      {/* Editor */}
      <section className="rounded-xl border border-border bg-surface" aria-label="Edit section">
        {selected === "seo" ? (
          <>
            <header className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold">Search and sharing</h2>
              <p className="mt-0.5 text-xs text-muted">The title and description Google shows, and the image used when the page is shared.</p>
            </header>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {renderField({ key: "title", label: "Page title", kind: "text", localized: true, hint: "About 50 to 60 characters" }, content.seo.title, (v) => update((c) => { c.seo.title = v as Localized; return c; }), "seo")}
              {renderField({ key: "description", label: "Description", kind: "textarea", localized: true, hint: "About 150 characters" }, content.seo.description, (v) => update((c) => { c.seo.description = v as Localized; return c; }), "seo")}
              {renderField({ key: "image", label: "Sharing image", kind: "image", hint: "1200 × 630 works best" }, content.seo.image, (v) => update((c) => { c.seo.image = v as string; return c; }), "seo")}
              <div className="rounded-lg border border-border p-4 sm:col-span-2" aria-label="Search result preview">
                <p className="text-xs text-muted">Search result preview</p>
                <p className="mt-1 truncate text-base text-[#1a0dab]" dir={locale === "ar" ? "rtl" : undefined}>{textOf(content.seo.title, locale) || textOf(content.seo.title) || "Page title"}</p>
                <p className="line-clamp-2 text-sm text-muted" dir={locale === "ar" ? "rtl" : undefined}>{textOf(content.seo.description, locale) || textOf(content.seo.description) || "Description"}</p>
              </div>
            </div>
          </>
        ) : section && def ? (
          <>
            <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">{def.label}{section.hidden && <span className="ml-2 text-xs font-normal text-muted">(hidden)</span>}</h2>
                <p className="mt-0.5 text-xs text-muted">{def.description}</p>
              </div>
            </header>
            <fieldset disabled={!canEdit} className="grid gap-4 p-5 sm:grid-cols-2">
              {def.fields.map((f) => renderField(f, section.data[f.key] as FieldValue, (v) => setData(selected as number, f.key, v), section.id))}
              {def.list && (
                <div className="space-y-3 sm:col-span-2">
                  <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{def.list.label}</h3>
                  {((section.data[def.list.key] as ItemValue[] | undefined) ?? []).map((item, j, items) => (
                    <div key={j} className="rounded-lg border border-border">
                      <div className="flex items-center justify-between border-b border-border bg-surface-2/50 px-4 py-2">
                        <span className="text-xs font-medium">{def.list!.itemLabel} {j + 1}</span>
                        <div className="flex gap-0.5">
                          <IconBtn label="Move up" disabled={j === 0} onClick={() => { const next = [...items]; [next[j - 1], next[j]] = [next[j], next[j - 1]]; setData(selected as number, def.list!.key, next); }}><ArrowUp className="size-3.5" /></IconBtn>
                          <IconBtn label="Move down" disabled={j === items.length - 1} onClick={() => { const next = [...items]; [next[j + 1], next[j]] = [next[j], next[j + 1]]; setData(selected as number, def.list!.key, next); }}><ArrowDown className="size-3.5" /></IconBtn>
                          <IconBtn label={`Remove ${def.list!.itemLabel.toLowerCase()}`} danger disabled={items.length <= (def.list!.min ?? 0)} onClick={() => setData(selected as number, def.list!.key, items.filter((_, k) => k !== j))}><Trash2 className="size-3.5" /></IconBtn>
                        </div>
                      </div>
                      <div className="grid gap-4 p-4 sm:grid-cols-2">
                        {def.list!.fields.map((f) => renderField(f, item[f.key], (v) => setData(selected as number, def.list!.key, items.map((x, k) => (k === j ? { ...x, [f.key]: v } : x))), `${section.id}-${j}`))}
                      </div>
                    </div>
                  ))}
                  {(!def.list.max || ((section.data[def.list.key] as ItemValue[] | undefined)?.length ?? 0) < def.list.max) && (
                    <Button type="button" variant="secondary" onClick={() => {
                      const items = (section.data[def.list!.key] as ItemValue[] | undefined) ?? [];
                      const blank = blankSection(section.type, "x").data[def.list!.key] as ItemValue[];
                      const empty = blank[0] ?? Object.fromEntries(def.list!.fields.map((f) => [f.key, f.localized ? { en: "", ar: "" } : ""]));
                      setData(selected as number, def.list!.key, [...items, empty]);
                    }}><Plus className="size-4" />Add {def.list.itemLabel.toLowerCase()}</Button>
                  )}
                </div>
              )}
            </fieldset>
          </>
        ) : (
          <p className="p-10 text-center text-sm text-muted">Pick a section on the left, or add one.</p>
        )}
      </section>

      <MediaPicker
        open={picker !== null}
        media={media}
        onClose={() => setPicker(null)}
        onUploaded={(m) => setMedia((list) => [m, ...list])}
        onPick={(m) => { picker?.(m.url, m); setPicker(null); }}
      />
    </div>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className={cn("grid size-7 place-items-center rounded-md text-muted hover:bg-surface-2 disabled:opacity-30", danger ? "hover:text-danger" : "hover:text-text")}>
      {children}
    </button>
  );
}
