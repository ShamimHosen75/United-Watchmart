import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/data";
import { listMedia } from "@/lib/data/content";
import { PageHeader } from "@/components/ui/card";
import { MediaLibrary } from "@/components/website/media-library";

export const metadata: Metadata = { title: "Media library" };

export default async function MediaPage() {
  const [media, me] = await Promise.all([listMedia(), getCurrentUser()]);
  const canEdit = Boolean(me && ["owner", "admin", "manager"].includes(me.role));
  return (
    <>
      <PageHeader title="Media library" description="Images for your website pages. An image used on a page can't be deleted until it's replaced there." />
      <MediaLibrary media={media} canEdit={canEdit} />
    </>
  );
}
