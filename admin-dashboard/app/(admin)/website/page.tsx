import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { listSitePages } from "@/lib/data/content";
import { getSettings } from "@/lib/data/business";
import { Card, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { relative } from "@/lib/format";

export const metadata: Metadata = { title: "Website pages" };

export default async function WebsitePagesPage() {
  const [pages, settings] = await Promise.all([listSitePages(), getSettings()]);
  return (
    <>
      <PageHeader
        title="Website pages"
        description="Change the text and images on your website. Edits are saved as a draft and go live when you publish."
        actions={<ButtonLink href="/media" variant="secondary">Media library</ButtonLink>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pages.map((p) => (
          <Card key={p.slug} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-semibold"><Link href={`/website/${p.slug}`} className="hover:underline">{p.title}</Link></h2>
                <p className="font-mono text-xs text-muted">{p.path}</p>
              </div>
              {p.status === "published" ? <Badge tone="success">Live</Badge> : p.status === "changed" ? <Badge tone="warning">Unpublished changes</Badge> : <Badge>Not published</Badge>}
            </div>
            <p className="mt-3 flex-1 text-sm text-muted">{p.description}</p>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted">
              <span>{p.sections} section{p.sections === 1 ? "" : "s"}{p.published_at && ` · published ${relative(p.published_at)}`}</span>
              <span className="flex items-center gap-1">
                {settings.website_url && p.path.startsWith("/") && (
                  <a href={`${settings.website_url.replace(/\/$/, "")}${p.path}`} target="_blank" rel="noopener" aria-label={`Open ${p.title} on the website`} className="grid size-8 place-items-center rounded-lg hover:bg-surface-2 hover:text-text"><ExternalLink className="size-4" /></a>
                )}
                <ButtonLink href={`/website/${p.slug}`} variant="secondary">Edit</ButtonLink>
              </span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
