"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { deleteMediaAction, updateMediaAltAction } from "@/app/(admin)/website/actions";
import { UploadButton } from "./media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { SiteMedia } from "@/lib/types";

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function MediaLibrary({ media, canEdit }: { media: SiteMedia[]; canEdit: boolean }) {
  const router = useRouter();
  return (
    <>
      {canEdit && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <UploadButton onUploaded={() => router.refresh()} />
          <p className="text-xs text-muted">JPG, PNG, WebP, AVIF or GIF up to 8 MB. Wide images of 2000 px or more look best in heroes.</p>
        </div>
      )}
      {media.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted">No images yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {media.map((m) => <MediaCard key={m.id} m={m} canEdit={canEdit} />)}
        </ul>
      )}
    </>
  );
}

function MediaCard({ m, canEdit }: { m: SiteMedia; canEdit: boolean }) {
  const router = useRouter();
  const [alt, setAlt] = useState(m.alt ?? "");
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();
  return (
    <li className="overflow-hidden rounded-xl border border-border bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={m.url} alt={m.alt ?? ""} className="aspect-[4/3] w-full bg-surface-2 object-cover" />
      <div className="space-y-2 p-3 text-sm">
        <p className="truncate font-medium" title={m.file_name}>{m.file_name}</p>
        <p className="text-xs text-muted">{m.width && m.height ? `${m.width} × ${m.height} · ` : ""}{kb(m.size_bytes)}</p>
        <label className="sr-only" htmlFor={`alt-${m.id}`}>Description</label>
        <div className="flex gap-2">
          <Input id={`alt-${m.id}`} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image" disabled={!canEdit} className="h-8" />
          {canEdit && alt !== (m.alt ?? "") && (
            <Button type="button" variant="secondary" className="h-8" disabled={pending} onClick={() => start(async () => setMsg(await updateMediaAltAction(m.id, alt)))}>Save</Button>
          )}
        </div>
        <div className="flex items-center justify-between">
          {!m.url.startsWith("data:") ? (
            <button type="button" className="inline-flex items-center gap-1 text-xs text-muted hover:text-text" onClick={() => { navigator.clipboard?.writeText(m.url); setMsg({ ok: "Link copied." }); }}>
              <Copy className="size-3.5" />Copy link
            </button>
          ) : <span />}
          {canEdit && (
            <button type="button" aria-label={`Delete ${m.file_name}`} disabled={pending} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger"
              onClick={() => { if (confirm(`Delete ${m.file_name}?`)) start(async () => { const r = await deleteMediaAction(m.id); setMsg(r); if (r.ok) router.refresh(); }); }}>
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
        {(msg.error || msg.ok) && <p role={msg.error ? "alert" : "status"} className={msg.error ? "text-xs text-danger" : "text-xs text-success"}>{msg.error ?? msg.ok}</p>}
      </div>
    </li>
  );
}
