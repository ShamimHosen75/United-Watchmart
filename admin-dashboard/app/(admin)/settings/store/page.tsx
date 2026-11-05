import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/data";
import { getSettings } from "@/lib/data/business";
import { Card, CardHeader } from "@/components/ui/card";
import { StoreForm } from "@/components/business/settings-forms";

export const metadata: Metadata = { title: "Store settings" };

export default async function StoreSettingsPage() {
  const [s, me] = await Promise.all([getSettings(), getCurrentUser()]);
  const readOnly = !me || !["owner", "admin"].includes(me.role);
  return (
    <Card>
      <CardHeader title="Store and invoice" subtitle={readOnly ? "Only an owner or admin can change these." : undefined} />
      <StoreForm s={s} readOnly={readOnly} />
    </Card>
  );
}
