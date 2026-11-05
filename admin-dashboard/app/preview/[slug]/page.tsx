import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSitePage } from "@/lib/data/content";
import { resolvePage, type Locale } from "@/lib/cms/schema";
import { SitePreview } from "@/components/website/site-preview";
import { param } from "@/lib/params";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Preview", robots: { index: false } };

export default async function PreviewPage({ params, searchParams }: PageProps<"/preview/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = await getSitePage(slug);
  if (!page) notFound();
  const locale: Locale = param(sp.locale) === "ar" ? "ar" : "en";
  const which = param(sp.show) === "live" && page.published ? "live" : "draft";
  const resolved = resolvePage(which === "live" ? page.published! : page.draft, locale);
  const global = slug === "global" ? null : await getSitePage("global");
  const chrome = global ? resolvePage(global.draft, locale).sections : [];
  const link = (patch: Record<string, string>) => `/preview/${slug}?${new URLSearchParams({ locale, show: which, ...patch })}`;

  return (
    <div className="min-h-screen bg-[#0e0803] text-[#efe6d6]" style={{ colorScheme: "dark" }}>
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-2 text-xs text-white/80 backdrop-blur">
        <span className="font-medium text-white">Preview · {page.title}</span>
        <span>{which === "draft" ? "Draft, not live yet" : "What's live now"}</span>
        <span className="ml-auto flex gap-1">
          {page.published && (["draft", "live"] as const).map((w) => (
            <Link key={w} href={link({ show: w })} className={cn("rounded px-2 py-1", which === w ? "bg-white/15 text-white" : "hover:bg-white/10")}>{w === "draft" ? "Draft" : "Live"}</Link>
          ))}
          {(["en", "ar"] as const).map((l) => (
            <Link key={l} href={link({ locale: l })} className={cn("rounded px-2 py-1", locale === l ? "bg-white/15 text-white" : "hover:bg-white/10")}>{l === "en" ? "English" : "العربية"}</Link>
          ))}
          <Link href={`/website/${slug}`} className="rounded px-2 py-1 hover:bg-white/10">Back to editor</Link>
        </span>
      </div>
      <div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
        <SitePreview page={{ seo: resolved.seo, sections: chrome.filter((s) => s.type === "announcement") }} />
        <header className="flex items-center justify-between px-6 py-5 md:px-12">
          <span className="font-serif text-xl tracking-wide">United WatchMart</span>
          <span className="text-xs tracking-[0.12em] text-[#a8997f] uppercase">Menu</span>
        </header>
        <SitePreview page={resolved} />
        <SitePreview page={{ seo: resolved.seo, sections: chrome.filter((s) => s.type === "footer") }} />
      </div>
    </div>
  );
}
