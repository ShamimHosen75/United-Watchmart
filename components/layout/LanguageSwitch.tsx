"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const labels = { en: "EN", ar: "عربي" } as const;

export function LanguageSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("a11y");

  return (
    <nav aria-label={t("language")} className={`flex items-center gap-1 ${className}`}>
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className="text-muted/50">/</span>}
          <Link
            href={pathname}
            locale={l}
            lang={l}
            hrefLang={l}
            aria-current={l === locale ? "true" : undefined}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center px-1 text-14 tracking-[0.12em] transition-colors ${
              l === locale ? "text-gold" : "text-muted hover:text-ivory"
            }`}
          >
            {labels[l]}
          </Link>
        </span>
      ))}
    </nav>
  );
}
