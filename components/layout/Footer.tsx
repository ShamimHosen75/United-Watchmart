import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Brand } from "./Brand";
import { NewsletterForm } from "./NewsletterForm";

export async function Footer() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  const explore = [
    { href: "/collection", label: t("nav.collection") },
    { href: "/anatomy", label: t("nav.anatomy") },
    { href: "/pricing", label: t("nav.pricing") },
  ];
  const house = [
    { href: "/about", label: t("nav.about") },
    { href: "/legal", label: t("nav.legal") },
  ];

  return (
    <footer className="hairline-t mt-32 bg-bg">
      <div className="container-site grid gap-12 py-16 md:grid-cols-12 md:gap-6 lg:py-24">
        <div data-reveal className="md:col-span-4">
          <Brand />
          <p className="mt-5 max-w-xs text-muted">{t("footer.tagline")}</p>
        </div>

        <nav aria-label={t("a11y.footerNav")} data-reveal className="grid grid-cols-2 gap-6 md:col-span-4">
          <div>
            <p className="label mb-4 text-gold">{t("footer.explore")}</p>
            <ul className="space-y-2">
              {explore.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-ivory/85 transition-colors hover:text-gold-light">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label mb-4 text-gold">{t("footer.house")}</p>
            <ul className="space-y-2">
              {house.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-ivory/85 transition-colors hover:text-gold-light">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={{ pathname: "/", hash: "visit" }}
                  className="text-ivory/85 transition-colors hover:text-gold-light"
                >
                  {t("nav.visit")}
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <div data-reveal className="md:col-span-4">
          <p className="label mb-2 text-gold">{t("footer.newsletterTitle")}</p>
          <p className="mb-5 text-muted">{t("footer.newsletterBody")}</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="container-site hairline-t flex flex-wrap justify-between gap-4 py-6 text-14 text-muted">
        <p>
          © <span className="tabular">{year}</span> United WatchMart. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
