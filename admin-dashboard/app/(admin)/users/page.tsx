import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { getCurrentUser, listBranches } from "@/lib/data";
import { listAllStaff, listInvites } from "@/lib/data/business";
import { hasServiceRole } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/env";
import { deleteInviteAction } from "./actions";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteForm, StaffRow } from "@/components/business/staff-forms";
import { ROLES } from "@/lib/roles";
import { date, titleCase } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const [me, staff, branches] = await Promise.all([getCurrentUser(), listAllStaff(), listBranches()]);
  const admin = Boolean(me && ["owner", "admin"].includes(me.role));
  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? "All branches";

  if (!admin) {
    return (
      <>
        <PageHeader title="Users" description="Your colleagues. Only an owner or admin can change roles." />
        <Card>
          <ul className="divide-y divide-border">
            {staff.filter((s) => s.is_active).map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{s.full_name}<span className="block text-xs text-muted">{s.email}</span></span>
                <span className="text-right text-muted">{titleCase(s.role)}<span className="block text-xs">{branchName(s.branch_id)}</span></span>
              </li>
            ))}
          </ul>
        </Card>
      </>
    );
  }

  const invites = await listInvites();
  const waiting = staff.filter((s) => !s.is_active);
  const active = staff.filter((s) => s.is_active);
  const pickBranches = branches.filter((b) => b.is_active);
  const rowProps = (s: (typeof staff)[number]) => ({ person: s, branches: pickBranches, isSelf: s.id === me!.id, canEditOwner: me!.role === "owner" });

  return (
    <>
      <PageHeader title="Users" description="Invite staff, approve sign-ups and set each person's role and home branch." />
      <div className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 xl:col-span-2">
          {waiting.length > 0 && (
            <Card>
              <CardHeader title={`Waiting for approval or switched off (${waiting.length})`} subtitle="Tick Active and save to let them in." />
              <div className="divide-y divide-border">{waiting.map((s) => <StaffRow key={s.id} {...rowProps(s)} />)}</div>
            </Card>
          )}
          <Card>
            <CardHeader title={`Active staff (${active.length})`} subtitle="A home branch limits nothing; it sets the default branch on their screens." />
            <div className="divide-y divide-border">{active.map((s) => <StaffRow key={s.id} {...rowProps(s)} />)}</div>
          </Card>
          <Card>
            <CardHeader title="What each role can do" />
            <dl className="divide-y divide-border text-sm">
              {ROLES.map((r) => (
                <div key={r.value} className="grid gap-1 px-5 py-2.5 sm:grid-cols-[8rem_1fr]"><dt className="font-medium">{r.label}</dt><dd className="text-muted">{r.can}</dd></div>
              ))}
            </dl>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Invite someone"
              subtitle={isDemoMode ? "Demo mode: the invite is listed but no email is sent."
                : hasServiceRole ? "They get an email to set a password." : "No invite email is sent until SUPABASE_SERVICE_ROLE_KEY is set (see Settings → Integrations). You can also invite them from the Supabase dashboard; the role here is applied when they first sign in."}
            />
            <InviteForm branches={pickBranches} canInviteOwner={me!.role === "owner"} />
          </Card>
          <Card>
            <CardHeader title="Invites" />
            {invites.length === 0 ? <EmptyState title="No invites yet" /> : (
              <ul className="divide-y divide-border">
                {invites.map((i) => (
                  <li key={i.email} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{i.full_name || i.email}</span>
                      <span className="block truncate text-xs text-muted">{i.email} · {titleCase(i.role)} · {branchName(i.branch_id)} · {date(i.created_at)}</span>
                    </span>
                    {i.accepted_at ? <Badge tone="success">Joined</Badge> : (
                      <span className="flex items-center gap-2">
                        <Badge tone="warning">Pending</Badge>
                        <form action={deleteInviteAction.bind(null, i.email)}>
                          <button type="submit" aria-label={`Withdraw invite for ${i.email}`} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger"><Trash2 className="size-4" /></button>
                        </form>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
