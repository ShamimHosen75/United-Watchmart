/**
 * Simple back-office modules described as data. One definition drives the list page, the edit form,
 * validation and the database calls (see lib/data/resources.ts and app/(admin)/[resource]).
 * Shared by server and client code, so keep it free of server-only imports.
 */

export type FieldType =
  | "text" | "textarea" | "number" | "money" | "select" | "checkbox" | "date" | "tags" | "image" | "url" | "email" | "relation";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  /** For relation fields: the module or table the id points to. */
  relation?: "brands" | "categories" | "shipping-zones" | "products";
  /** Which column of the related row is stored. Defaults to "id"; reviews store the watch slug. */
  relationKey?: "id" | "slug";
  wide?: boolean;
  default?: string | number | boolean;
  /** Turned to upper case before saving (coupon codes). */
  upper?: boolean;
  /** Shorter label for list column headers. */
  short?: string;
  /** A select whose values are stored as numbers. */
  numeric?: boolean;
}

export interface ResourceDef {
  key: string;
  table: string;
  title: string;
  singular: string;
  description: string;
  fields: FieldDef[];
  /** Field names shown as list columns after the title column. */
  columns: string[];
  titleField: string;
  subtitleField?: string;
  searchFields: string[];
  sort: { field: string; ascending: boolean };
  /** Field holding a slug that is filled from the title when left empty. */
  slugField?: string;
  /** Roles allowed to create and edit. Everyone on staff can read. */
  editRoles: string[];
  /** Records are created by the website, not by hand. */
  noCreate?: boolean;
  statusField?: string;
}

const MANAGERS = ["owner", "admin", "manager"];
const STAFF = ["owner", "admin", "manager", "sales", "technician"];
const opts = (...values: string[]) => values.map((v) => ({ value: v, label: v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) }));

export const resources: Record<string, ResourceDef> = {
  brands: {
    key: "brands", table: "brands", title: "Watch brands", singular: "brand",
    description: "The watch makers you sell. Each watch in the catalogue belongs to one brand.",
    titleField: "name", subtitleField: "country", searchFields: ["name", "country"], slugField: "slug",
    sort: { field: "sort_order", ascending: true }, editRoles: MANAGERS,
    columns: ["founded_year", "is_featured", "is_active"],
    fields: [
      { name: "name", label: "Brand name", type: "text", required: true },
      { name: "slug", label: "URL slug", type: "text", hint: "Left empty, it is made from the name." },
      { name: "country", label: "Country of origin", type: "text" },
      { name: "founded_year", label: "Founded", type: "number", hint: "Year, e.g. 1905" },
      { name: "website", label: "Official website", type: "url" },
      { name: "logo_url", label: "Logo", type: "image", hint: "Paste an image URL, or copy one from Media." },
      { name: "description", label: "About the brand", type: "textarea", wide: true },
      { name: "sort_order", label: "Sort order", type: "number", default: 0, hint: "Lower numbers come first on the website." },
      { name: "is_featured", label: "Feature on the home page", short: "Featured", type: "checkbox", default: false },
      { name: "is_active", label: "Show on the website", short: "On website", type: "checkbox", default: true },
    ],
  },
  categories: {
    key: "categories", table: "collections", title: "Categories", singular: "category",
    description: "Groups such as Chronograph or Dress watches. Shoppers filter by them on the website.",
    titleField: "name", searchFields: ["name", "description"], slugField: "slug",
    sort: { field: "sort_order", ascending: true }, editRoles: MANAGERS,
    columns: ["sort_order", "is_active"],
    fields: [
      { name: "name", label: "Category name", type: "text", required: true },
      { name: "slug", label: "URL slug", type: "text", hint: "Left empty, it is made from the name." },
      { name: "image_url", label: "Cover image", type: "image", hint: "Paste an image URL, or copy one from Media." },
      { name: "sort_order", label: "Sort order", type: "number", default: 0 },
      { name: "description", label: "Description", type: "textarea", wide: true },
      { name: "is_active", label: "Show on the website", short: "On website", type: "checkbox", default: true },
    ],
  },
  "checkout-leads": {
    key: "checkout-leads", table: "checkout_leads", title: "Checkout leads", singular: "lead",
    description: "Shoppers who started checkout on the website but did not finish. Follow up to win the sale.",
    titleField: "name", subtitleField: "email", searchFields: ["name", "email", "phone", "items"], statusField: "status",
    sort: { field: "created_at", ascending: false }, editRoles: STAFF,
    columns: ["phone", "cart_total", "step", "status", "created_at"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "city", label: "City", type: "text" },
      { name: "items", label: "Cart", type: "textarea", wide: true, hint: "One watch per line." },
      { name: "cart_total", label: "Cart value", short: "Cart", type: "money", default: 0 },
      { name: "step", label: "Left at", type: "select", options: opts("cart", "details", "shipping", "payment"), default: "details" },
      { name: "status", label: "Status", type: "select", options: opts("new", "contacted", "recovered", "lost"), default: "new" },
      { name: "notes", label: "Follow-up notes", type: "textarea", wide: true },
    ],
  },
  slider: {
    key: "slider", table: "site_slides", title: "Home slider", singular: "slide",
    description: "The large rotating banners at the top of the website's home page.",
    titleField: "title", subtitleField: "subtitle", searchFields: ["title", "subtitle"],
    sort: { field: "sort_order", ascending: true }, editRoles: MANAGERS,
    columns: ["cta_label", "sort_order", "is_active"],
    fields: [
      { name: "title", label: "Heading", type: "text", required: true },
      { name: "eyebrow", label: "Small line above the heading", type: "text" },
      { name: "subtitle", label: "Text under the heading", type: "textarea", wide: true },
      { name: "image_url", label: "Image", type: "image", required: true, hint: "Wide image, at least 1920 × 900 px." },
      { name: "cta_label", label: "Button text", short: "Button", type: "text", default: "Discover" },
      { name: "cta_href", label: "Button link", type: "text", hint: "e.g. /watches/heritage-42", default: "/watches" },
      { name: "sort_order", label: "Order", type: "number", default: 0 },
      { name: "is_active", label: "Show on the website", short: "On website", type: "checkbox", default: true },
    ],
  },
  reviews: {
    key: "reviews", table: "reviews", title: "Reviews", singular: "review",
    description: "Customer reviews shown on watch pages. Approve a review before it appears; featured ones show on the home page.",
    titleField: "author_name", subtitleField: "title", searchFields: ["author_name", "title", "body", "slug"], statusField: "status",
    sort: { field: "created_at", ascending: false }, editRoles: MANAGERS,
    columns: ["slug", "rating", "verified", "featured", "status", "created_at"],
    fields: [
      { name: "author_name", label: "Customer name", type: "text", required: true },
      { name: "author_city", label: "City", type: "text" },
      { name: "slug", label: "Watch", type: "relation", relation: "products", relationKey: "slug", required: true },
      { name: "rating", label: "Stars", type: "select", options: ["5", "4", "3", "2", "1"].map((v) => ({ value: v, label: `${v} ★` })), default: "5", numeric: true },
      { name: "title", label: "Title", type: "text", wide: true },
      { name: "body", label: "Review", type: "textarea", required: true, wide: true },
      { name: "status", label: "Status", type: "select", options: opts("pending", "approved", "rejected"), default: "pending" },
      { name: "verified", label: "Verified buyer", type: "checkbox", default: false },
      { name: "featured", label: "Feature on the home page", short: "Featured", type: "checkbox", default: false },
    ],
  },
  "try-on": {
    key: "try-on", table: "tryon_settings", title: "Wrist try-on", singular: "try-on watch",
    description: "Lets shoppers see a watch on their own wrist through the phone camera. Add a face-on cut-out photo for each watch; the case size sets the scale.",
    titleField: "product_id", searchFields: ["notes"],
    sort: { field: "created_at", ascending: false }, editRoles: MANAGERS,
    columns: ["case_mm", "lug_to_lug_mm", "is_enabled"],
    fields: [
      { name: "product_id", label: "Watch", type: "relation", relation: "products", required: true },
      { name: "overlay_url", label: "Cut-out photo", type: "image", required: true, hint: "Transparent PNG, watch seen straight from above, strap vertical." },
      { name: "case_mm", label: "Case diameter (mm)", short: "Case mm", type: "number", hint: "Used to size the watch on the wrist." },
      { name: "lug_to_lug_mm", label: "Lug to lug (mm)", short: "Lug to lug", type: "number" },
      { name: "scale_pct", label: "Fine-tune size (%)", type: "number", default: 100 },
      { name: "notes", label: "Notes", type: "textarea", wide: true },
      { name: "is_enabled", label: "Show the try-on button for this watch", short: "Enabled", type: "checkbox", default: true },
    ],
  },
  coupons: {
    key: "coupons", table: "coupons", title: "Coupons", singular: "coupon",
    description: "Discount codes shoppers enter at checkout.",
    titleField: "code", subtitleField: "description", searchFields: ["code", "description"],
    sort: { field: "created_at", ascending: false }, editRoles: MANAGERS,
    columns: ["discount_type", "value", "used_count", "ends_on", "is_active"],
    fields: [
      { name: "code", label: "Code", type: "text", required: true, upper: true, hint: "Letters and numbers, e.g. EID2026" },
      { name: "description", label: "Internal note", type: "text" },
      { name: "discount_type", label: "Discount type", short: "Type", type: "select", options: [{ value: "percent", label: "Percent off" }, { value: "fixed", label: "Fixed amount off" }, { value: "free_shipping", label: "Free shipping" }], default: "percent" },
      { name: "value", label: "Value", type: "number", default: 10, hint: "Percent or amount, depending on the type." },
      { name: "min_order", label: "Minimum order", type: "money", default: 0 },
      { name: "max_uses", label: "Usage limit", type: "number", hint: "Empty means unlimited." },
      { name: "used_count", label: "Times used", short: "Used", type: "number", default: 0 },
      { name: "brand_id", label: "Only for brand", type: "relation", relation: "brands", hint: "Leave empty for all brands." },
      { name: "starts_on", label: "Starts", type: "date" },
      { name: "ends_on", label: "Ends", type: "date" },
      { name: "is_active", label: "Active", type: "checkbox", default: true },
    ],
  },
  "shipping-zones": {
    key: "shipping-zones", table: "shipping_zones", title: "Shipping zones", singular: "zone",
    description: "Areas you deliver to. Each zone has its own shipping methods and prices.",
    titleField: "name", searchFields: ["name"],
    sort: { field: "sort_order", ascending: true }, editRoles: MANAGERS,
    columns: ["regions", "sort_order", "is_active"],
    fields: [
      { name: "name", label: "Zone name", type: "text", required: true },
      { name: "regions", label: "Cities or countries", short: "Covers", type: "tags", wide: true, hint: "Comma separated, e.g. Dhaka, Gazipur, Narayanganj" },
      { name: "sort_order", label: "Order", type: "number", default: 0 },
      { name: "is_active", label: "Active", type: "checkbox", default: true },
    ],
  },
  "shipping-methods": {
    key: "shipping-methods", table: "shipping_methods", title: "Shipping methods", singular: "method",
    description: "How a watch reaches the customer in each zone, and what it costs.",
    titleField: "name", subtitleField: "carrier", searchFields: ["name", "carrier"],
    sort: { field: "rate", ascending: true }, editRoles: MANAGERS,
    columns: ["zone_id", "rate", "free_over", "min_days", "max_days", "is_active"],
    fields: [
      { name: "name", label: "Method name", type: "text", required: true, hint: "e.g. Insured courier" },
      { name: "zone_id", label: "Zone", type: "relation", relation: "shipping-zones", required: true },
      { name: "carrier", label: "Carrier", type: "text" },
      { name: "rate", label: "Price", type: "money", default: 0 },
      { name: "free_over", label: "Free above order value", short: "Free over", type: "money", hint: "Empty means never free." },
      { name: "min_days", label: "Delivery from (days)", short: "From (days)", type: "number" },
      { name: "max_days", label: "Delivery to (days)", short: "To (days)", type: "number" },
      { name: "is_insured", label: "Insured and signed for", type: "checkbox", default: true },
      { name: "is_active", label: "Active", type: "checkbox", default: true },
    ],
  },
};

export const getResource = (key: string): ResourceDef | null => (Object.hasOwn(resources, key) ? resources[key] : null);
