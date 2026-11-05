import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/data";
import { getSettings } from "@/lib/data/business";
import { emailConfigured } from "@/lib/email";
import { Card, CardHeader } from "@/components/ui/card";
import { NotificationsForm } from "@/components/business/settings-forms";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationSettings() {
  const [s, me] = await Promise.all([getSettings(), getCurrentUser()]);
  const readOnly = !me || !["owner", "admin"].includes(me.role);
  return (
    <Card>
      <CardHeader title="Notifications" subtitle={readOnly ? "Only an owner or admin can change these." : undefined} />
      <NotificationsForm s={s} readOnly={readOnly} emailReady={emailConfigured} />
    </Card>
  );
}
