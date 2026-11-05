import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/data";
import { getSitePage, listMedia, listVersions } from "@/lib/data/content";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { PageEditor } from "@/components/website/page-editor";
import { VersionList } from "@/components/website/version-list";
import { relative } from "@/lib/format";

export const metadata: Metadata = { title: "Edit page" };

export default async function EditSitePage({ params }: PageProps<"/website/[slug]">) {
  const { slug } = await params;
  const [page, media, versions, me] = await Promise.all([getSitePage(slug), listMedia(), listVersions(slug), getCurrentUser()]);
  if (!page) notFound();
  const canEdit = Boolean(me && ["owner", "admin", "manager"].includes(me.role));
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/website" className="text-muted hover:text-text">← Website pages</Link></p>
      <PageHeader
        title={page.title}
        description={`${canEdit ? "" : "Read only: ask a manager to make changes. "}${page.published_at ? `Last published ${relative(page.published_at)}.` : "Not published yet."}`}
      />
      <PageEditor
        slug={page.slug}
        path={page.path}
        initial={page.draft}
        hasPublished={Boolean(page.published)}
        changed={page.changed}
        media={media}
        canEdit={canEdit}
      />
      <Card className="mt-6 max-w-2xl">
        <CardHeader title="Published versions" subtitle="Every publish is kept. Load an older one to review it, then publish to roll back." />
        <VersionList slug={page.slug} versions={versions} canEdit={canEdit} />
      </Card>
    </>
  );
}
