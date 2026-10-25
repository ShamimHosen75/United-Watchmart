import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/ButtonLink";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <section className="container-site flex min-h-[80svh] flex-col items-start justify-center pt-[var(--header-h)]">
      <p className="label tabular text-gold">{t("label")}</p>
      <h1 className="mt-6 text-96">{t("title")}</h1>
      <p className="mt-6 max-w-md text-20 text-ivory/80">{t("body")}</p>
      <ButtonLink href="/" className="mt-12">
        {t("cta")}
      </ButtonLink>
    </section>
  );
}
