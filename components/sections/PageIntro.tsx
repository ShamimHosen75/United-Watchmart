import { SectionLabel } from "@/components/ui/SectionLabel";

type Props = { label: string; title: string; intro?: string; children?: React.ReactNode };

/** Shared heading block for inner pages. Never hidden for a reveal: it is the first thing painted (LCP). */
export function PageIntro({ label, title, intro, children }: Props) {
  return (
    <header className="container-site pb-16 pt-[calc(var(--header-h)+5rem)] lg:pb-24 lg:pt-[calc(var(--header-h)+8rem)]">
      <SectionLabel>{label}</SectionLabel>
      <h1 className="mt-6 max-w-4xl text-96">{title}</h1>
      {intro && <p className="mt-8 max-w-2xl text-20 text-ivory/80">{intro}</p>}
      {children}
    </header>
  );
}
