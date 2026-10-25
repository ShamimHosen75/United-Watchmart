import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Flash, buttonClass, inputClass } from "@/components/admin/ui";
import { login } from "@/lib/admin/actions";
import { adminConfigured, isAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  invalid: "That password is not correct.",
  rate: "Too many attempts. Please wait 15 minutes and try again.",
  config: "Admin sign-in is not configured. Set ADMIN_PASSWORD_HASH and ADMIN_SESSION_SECRET.",
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  const message = error ? errors[error] : !adminConfigured() ? errors.config : undefined;

  return (
    <main className="grid min-h-svh place-items-center px-6">
      <form action={login} className="w-full max-w-sm">
        <p className="font-brand text-28">
          United <span className="text-gold">WatchMart</span>
        </p>
        <h1 className="label mt-2 text-muted">Boutique admin</h1>
        <div className="mt-10">{message && <Flash kind="error" text={message} />}</div>
        <label htmlFor="password" className="label text-muted">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          autoFocus
          className={inputClass}
        />
        <button type="submit" className={`${buttonClass} mt-6 w-full`}>
          Sign in
        </button>
      </form>
    </main>
  );
}
