"use client";

import { useState, useTransition } from "react";
import { restoreVersionAction } from "@/app/(admin)/website/actions";
import { Button } from "@/components/ui/button";
import { dateTime } from "@/lib/format";
import type { PageVersion } from "@/lib/data/content";

export function VersionList({ slug, versions, canEdit }: { slug: string; versions: PageVersion[]; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  if (!versions.length) return <p className="p-5 text-sm text-muted">Nothing published yet.</p>;
  return (
    <>
      {msg && <p role="status" className="mx-5 mt-4 rounded-lg bg-surface-2 px-3 py-2 text-sm">{msg}</p>}
      <ul className="divide-y divide-border">
        {versions.map((v, i) => (
          <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
            <span>{dateTime(v.published_at)}{v.by && <span className="text-muted"> · {v.by}</span>}{i === 0 && <span className="ml-2 text-xs text-success">live</span>}</span>
            {canEdit && i > 0 && (
              <Button type="button" variant="ghost" disabled={pending} onClick={() => {
                if (!confirm("Replace the current draft with this version? Unsaved edits are lost.")) return;
                start(async () => {
                  const res = await restoreVersionAction(slug, v.id);
                  setMsg(res.error ?? res.ok ?? null);
                  if (res.ok) location.reload();
                });
              }}>Load as draft</Button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
