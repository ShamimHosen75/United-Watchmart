import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getBranchScope, getCurrentUser, listBranches } from "@/lib/data";
import { isDemoMode } from "@/lib/env";
import { signOut } from "@/app/actions";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!user.is_active) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="font-serif text-2xl font-semibold">Waiting for approval</h1>
          <p className="mt-2 text-sm text-muted">
            Your account ({user.email}) was created. An owner or admin needs to activate it in Users before you can use the back office.
          </p>
          <form action={signOut} className="mt-6">
            <button className="text-sm font-medium text-accent-strong underline">Sign out</button>
          </form>
        </div>
      </main>
    );
  }

  const [branches, scope] = await Promise.all([listBranches(), getBranchScope()]);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar user={user} branches={branches} scope={scope} />
        {isDemoMode && (
          <div className="bg-accent-soft px-4 py-2 text-center text-xs text-accent-strong lg:px-8">
            Demo mode: sample data kept in memory. Add your Supabase keys to <code>.env.local</code> to use the real database.
          </div>
        )}
        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
