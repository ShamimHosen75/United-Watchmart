import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, listBranches } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { Card, CardHeader } from "@/components/ui/card";
import { PasswordForm, ProfileForm } from "@/components/business/settings-forms";
import { titleCase } from "@/lib/format";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettings() {
  const [me, branches] = await Promise.all([getCurrentUser(), listBranches()]);
  if (!me) redirect("/login");
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Your profile" subtitle={`${me.email ?? ""} · ${titleCase(me.role)} · ${branches.find((b) => b.id === me.branch_id)?.name ?? "All branches"}`} />
        <ProfileForm me={me} />
      </Card>
      <Card>
        <CardHeader title="Password" subtitle={isDemoMode ? "Not available in demo mode." : "New staff invited by email set their first password here."} />
        <PasswordForm disabled={isDemoMode} />
      </Card>
    </div>
  );
}
