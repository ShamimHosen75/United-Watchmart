/**
 * Website content model. Shared by the admin editor, the preview and the public API.
 * A page holds SEO fields and an ordered list of sections. Text fields are stored per
 * language ({ en, ar }); the website falls back to English when Arabic is empty.
 */

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export type Localized = Partial<Record<Locale, string>>;

export type FieldKind = "text" | "textarea" | "image" | "link" | "select";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  /** Text that differs per language. Images, links and selects are shared. */
  localized?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
}

export interface ListDef {
  key: string;
  label: string;
  itemLabel: string;
  fields: FieldDef[];
  min?: number;
  max?: number;
}

export interface SectionDef {
  type: string;
  label: string;
  description: string;
  fields: FieldDef[];
  list?: ListDef;
}

export type FieldValue = string | Localized;
export type ItemValue = Record<string, FieldValue>;

export interface Section {
  id: string;
  type: string;
  hidden?: boolean;
  data: Record<string, FieldValue | ItemValue[]>;
}

export interface PageContent {
  seo: { title?: Localized; description?: Localized; image?: string };
  sections: Section[];
}

const T = (key: string, label: string, hint?: string): FieldDef => ({ key, label, kind: "text", localized: true, hint });
const P = (key: string, label: string, hint?: string): FieldDef => ({ key, label, kind: "textarea", localized: true, hint });
const IMG = (key = "image", label = "Image", hint?: string): FieldDef => ({ key, label, kind: "image", hint });
const LINK = (key: string, label: string, hint?: string): FieldDef => ({ key, label, kind: "link", hint });

export const SECTION_TYPES: SectionDef[] = [
  {
    type: "hero", label: "Hero", description: "Big opening banner with title, intro text, button and image.",
    fields: [T("eyebrow", "Small label above the title"), T("title", "Title"), P("intro", "Intro"), T("cta_label", "Button text"),
      LINK("cta_link", "Button link", "e.g. /collection or #visit"), IMG("image", "Background or poster image"), T("image_alt", "Image description", "For screen readers and search engines")],
  },
  {
    type: "disassembly", label: "Watch disassembly", description: "The pinned scroll scene. One caption per part as the watch comes apart.",
    fields: [T("heading", "Heading"), IMG("image", "Exploded view (phones and reduced motion)"), T("image_alt", "Image description")],
    list: { key: "steps", label: "Parts", itemLabel: "Part", min: 1, max: 12, fields: [T("part", "Part name"), P("caption", "Caption")] },
  },
  {
    type: "specs", label: "Specs strip", description: "Short row of key numbers that count up on scroll.",
    fields: [],
    list: { key: "items", label: "Numbers", itemLabel: "Number", min: 1, max: 6, fields: [{ key: "value", label: "Value", kind: "text", hint: "e.g. 42 mm" }, T("label", "Label")] },
  },
  {
    type: "collection_teaser", label: "Collection teaser", description: "Scrolling row of all watches with a link to the collection.",
    fields: [T("heading", "Heading"), P("body", "Text"), T("link_label", "Link text")],
  },
  {
    type: "rich_text", label: "Text", description: "Heading and paragraphs. Leave a blank line between paragraphs.",
    fields: [T("eyebrow", "Small label"), T("heading", "Heading"), P("body", "Text")],
  },
  {
    type: "image_text", label: "Image and text", description: "Image beside a heading and text.",
    fields: [T("heading", "Heading"), P("body", "Text"), IMG(), T("image_alt", "Image description"),
      { key: "image_side", label: "Image side", kind: "select", options: [{ value: "left", label: "Left" }, { value: "right", label: "Right" }] },
      T("cta_label", "Button text"), LINK("cta_link", "Button link")],
  },
  {
    type: "chapters", label: "Chapters", description: "Numbered chapters, as on the Anatomy page.",
    fields: [T("heading", "Heading")],
    list: { key: "chapters", label: "Chapters", itemLabel: "Chapter", min: 1, max: 12, fields: [T("title", "Title"), P("body", "Text"), IMG("image", "Image (optional)")] },
  },
  {
    type: "gallery", label: "Gallery", description: "A row of images with captions.",
    fields: [T("heading", "Heading")],
    list: { key: "images", label: "Images", itemLabel: "Image", min: 1, max: 12, fields: [IMG(), T("alt", "Image description"), T("caption", "Caption")] },
  },
  {
    type: "cta_banner", label: "Call to action", description: "Banner inviting visitors to act, e.g. request a viewing.",
    fields: [T("heading", "Heading"), P("body", "Text"), T("button_label", "Button text"), LINK("button_link", "Button link"), IMG("image", "Background image (optional)")],
  },
  {
    type: "visit", label: "Request a viewing", description: "Heading and text above the viewing request form.",
    fields: [T("heading", "Heading"), P("body", "Text"), T("button_label", "Submit button text"), T("success", "Thank-you message"), IMG("image", "Side image (optional)")],
  },
  {
    type: "announcement", label: "Announcement bar", description: "Thin bar at the very top of every page.",
    fields: [T("text", "Text"), LINK("link", "Link (optional)")],
  },
  {
    type: "footer", label: "Footer", description: "Brand line, newsletter text and copyright.",
    fields: [T("brand_line", "Brand line"), T("newsletter_heading", "Newsletter heading"), T("newsletter_placeholder", "Email field placeholder"), T("copyright", "Copyright", "Use {year} for the current year")],
    list: { key: "social", label: "Social links", itemLabel: "Link", max: 6, fields: [{ key: "label", label: "Name", kind: "text", hint: "e.g. Instagram" }, LINK("url", "Address")] },
  },
];

export const sectionDef = (type: string) => SECTION_TYPES.find((s) => s.type === type);

export const PAGES: { slug: string; title: string; path: string; description: string }[] = [
  { slug: "home", title: "Home", path: "/", description: "Hero, disassembly scene, specs, collection teaser, viewing form" },
  { slug: "anatomy", title: "Anatomy of a Watch", path: "/anatomy", description: "Intro and six chapters" },
  { slug: "collection", title: "Collection", path: "/collection", description: "Intro above the watch grid" },
  { slug: "pricing", title: "Pricing", path: "/pricing", description: "Intro above the price table and a call to action" },
  { slug: "about", title: "About", path: "/about", description: "The brand story" },
  { slug: "legal", title: "Privacy and terms", path: "/legal", description: "Privacy policy and terms" },
  { slug: "global", title: "Header and footer", path: "every page", description: "Announcement bar and footer, shown on every page" },
];

let n = 0;
const sid = (type: string) => `${type}-${++n}`;
const en = (s: string): Localized => ({ en: s, ar: "" });
const sec = (type: string, data: Section["data"]): Section => ({ id: sid(type), type, data });

/** Starter content, written for United WatchMart, so a fresh page is never blank. */
export function starterContent(slug: string): PageContent {
  n = 0;
  const seo = (title: string, description: string) => ({ title: en(title), description: en(description) });
  switch (slug) {
    case "home":
      return {
        seo: seo("United WatchMart · Automatic watches, made to be kept", "Automatic watches with sapphire crystals, 72-hour power reserves and a two-year warranty. Visit our boutiques in Dhaka and Chattogram."),
        sections: [
          sec("hero", { eyebrow: en("Heritage 42"), title: en("Time, taken apart."), intro: en("Scroll to see every part that makes a United WatchMart automatic run for 72 hours on a single wind."), cta_label: en("Explore the collection"), cta_link: "/collection", image: "", image_alt: en("Heritage 42 with navy sunburst dial") }),
          sec("disassembly", {
            heading: en("Seven layers, one heartbeat"), image: "", image_alt: en("Exploded view of the Heritage 42"),
            steps: [["Sapphire crystal", "Domed, anti-reflective on both sides, nearly as hard as diamond."], ["Bezel", "18k gold, hand polished, set by hand."], ["Hands", "Applied lume, balanced to a hundredth of a gram."], ["Dial", "Navy sunburst, twelve applied indices."], ["Movement", "Automatic, 28,800 beats an hour, 72-hour reserve."], ["Case back", "Exhibition sapphire, screwed down to 100 m."], ["Bracelet", "Steel and gold links with a fold-over clasp."]]
              .map(([part, caption]) => ({ part: en(part), caption: en(caption) })),
          }),
          sec("specs", { items: [["42 mm", "Case"], ["28,800", "Beats per hour"], ["100 m", "Water resistance"], ["72 h", "Power reserve"]].map(([value, label]) => ({ value, label: en(label) })) }),
          sec("collection_teaser", { heading: en("The collection"), body: en("Nine automatics on bracelet, leather and rubber."), link_label: en("See all watches") }),
          sec("visit", { heading: en("Request a private viewing"), body: en("Tell us which watch you'd like to see. A boutique advisor will confirm a time within one working day."), button_label: en("Send request"), success: en("Thank you. We'll be in touch within one working day."), image: "" }),
        ],
      };
    case "anatomy":
      return {
        seo: seo("Anatomy of a Watch · United WatchMart", "Six chapters on what sits inside an automatic watch, from crystal to bracelet."),
        sections: [
          sec("rich_text", { eyebrow: en("Anatomy"), heading: en("What makes it tick"), body: en("An automatic watch is a small machine of more than 150 parts. These six chapters follow it from the crystal you look through to the bracelet on your wrist.") }),
          sec("chapters", {
            heading: en("Six chapters"),
            chapters: [["The crystal", "Sapphire protects the dial and is cut to stay clear for a lifetime."], ["The bezel", "A ring of gold that frames the dial and protects the crystal's edge."], ["The dial and hands", "Where time is read: applied indices, lume and balance."], ["The movement", "The rotor winds the mainspring as you move; the balance wheel keeps time."], ["The case", "Steel machined from a solid block, sealed for 100 metres."], ["The bracelet", "Links that flex with the wrist and a clasp that stays shut."]]
              .map(([title, body]) => ({ title: en(title), body: en(body), image: "" })),
          }),
        ],
      };
    case "collection":
      return {
        seo: seo("The collection · United WatchMart", "Browse nine automatic watches. Filter by bracelet, leather or rubber strap."),
        sections: [sec("rich_text", { eyebrow: en("Collection"), heading: en("Nine automatics"), body: en("Every watch is assembled and tested in our workshop, and comes with a two-year warranty.") })],
      };
    case "pricing":
      return {
        seo: seo("Pricing · United WatchMart", "Prices for every watch in the collection, with a two-year warranty included."),
        sections: [
          sec("rich_text", { eyebrow: en("Pricing"), heading: en("Clear prices, no surprises"), body: en("All prices include a two-year warranty and a first service check at twelve months.") }),
          sec("cta_banner", { heading: en("Want to see one in person?"), body: en("Book a private viewing at any of our boutiques."), button_label: en("Request a viewing"), button_link: "/#visit", image: "" }),
        ],
      };
    case "about":
      return {
        seo: seo("About · United WatchMart", "The story behind United WatchMart and the people who build and service our watches."),
        sections: [
          sec("hero", { eyebrow: en("About"), title: en("Made to be kept"), intro: en("We started United WatchMart to sell watches that last longer than the people who buy them."), cta_label: en(""), cta_link: "", image: "", image_alt: en("") }),
          sec("image_text", { heading: en("Our workshop"), body: en("Every watch is regulated, pressure tested and checked again before it leaves us. The same technicians service it for the rest of its life."), image: "", image_alt: en("Technician at the bench"), image_side: "left", cta_label: en(""), cta_link: "" }),
        ],
      };
    case "legal":
      return {
        seo: seo("Privacy and terms · United WatchMart", "How we handle your data and the terms of sale."),
        sections: [
          sec("rich_text", { eyebrow: en("Legal"), heading: en("Privacy"), body: en("We only use your details to answer your enquiry and, if you agree, to tell you about new watches. We never sell your data.") }),
          sec("rich_text", { eyebrow: en(""), heading: en("Terms of sale"), body: en("Prices are in US dollars and include the two-year warranty. A viewing request is not an order.") }),
        ],
      };
    case "global":
      return {
        seo: {},
        sections: [
          { ...sec("announcement", { text: en("Free servicing check with every watch bought this month."), link: "/collection" }), hidden: true },
          sec("footer", { brand_line: en("United WatchMart · Automatic watches, made to be kept."), newsletter_heading: en("New arrivals, a few times a year"), newsletter_placeholder: en("Your email"), copyright: en("© {year} United WatchMart"), social: [{ label: "Instagram", url: "https://instagram.com/" }] }),
        ],
      };
    default:
      return { seo: {}, sections: [] };
  }
}

/** A blank section of a type, with empty values for every field. */
export function blankSection(type: string, id: string): Section {
  const def = sectionDef(type)!;
  const empty = (f: FieldDef): FieldValue => (f.localized ? { en: "", ar: "" } : f.kind === "select" ? f.options?.[0]?.value ?? "" : "");
  const data: Section["data"] = Object.fromEntries(def.fields.map((f) => [f.key, empty(f)]));
  if (def.list) data[def.list.key] = Array.from({ length: def.list.min ?? 0 }, () => Object.fromEntries(def.list!.fields.map((f) => [f.key, empty(f)])));
  return { id, type, data };
}

/** Resolves a page to one language for the website. Arabic falls back to English per field. */
export function resolvePage(content: PageContent, locale: Locale) {
  const pick = (v: unknown): unknown => {
    if (v && typeof v === "object" && !Array.isArray(v) && ("en" in v || "ar" in v)) {
      const l = v as Localized;
      return (locale === "ar" ? l.ar?.trim() || l.en : l.en) ?? "";
    }
    if (Array.isArray(v)) return v.map((item) => Object.fromEntries(Object.entries(item as object).map(([k, x]) => [k, pick(x)])));
    return v;
  };
  return {
    seo: { title: pick(content.seo.title ?? { en: "" }), description: pick(content.seo.description ?? { en: "" }), image: content.seo.image ?? "" },
    sections: content.sections.filter((s) => !s.hidden).map((s) => ({
      id: s.id, type: s.type, ...Object.fromEntries(Object.entries(s.data).map(([k, v]) => [k, pick(v)])),
    })),
  };
}
