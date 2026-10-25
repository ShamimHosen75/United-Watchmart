import Link from "next/link";
import { logout } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

/** Signed-in admin shell. Every page and action under it also checks the session itself. */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-svh">
      <header className="hairline-b">
        <div className="container-site flex h-16 items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="font-brand text-20">
              United <span className="text-gold">WatchMart</span>
              <span className="label ms-3 text-muted">Admin</span>
            </Link>
            <nav aria-label="Admin" className="flex gap-6">
              <Link href="/admin" className="label text-ivory/80 hover:text-gold-light">
                Orders
              </Link>
              <Link href="/admin/inventory" className="label text-ivory/80 hover:text-gold-light">
                Inventory
              </Link>
            </nav>
          </div>
          <form action={logout}>
            <button type="submit" className="label min-h-11 text-muted hover:text-ivory">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="container-site py-10">{children}</main>
    </div>
  );
}
