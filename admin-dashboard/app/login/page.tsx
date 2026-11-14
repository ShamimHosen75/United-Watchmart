import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { isDemoMode } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 lg:flex">
        <span className="font-serif text-2xl text-white">United WatchMart</span>
        <div>
          <p className="font-serif text-5xl leading-tight text-white">Every watch,<br />every serial,<br />every client.</p>
          <p className="mt-4 max-w-sm text-sm text-sidebar-text">Sales, stock, servicing and clienteling for your boutiques in one back office.</p>
        </div>
        <span className="text-xs text-sidebar-muted">Staff access only</span>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl font-semibold">Sign in</h1>
          <p className="mt-1 mb-8 text-sm text-muted">
            {isDemoMode ? "Demo mode: any email and password will work." : "Use the staff account your admin invited."}
          </p>
          <LoginForm next={typeof next === "string" ? next : "/dashboard"} demo={isDemoMode} />
        </div>
      </div>
    </main>
  );
}
