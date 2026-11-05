"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadMediaAction } from "@/app/(admin)/website/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { SiteMedia } from "@/lib/types";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

/** Reads an image's pixel size in the browser before upload. */
function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

export async function uploadFile(file: File, alt = ""): Promise<{ media?: SiteMedia; error?: string }> {
  if (file.size > 8 * 1024 * 1024) return { error: "Images must be 8 MB or smaller." };
  const size = await imageSize(file);
  const fd = new FormData();
  fd.set("file", file);
  fd.set("alt", alt);
  if (size) { fd.set("width", String(size.width)); fd.set("height", String(size.height)); }
  return uploadMediaAction(fd);
}

export function UploadButton({ onUploaded, label = "Upload image" }: { onUploaded: (m: SiteMedia) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <input ref={input} type="file" accept={ACCEPT} className="sr-only" aria-label={label} onChange={async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setBusy(true); setError(null);
        const res = await uploadFile(file);
        setBusy(false);
        if (res.error) setError(res.error); else if (res.media) onUploaded(res.media);
      }} />
      <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{busy ? "Uploading…" : label}
      </Button>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function MediaPicker({ open, media, onClose, onPick, onUploaded }: {
  open: boolean;
  media: SiteMedia[];
  onClose: () => void;
  onPick: (m: SiteMedia) => void;
  onUploaded: (m: SiteMedia) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const shown = media.filter((m) => !q || `${m.file_name} ${m.alt ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="picker-title"
      className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-0 text-text shadow-2xl backdrop:bg-black/50">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 id="picker-title" className="font-semibold">Choose an image</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2"><X className="size-4" /></button>
      </div>
      <div className="flex flex-wrap items-start gap-3 border-b border-border px-5 py-3">
        <UploadButton onUploaded={(m) => { onUploaded(m); onPick(m); }} label="Upload new" />
        <label className="sr-only" htmlFor="picker-q">Search images</label>
        <input id="picker-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by file name or description"
          className="h-9 min-w-48 flex-1 rounded-lg border border-border bg-surface px-3 text-sm focus:border-accent focus:outline-none" />
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-5">
        {shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">{media.length ? "No images match." : "No images yet. Upload the first one."}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {shown.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => onPick(m)} className={cn("group block w-full overflow-hidden rounded-lg border border-border text-left hover:border-accent focus-visible:border-accent")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.alt ?? ""} className="aspect-[4/3] w-full bg-surface-2 object-cover" />
                  <span className="block truncate px-2 py-1.5 text-xs text-muted group-hover:text-text">{m.file_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}
