/* A close-enough rendering of the website, so staff can check content before publishing.
   The real site adds its own motion and 3D; this shows the words, images and order. */
import type { resolvePage } from "@/lib/cms/schema";

type Resolved = ReturnType<typeof resolvePage>;
type S = Resolved["sections"][number] & Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
const paras = (t: string) => t.split(/\n\s*\n/).filter(Boolean);

function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (!src) return <div className={`grid place-items-center bg-gradient-to-br from-[#2a1c0e] to-[#0e0803] text-xs text-[#a8997f] ${className ?? ""}`}>No image yet</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`object-cover ${className ?? ""}`} />;
}

const Label = ({ children }: { children: React.ReactNode }) => <p className="text-xs tracking-[0.12em] text-[#c9a35c] uppercase">{children}</p>;
const Btn = ({ children }: { children: React.ReactNode }) => <span className="mt-8 inline-block rounded-full border border-[#c9a35c] px-6 py-3 text-sm text-[#e6c88a]">{children}</span>;

function Section({ s }: { s: S }) {
  switch (s.type) {
    case "announcement":
      return <div className="bg-[#c9a35c] px-6 py-2 text-center text-sm text-[#0e0803]">{str(s.text)}</div>;
    case "hero":
      return (
        <section className="relative grid min-h-[80vh] items-end overflow-hidden px-6 py-20 md:px-12">
          <Img src={str(s.image)} alt={str(s.image_alt)} className="absolute inset-0 size-full opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0803] via-[#0e0803]/40 to-transparent" />
          <div className="relative max-w-3xl">
            {str(s.eyebrow) && <Label>{str(s.eyebrow)}</Label>}
            <h1 className="mt-4 font-serif text-6xl leading-none md:text-8xl">{str(s.title)}</h1>
            {str(s.intro) && <p className="mt-6 max-w-xl text-lg text-[#a8997f]">{str(s.intro)}</p>}
            {str(s.cta_label) && <Btn>{str(s.cta_label)}</Btn>}
          </div>
        </section>
      );
    case "disassembly":
      return (
        <section className="grid gap-10 px-6 py-24 md:grid-cols-2 md:px-12">
          <Img src={str(s.image)} alt={str(s.image_alt)} className="aspect-square w-full rounded-2xl" />
          <div>
            <h2 className="font-serif text-4xl">{str(s.heading)}</h2>
            <ol className="mt-8 space-y-5">
              {list(s.steps).map((st, i) => (
                <li key={i} className="border-t border-[#c9a35c]/20 pt-4">
                  <p className="text-xs tracking-[0.12em] text-[#c9a35c] uppercase">{String(i + 1).padStart(2, "0")} · {str(st.part)}</p>
                  <p className="mt-1 text-[#efe6d6]/80">{str(st.caption)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      );
    case "specs":
      return (
        <section className="grid grid-cols-2 gap-6 border-y border-[#c9a35c]/20 px-6 py-12 md:grid-cols-4 md:px-12">
          {list(s.items).map((it, i) => (
            <div key={i}><p className="font-serif text-4xl tabular-nums">{str(it.value)}</p><p className="mt-1 text-xs tracking-[0.12em] text-[#a8997f] uppercase">{str(it.label)}</p></div>
          ))}
        </section>
      );
    case "collection_teaser":
      return (
        <section className="px-6 py-24 md:px-12">
          <h2 className="font-serif text-4xl">{str(s.heading)}</h2>
          <p className="mt-3 text-[#a8997f]">{str(s.body)}</p>
          <div className="mt-8 flex gap-4 overflow-hidden">{[1, 2, 3, 4].map((i) => <div key={i} className="aspect-[3/4] w-56 shrink-0 rounded-xl bg-[#1a120a]" />)}</div>
          <p className="mt-6 text-sm text-[#e6c88a] underline underline-offset-4">{str(s.link_label)}</p>
        </section>
      );
    case "rich_text":
      return (
        <section className="mx-auto max-w-3xl px-6 py-16">
          {str(s.eyebrow) && <Label>{str(s.eyebrow)}</Label>}
          {str(s.heading) && <h2 className="mt-3 font-serif text-4xl">{str(s.heading)}</h2>}
          {paras(str(s.body)).map((p, i) => <p key={i} className="mt-4 text-lg leading-relaxed text-[#efe6d6]/80">{p}</p>)}
        </section>
      );
    case "image_text":
      return (
        <section className="grid items-center gap-10 px-6 py-20 md:grid-cols-2 md:px-12">
          <Img src={str(s.image)} alt={str(s.image_alt)} className={`aspect-[4/3] w-full rounded-2xl ${str(s.image_side) === "right" ? "md:order-2" : ""}`} />
          <div>
            <h2 className="font-serif text-4xl">{str(s.heading)}</h2>
            {paras(str(s.body)).map((p, i) => <p key={i} className="mt-4 text-[#efe6d6]/80">{p}</p>)}
            {str(s.cta_label) && <Btn>{str(s.cta_label)}</Btn>}
          </div>
        </section>
      );
    case "chapters":
      return (
        <section className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="font-serif text-4xl">{str(s.heading)}</h2>
          <ol className="mt-10 space-y-12">
            {list(s.chapters).map((c, i) => (
              <li key={i} className="grid gap-6 md:grid-cols-[6rem_1fr]">
                <p className="font-serif text-5xl text-[#c9a35c]">{String(i + 1).padStart(2, "0")}</p>
                <div>
                  <h3 className="font-serif text-2xl">{str(c.title)}</h3>
                  <p className="mt-2 text-[#efe6d6]/80">{str(c.body)}</p>
                  {str(c.image) && <Img src={str(c.image)} alt={str(c.title)} className="mt-4 aspect-video w-full rounded-xl" />}
                </div>
              </li>
            ))}
          </ol>
        </section>
      );
    case "gallery":
      return (
        <section className="px-6 py-16 md:px-12">
          {str(s.heading) && <h2 className="font-serif text-4xl">{str(s.heading)}</h2>}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list(s.images).map((g, i) => (
              <figure key={i}><Img src={str(g.image)} alt={str(g.alt)} className="aspect-[4/5] w-full rounded-xl" />{str(g.caption) && <figcaption className="mt-2 text-sm text-[#a8997f]">{str(g.caption)}</figcaption>}</figure>
            ))}
          </div>
        </section>
      );
    case "cta_banner":
      return (
        <section className="relative mx-6 my-16 overflow-hidden rounded-2xl border border-[#c9a35c]/20 px-8 py-16 text-center md:mx-12">
          {str(s.image) && <Img src={str(s.image)} alt="" className="absolute inset-0 size-full opacity-30" />}
          <div className="relative">
            <h2 className="font-serif text-4xl">{str(s.heading)}</h2>
            <p className="mx-auto mt-3 max-w-xl text-[#a8997f]">{str(s.body)}</p>
            {str(s.button_label) && <Btn>{str(s.button_label)}</Btn>}
          </div>
        </section>
      );
    case "visit":
      return (
        <section id="visit" className="grid gap-10 px-6 py-24 md:grid-cols-2 md:px-12">
          <div>
            <h2 className="font-serif text-4xl">{str(s.heading)}</h2>
            <p className="mt-4 text-[#a8997f]">{str(s.body)}</p>
            <div className="mt-8 space-y-3">{["Name", "Email", "Watch", "Preferred time"].map((f) => <div key={f} className="border-b border-[#c9a35c]/30 py-3 text-sm text-[#a8997f]">{f}</div>)}</div>
            <Btn>{str(s.button_label) || "Send"}</Btn>
          </div>
          {str(s.image) && <Img src={str(s.image)} alt="" className="aspect-[4/5] w-full rounded-2xl" />}
        </section>
      );
    case "footer":
      return (
        <footer className="border-t border-[#c9a35c]/20 px-6 py-12 md:px-12">
          <p className="font-serif text-2xl">{str(s.brand_line)}</p>
          <p className="mt-6 text-sm text-[#a8997f]">{str(s.newsletter_heading)}</p>
          <div className="mt-2 max-w-sm border-b border-[#c9a35c]/30 py-2 text-sm text-[#a8997f]/70">{str(s.newsletter_placeholder)}</div>
          <div className="mt-8 flex flex-wrap justify-between gap-4 text-xs text-[#a8997f]">
            <span>{str(s.copyright).replace("{year}", String(new Date().getFullYear()))}</span>
            <span className="flex gap-4">{list(s.social).map((l, i) => <span key={i}>{str(l.label)}</span>)}</span>
          </div>
        </footer>
      );
    default:
      return null;
  }
}

export function SitePreview({ page }: { page: Resolved }) {
  return <>{page.sections.map((s) => <Section key={s.id} s={s as S} />)}</>;
}
