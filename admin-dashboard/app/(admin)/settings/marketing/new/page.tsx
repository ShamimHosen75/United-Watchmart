import type { Metadata } from "next";
import Link from "next/link";
import { listBranches, listBrands } from "@/lib/data";
import { Card, CardHeader } from "@/components/ui/card";
import { CampaignForm } from "@/components/business/campaign-forms";

export const metadata: Metadata = { title: "New campaign" };

export default async function NewCampaignPage() {
  const [branches, brands] = await Promise.all([listBranches(), listBrands()]);
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/settings/marketing" className="text-muted hover:text-text">← Campaigns</Link></p>
      <Card>
        <CardHeader title="New campaign" subtitle="Saved as a draft. You'll see who it reaches before anything is sent." />
        <CampaignForm branches={branches} brands={brands} />
      </Card>
    </>
  );
}
