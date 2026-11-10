import { z } from "zod";
import { products } from "@/data/products";

/**
 * Enquiry schema shared by the form (client) and the server action.
 * Error messages are keys under `form.errors` in messages/*.json.
 */

const slugs = products.map((p) => p.slug) as [string, ...string[]];
const DAY = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD from today (one day of slack for time zones) up to a year ahead. */
export function isBookableDate(value: string, now = Date.now()) {
  const t = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(t)) return false;
  const today = Math.floor(now / DAY) * DAY;
  return t >= today - DAY && t <= today + 365 * DAY;
}

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "nameShort").max(80, "tooLong"),
  email: z.string().trim().max(160, "tooLong").pipe(z.email("email")),
  phone: z
    .string()
    .trim()
    .max(30, "tooLong")
    .regex(/^[+()\d\s.-]*$/, "phone")
    .optional(),
  watch: z.enum(slugs, { error: "watch" }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date").refine((v) => isBookableDate(v), "dateRange"),
  message: z.string().trim().max(1000, "tooLong").optional(),
  /** Honeypot: real people never see or fill this. */
  website: z.string().max(0, "spam").optional(),
});

export type EnquiryInput = z.input<typeof enquirySchema>;
export type EnquiryValues = z.output<typeof enquirySchema>;
export type EnquiryField = keyof EnquiryInput;

/** What the server receives: the form plus the Turnstile token and page language. */
export const enquiryRequestSchema = enquirySchema.extend({
  token: z.string().min(1, "captcha"),
  locale: z.enum(["en"]),
});
export type EnquiryRequest = z.input<typeof enquiryRequestSchema>;

export type EnquiryResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "captcha" | "rate" | "server"; fields?: Partial<Record<EnquiryField, string>> };
