/**
 * Sample data used in demo mode (no Supabase keys) and to generate supabase/seed.sql.
 * Times are stored as "minutes ago" so the data always looks recent.
 */
import type {
  Branch, Brand, Collection, Customer, ItemCondition, OrderChannel, OrderStatus, PaymentMethod, Product, Profile,
  RepairStatus, StockStatus, StrapType, MovementType, ViewingStatus,
} from "./types";

const uuid = (prefix: number, n: number) =>
  `00000000-0000-4000-8${prefix.toString().padStart(3, "0")}-${n.toString().padStart(12, "0")}`;

/** Small deterministic random generator so demo data is stable between restarts. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(42);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

export const branches: Branch[] = [
  { id: uuid(1, 1), code: "GUL", name: "Gulshan Flagship", city: "Dhaka", address: "Gulshan Avenue", phone: "+880 1700 000001", email: "gul@unitedwatchmart.test", opening_hours: "Sat–Thu 11:00–21:00", is_active: true },
  { id: uuid(1, 2), code: "BAN", name: "Banani Boutique", city: "Dhaka", address: "Road 11, Banani", phone: "+880 1700 000002", email: "ban@unitedwatchmart.test", opening_hours: "Sat–Thu 11:00–20:00", is_active: true },
  { id: uuid(1, 3), code: "CTG", name: "Chattogram Salon", city: "Chattogram", address: "GEC Circle", phone: "+880 1700 000003", email: "ctg@unitedwatchmart.test", opening_hours: "Sat–Thu 12:00–20:00", is_active: true },
];

export const staff: Profile[] = [
  { id: uuid(2, 1), full_name: "Demo Owner", email: "owner@unitedwatchmart.test", phone: null, role: "owner", branch_id: branches[0].id, is_active: true },
  { id: uuid(2, 2), full_name: "Nadia Rahman", email: "nadia@unitedwatchmart.test", phone: null, role: "manager", branch_id: branches[0].id, is_active: true },
  { id: uuid(2, 3), full_name: "Arif Hossain", email: "arif@unitedwatchmart.test", phone: null, role: "sales", branch_id: branches[1].id, is_active: true },
  { id: uuid(2, 4), full_name: "Tanvir Ahmed", email: "tanvir@unitedwatchmart.test", phone: null, role: "technician", branch_id: branches[0].id, is_active: true },
  { id: uuid(2, 5), full_name: "Sadia Islam", email: "sadia@unitedwatchmart.test", phone: null, role: "sales", branch_id: null, is_active: false },
];

export const brands: Brand[] = [
  { id: uuid(3, 1), name: "United WatchMart", slug: "united-watchmart" },
];

export const collections: Collection[] = [
  { id: uuid(4, 1), name: "Heritage", slug: "heritage" },
  { id: uuid(4, 2), name: "Chronograph", slug: "chronograph" },
  { id: uuid(4, 3), name: "Skeleton", slug: "skeleton" },
  { id: uuid(4, 4), name: "Tourbillon", slug: "tourbillon" },
];

type Seed = [
  slug: string, ref: string, name: string, collection: number, caseMm: number, caseMaterial: string, bezel: string,
  dial: string, movement: MovementType, calibre: string, reserve: number, strap: StrapType, strapDetail: string,
  water: number, price: number,
];
const productSeeds: Seed[] = [
  ["heritage-42", "UW-H42-NV", "Heritage 42", 0, 42, "Stainless steel", "18k gold", "Navy sunburst", "automatic", "Automatic 28,800 vph", 72, "bracelet", "Steel and gold bracelet", 100, 4900],
  ["octane-gt", "UW-OGT-BK", "Octane GT", 1, 43, "Stainless steel", "Rose-gold octagonal", "Black waffle", "automatic", "Automatic chronograph", 60, "rubber", "Black rubber strap", 150, 6200],
  ["midnight-chrono", "UW-MCH-NV", "Midnight Chrono", 1, 44, "Rose gold", "Ceramic tachymeter", "Navy", "automatic", "Automatic chronograph", 56, "leather", "Brown alligator leather", 100, 7400],
  ["aurelian", "UW-AUR-NS", "Aurelian", 2, 43, "Stainless steel", "Yellow gold", "Navy semi-skeleton", "automatic", "Open gear train", 65, "bracelet", "Steel bracelet", 100, 8900],
  ["verdant", "UW-VRD-GR", "Verdant", 1, 44, "Rose gold", "Green ceramic", "Green textured", "automatic", "Automatic chronograph", 60, "bracelet", "Rose-gold bracelet", 100, 9800],
  ["tachy-skeleton", "UW-TSK-SK", "Tachy Skeleton", 2, 44, "Stainless steel", "Ceramic tachymeter", "Skeleton", "automatic", "Skeleton chronograph", 60, "bracelet", "Steel bracelet", 100, 12600],
  ["onyx-skeleton", "UW-ONX-SK", "Onyx Skeleton", 3, 43, "Black ceramic", "Screw-set", "Skeleton", "manual", "Flying tourbillon", 72, "bracelet", "Ceramic bracelet", 100, 18900],
  ["maestro-tourbillon", "UW-MTB-SK", "Maestro Tourbillon", 3, 44, "Rose gold", "Ceramic", "Skeleton", "manual", "Flying tourbillon", 80, "leather", "Black leather", 50, 24500],
  ["blue-tourbillon", "UW-BTB-NV", "Blue Tourbillon", 3, 44, "Rose gold", "Navy", "Open-worked", "manual", "Flying tourbillon", 80, "bracelet", "Rose-gold bracelet", 50, 28900],
];

const minutesAgoIso = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const products: Product[] = productSeeds.map((s, i) => {
  const [slug, ref, name, col, caseMm, caseMaterial, bezel, dial, movement, calibre, reserve, strap, strapDetail, water, price] = s;
  const created = minutesAgoIso((120 - i) * 24 * 60);
  return {
    id: uuid(5, i + 1), sku: `UW-${String(i + 1).padStart(4, "0")}`, ref_number: ref, slug, name,
    tagline: `${caseMm} mm ${caseMaterial.toLowerCase()} with ${dial.toLowerCase()} dial`,
    description: null, brand_id: brands[0].id, collection_id: collections[col].id,
    status: "active", is_published: true, case_mm: caseMm, case_material: caseMaterial, bezel, dial,
    movement, calibre, power_reserve_h: reserve, water_resistance_m: water, strap, strap_detail: strapDetail,
    gender: "men", cost_price: Math.round(price * 0.58), price, compare_at_price: null, warranty_months: 24,
    images: [], created_at: created, updated_at: created,
  };
});

export interface SeedStock {
  id: string; product_id: string; branch_id: string; serial_number: string; status: StockStatus;
  condition: ItemCondition; cost_price: number; has_box: boolean; has_papers: boolean;
  location_note: string | null; received_ago: number; sold_ago: number | null; notes: string | null;
}
export interface SeedOrder {
  id: string; number: string; customer_id: string; branch_id: string; staff_id: string; channel: OrderChannel;
  status: OrderStatus; product_id: string; stock_item_id: string; unit_price: number; discount: number; placed_ago: number;
  method: PaymentMethod;
}
/** Pending sample orders are half paid (a deposit). */
export const seedPaid = (o: SeedOrder) => (o.status === "pending" ? Math.round((o.unit_price - o.discount) / 2) : o.unit_price - o.discount);

export const customers: Customer[] = [
  "Rafiq Chowdhury", "Sabrina Karim", "Imran Kabir", "Farhana Akter", "Zahid Hasan", "Nusrat Jahan",
  "Kamal Uddin", "Tahmina Sultana", "Shakil Ahmed", "Mehnaz Islam", "Rashed Khan", "Laila Noor",
].map((full_name, i) => ({
  id: uuid(6, i + 1), full_name,
  email: `${full_name.split(" ")[0].toLowerCase()}@example.com`,
  phone: `+880 18${String(10000000 + i * 734521).slice(0, 8)}`,
  address: null, city: i % 4 === 3 ? "Chattogram" : "Dhaka", country: "Bangladesh",
  birthday: i % 3 === 0 ? `19${80 + i}-0${1 + (i % 9)}-1${i % 9}` : null,
  wrist_size_mm: i % 2 === 0 ? 170 + i : null,
  preferred_branch_id: branches[i % 4 === 3 ? 2 : i % 2].id,
  is_vip: i % 5 === 0, marketing_opt_in: i % 3 !== 1,
  tags: i % 5 === 0 ? ["collector"] : i % 4 === 1 ? ["gift buyer"] : [],
  notes: i % 5 === 0 ? "Prefers private viewings after 6 pm." : null,
  created_at: minutesAgoIso((90 - i * 6) * 24 * 60),
}));

// Physical watches: a few units of each model spread across branches, some already sold.
export const stockSeeds: SeedStock[] = [];
export const orderSeeds: SeedOrder[] = [];
let serial = 100231;
products.forEach((p, pi) => {
  const units = 7 - Math.floor(pi / 2);
  for (let u = 0; u < units; u++) {
    const id = uuid(7, stockSeeds.length + 1);
    const branch = branches[(pi + u) % branches.length];
    const received = 30 * 24 * 60 + Math.floor(rand() * 60 * 24 * 60);
    stockSeeds.push({
      id, product_id: p.id, branch_id: branch.id, serial_number: `${p.ref_number.slice(3, 6)}${serial++}`,
      status: "in_stock", condition: u === units - 1 && pi % 3 === 0 ? "display" : "new",
      cost_price: p.cost_price, has_box: true, has_papers: true,
      location_note: `Showcase ${1 + ((pi + u) % 6)}`, received_ago: received, sold_ago: null, notes: null,
    });
  }
});

// Mark some units sold and create matching orders over the last 30 days.
const sellable = stockSeeds.filter((_, i) => i % 3 === 0 || i % 7 === 2);
sellable.forEach((s, i) => {
  const product = products.find((p) => p.id === s.product_id)!;
  const placed = Math.floor(rand() * 30 * 24 * 60) + (i < 2 ? 0 : 60);
  const placedAgo = i < 2 ? Math.floor(rand() * 240) : placed; // a couple of sales today
  s.status = "sold";
  s.sold_ago = placedAgo;
  const statuses: OrderStatus[] = ["completed", "completed", "completed", "completed", "pending"];
  orderSeeds.push({
    id: uuid(8, i + 1), number: `ORD-${String(1001 + i).padStart(6, "0")}`, customer_id: pick(customers).id,
    branch_id: s.branch_id, staff_id: pick(staff.slice(1, 3)).id,
    channel: pick<OrderChannel>(["store", "store", "store", "online", "whatsapp"]), status: pick(statuses),
    product_id: product.id, stock_item_id: s.id, unit_price: product.price,
    discount: rand() < 0.3 ? Math.round(product.price * 0.05) : 0, placed_ago: placedAgo,
    method: pick<PaymentMethod>(["card", "card", "bank_transfer", "cash", "mobile_banking"]),
  });
});
// A few non-sold statuses for variety
stockSeeds.filter((s) => s.status === "in_stock").forEach((s, i) => {
  if (i % 11 === 4) s.status = "reserved";
  if (i % 13 === 6) s.status = "in_repair";
});

export const viewingSeeds: { id: string; customer: number; product: number; branch: number; status: ViewingStatus; in_hours: number; created_ago: number; source: string; message: string | null }[] = [
  { id: uuid(9, 1), customer: 1, product: 8, branch: 0, status: "new", in_hours: 26, created_ago: 50, source: "website", message: "Would love to see it on the wrist before my anniversary." },
  { id: uuid(9, 2), customer: 4, product: 4, branch: 1, status: "new", in_hours: 50, created_ago: 300, source: "website", message: null },
  { id: uuid(9, 3), customer: 7, product: 6, branch: 0, status: "confirmed", in_hours: 5, created_ago: 2000, source: "phone", message: null },
  { id: uuid(9, 4), customer: 9, product: 2, branch: 2, status: "confirmed", in_hours: 74, created_ago: 3000, source: "whatsapp", message: "Is the leather strap available in black?" },
  { id: uuid(9, 5), customer: 2, product: 0, branch: 0, status: "completed", in_hours: -48, created_ago: 6000, source: "website", message: null },
];

export const repairSeeds: { id: string; number: string; customer: number; branch: number; brand: string; model: string; serial: string; issue: string; intake: string | null; diagnosis: string | null; status: RepairStatus; warranty: boolean; estimate: number | null; promised_in_days: number; received_ago: number }[] = [
  { id: uuid(10, 1), number: "SRV-000101", customer: 3, branch: 0, brand: "Omega", model: "Seamaster 300", serial: "81234567", issue: "Full service, losing 20 s/day", intake: "Light scratches on clasp. No box.", diagnosis: "Mainspring tired, oils dried. Full service and new gaskets.", status: "in_progress", warranty: false, estimate: 450, promised_in_days: 6, received_ago: 9 * 1440 },
  { id: uuid(10, 2), number: "SRV-000102", customer: 5, branch: 1, brand: "United WatchMart", model: "Heritage 42", serial: "H42100240", issue: "Crown stiff, warranty check", intake: null, diagnosis: null, status: "diagnosing", warranty: true, estimate: null, promised_in_days: 10, received_ago: 2 * 1440 },
  { id: uuid(10, 3), number: "SRV-000103", customer: 8, branch: 0, brand: "Rolex", model: "Datejust 36", serial: "7Y12K881", issue: "Bracelet resize and polish", intake: "Two spare links handed over.", diagnosis: "Removed one link, light polish on case and bracelet.", status: "ready", warranty: false, estimate: 120, promised_in_days: 0, received_ago: 5 * 1440 },
  { id: uuid(10, 4), number: "SRV-000104", customer: 10, branch: 2, brand: "Seiko", model: "Presage SRPB41", serial: "4R35-01", issue: "Crystal cracked", intake: "Crack across 2 to 5 o'clock.", diagnosis: "Replace box sapphire crystal, pressure test.", status: "awaiting_approval", warranty: false, estimate: 180, promised_in_days: 12, received_ago: 1 * 1440 },
  { id: uuid(10, 5), number: "SRV-000105", customer: 0, branch: 0, brand: "United WatchMart", model: "Onyx Skeleton", serial: "ONX100268", issue: "Strap change to rubber", intake: null, diagnosis: "Fitted black rubber strap.", status: "collected", warranty: false, estimate: 90, promised_in_days: -3, received_ago: 6 * 1440 },
];

export const suppliers = [
  { id: uuid(11, 1), name: "Atelier Horloger SA", contact_name: "Claire Martin", email: "orders@atelier-horloger.test", phone: "+41 22 555 0101", address: "Rue du Rhône 12, Geneva", country: "Switzerland", payment_terms: "50% on order, 50% before shipping", notes: "Lead time about 6 weeks.", is_active: true },
  { id: uuid(11, 2), name: "Orient Time Distribution", contact_name: "Kenji Sato", email: "sales@orienttime.test", phone: "+65 6555 0102", address: "Marina Blvd, Singapore", country: "Singapore", payment_terms: "Net 30", notes: null, is_active: true },
  { id: uuid(11, 3), name: "Dhaka Strap & Parts", contact_name: "Habib Mia", email: "habib@strapparts.test", phone: "+880 1711 000103", address: "Elephant Road, Dhaka", country: "Bangladesh", payment_terms: "Cash on delivery", notes: "Straps, crystals and service parts.", is_active: true },
];

/** Purchase orders: one received last month, one on the way, one draft. */
export const purchaseSeeds = [
  { id: uuid(12, 1), number: "PO-000101", supplier: 0, branch: 0, status: "received" as const, ordered_days_ago: 50, expected_in_days: -20, shipping: 450,
    lines: [{ product: 0, qty: 2, cost: 2842, received: 2 }, { product: 6, qty: 1, cost: 10962, received: 1 }] },
  { id: uuid(12, 2), number: "PO-000102", supplier: 0, branch: 1, status: "ordered" as const, ordered_days_ago: 12, expected_in_days: 9, shipping: 600,
    lines: [{ product: 8, qty: 1, cost: 16762, received: 0 }, { product: 7, qty: 2, cost: 14210, received: 0 }] },
  { id: uuid(12, 3), number: "PO-000103", supplier: 1, branch: 2, status: "draft" as const, ordered_days_ago: null, expected_in_days: null, shipping: 150,
    lines: [{ product: 1, qty: 3, cost: 3596, received: 0 }] },
];
