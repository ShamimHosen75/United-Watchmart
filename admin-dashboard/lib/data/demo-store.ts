import "server-only";
import * as seed from "@/lib/demo-data";
import type {
  Branch, Brand, Collection, Customer, Order, OrderItem, Payment, Product, Profile, Repair, StockItem, StockMovement,
  ViewingRequest, Warranty, RepairEvent, Supplier, Purchase, PurchaseItem, Transfer, StoreSettings, StaffInvite, Campaign,
} from "@/lib/types";
import type { SiteMedia } from "@/lib/types";
import { PAGES, type PageContent } from "@/lib/cms/schema";

const ago = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export interface DemoDb {
  branches: Branch[];
  staff: Profile[];
  brands: Brand[];
  collections: Collection[];
  products: Product[];
  stock: StockItem[];
  movements: StockMovement[];
  customers: Customer[];
  orders: Order[];
  orderItems: OrderItem[];
  payments: Payment[];
  warranties: Warranty[];
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseItems: PurchaseItem[];
  transfers: Transfer[];
  transferItems: { transfer_id: string; stock_item_id: string }[];
  counters: { order: number; warranty: number; purchase: number; transfer: number; repair: number };
  viewings: ViewingRequest[];
  repairs: Repair[];
  repairEvents: RepairEvent[];
  settings: StoreSettings;
  invites: StaffInvite[];
  campaigns: Campaign[];
  sitePages: DemoSitePage[];
  siteVersions: { id: number; slug: string; content: PageContent; published_at: string; published_by: string | null }[];
  media: SiteMedia[];
}

export interface DemoSitePage {
  slug: string;
  title: string;
  draft: PageContent | null;
  published: PageContent | null;
  published_at: string | null;
  draft_updated_at: string | null;
}

function build(): DemoDb {
  const stock: StockItem[] = seed.stockSeeds.map((s) => ({
    id: s.id, product_id: s.product_id, branch_id: s.branch_id, serial_number: s.serial_number, status: s.status,
    condition: s.condition, cost_price: s.cost_price, has_box: s.has_box, has_papers: s.has_papers,
    location_note: s.location_note, received_at: ago(s.received_ago),
    sold_at: s.sold_ago === null ? null : ago(s.sold_ago), notes: s.notes,
  }));
  const movements: StockMovement[] = seed.stockSeeds.flatMap((s, i) => {
    const list: StockMovement[] = [{
      id: `m-${i}-a`, stock_item_id: s.id, reason: "purchase", from_branch_id: null, to_branch_id: s.branch_id,
      from_status: null, to_status: "in_stock", note: null, created_at: ago(s.received_ago),
    }];
    if (s.status !== "in_stock") list.push({
      id: `m-${i}-b`, stock_item_id: s.id, reason: s.status === "sold" ? "sale" : s.status === "reserved" ? "reservation" : "repair_in",
      from_branch_id: s.branch_id, to_branch_id: s.branch_id, from_status: "in_stock", to_status: s.status, note: null,
      created_at: ago(s.sold_ago ?? Math.floor(s.received_ago / 2)),
    });
    return list;
  });
  const orders: Order[] = seed.orderSeeds.map((o) => {
    const total = o.unit_price - o.discount;
    return {
      id: o.id, number: o.number, customer_id: o.customer_id, branch_id: o.branch_id, staff_id: o.staff_id,
      channel: o.channel, status: o.status, subtotal: o.unit_price, discount: o.discount, tax: 0, total,
      amount_paid: seed.seedPaid(o), notes: null, placed_at: ago(o.placed_ago), refunded_at: null, refund_reason: null,
    };
  });
  const orderItems: OrderItem[] = seed.orderSeeds.map((o) => ({
    id: `oi-${o.id}`, order_id: o.id, product_id: o.product_id, stock_item_id: o.stock_item_id,
    description: null, unit_price: o.unit_price, discount: o.discount,
  }));
  const payments: Payment[] = seed.orderSeeds.map((o) => ({
    id: `pay-${o.id}`, order_id: o.id, method: o.method, amount: seed.seedPaid(o), reference: null, paid_at: ago(o.placed_ago),
  }));
  const warranties: Warranty[] = seed.orderSeeds.map((o, i) => {
    const start = new Date(Date.now() - o.placed_ago * 60_000);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 24);
    return {
      id: `w-${o.id}`, card_number: `WR-${String(i + 1).padStart(6, "0")}`, stock_item_id: o.stock_item_id, order_id: o.id,
      customer_id: o.customer_id, starts_on: start.toISOString().slice(0, 10), ends_on: end.toISOString().slice(0, 10), status: "active",
    };
  });
  const viewings: ViewingRequest[] = seed.viewingSeeds.map((v) => {
    const c = seed.customers[v.customer];
    return {
      id: v.id, customer_id: c.id, stock_item_id: null, assigned_to: null, source: v.source, message: v.message, staff_notes: null,
      name: c.full_name, email: c.email ?? "", phone: c.phone, product_id: seed.products[v.product].id,
      branch_id: seed.branches[v.branch].id, preferred_at: ago(-v.in_hours * 60), status: v.status,
      created_at: ago(v.created_ago),
    };
  });
  const repairs: Repair[] = seed.repairSeeds.map((r) => {
    const done = r.status === "ready" || r.status === "collected";
    return {
      id: r.id, number: r.number, customer_id: seed.customers[r.customer].id, branch_id: seed.branches[r.branch].id,
      stock_item_id: stock.find((s) => s.serial_number === r.serial)?.id ?? null,
      brand_text: r.brand, model_text: r.model, serial_number: r.serial, issue: r.issue, intake_notes: r.intake,
      diagnosis: r.diagnosis, status: r.status, under_warranty: r.warranty, estimate: r.estimate,
      final_cost: done ? r.estimate : null, paid_amount: r.status === "collected" ? r.estimate ?? 0 : 0,
      payment_method: r.status === "collected" ? "card" : null, technician_id: seed.staff[3].id,
      promised_at: ago(-r.promised_in_days * 1440).slice(0, 10), received_at: ago(r.received_ago),
      approved_at: ["in_progress", "ready", "collected"].includes(r.status) ? ago(r.received_ago - 1440) : null,
      completed_at: done ? ago(1440) : null, collected_at: r.status === "collected" ? ago(600) : null,
    };
  });
  const repairEvents: RepairEvent[] = repairs.flatMap((r) => {
    const flow: Repair["status"][] = ["received", "diagnosing", "awaiting_approval", "in_progress", "ready", "collected"];
    const upto = flow.indexOf(r.status);
    return flow.slice(0, upto + 1).map((st, i) => ({
      id: `${r.id}-e${i}`, repair_id: r.id, kind: "status" as const, from_status: i ? flow[i - 1] : null, to_status: st,
      note: i === 0 ? "Watch received" : null, created_by: seed.staff[3].id,
      created_at: new Date(Date.parse(r.received_at) + i * 6 * 3600_000).toISOString(),
    }));
  });
  const suppliers: Supplier[] = seed.suppliers.map((x) => ({ ...x, created_at: ago(200 * 1440) }));
  const purchaseItems: PurchaseItem[] = [];
  const purchases: Purchase[] = seed.purchaseSeeds.map((po) => {
    po.lines.forEach((l, i) => purchaseItems.push({
      id: `${po.id}-${i}`, purchase_id: po.id, product_id: seed.products[l.product].id, quantity: l.qty, received_qty: l.received, unit_cost: l.cost,
    }));
    return {
      id: po.id, number: po.number, supplier_id: seed.suppliers[po.supplier].id, branch_id: seed.branches[po.branch].id, status: po.status,
      ordered_at: po.ordered_days_ago === null ? null : ago(po.ordered_days_ago * 1440).slice(0, 10),
      expected_at: po.expected_in_days === null ? null : ago(-po.expected_in_days * 1440).slice(0, 10),
      received_at: po.status === "received" ? ago(-po.expected_in_days! * 1440) : null,
      shipping_cost: po.shipping, total: po.shipping + po.lines.reduce((t, l) => t + l.qty * l.cost, 0), notes: null,
      created_at: ago((po.ordered_days_ago ?? 2) * 1440),
    };
  });
  // One transfer on the road: the first in-stock Gulshan piece is going to Banani.
  const moving = stock.find((s) => s.branch_id === seed.branches[0].id && s.status === "in_stock")!;
  moving.status = "in_transit";
  const transfers: Transfer[] = [{
    id: "00000000-0000-4000-8013-000000000001", number: "TR-000011", from_branch_id: seed.branches[0].id, to_branch_id: seed.branches[1].id,
    status: "in_transit", shipped_at: ago(180), received_at: null, notes: "Client viewing at Banani on Saturday", created_at: ago(180),
  }];
  movements.push({
    id: "m-transfer", stock_item_id: moving.id, reason: "transfer_out", from_branch_id: moving.branch_id, to_branch_id: moving.branch_id,
    from_status: "in_stock", to_status: "in_transit", note: "TR-000011", created_at: ago(180),
  });

  return {
    suppliers, purchases, purchaseItems, transfers, transferItems: [{ transfer_id: transfers[0].id, stock_item_id: moving.id }],
    branches: structuredClone(seed.branches), staff: structuredClone(seed.staff), brands: structuredClone(seed.brands),
    collections: structuredClone(seed.collections), products: structuredClone(seed.products), stock, movements,
    customers: structuredClone(seed.customers), orders, orderItems, payments, warranties,
    counters: { order: 2000, warranty: warranties.length, purchase: 200, transfer: 20, repair: 200 }, viewings, repairs, repairEvents,
    settings: {
      store_name: "United WatchMart", legal_name: "United WatchMart Ltd.", phone: "+880 1700 000001", email: "hello@unitedwatchmart.test",
      address: "Gulshan Avenue, Dhaka", website_url: "https://unitedwatchmart.test", whatsapp_number: "+880 1700 000001",
      currency: "USD", tax_rate: 0, default_warranty_months: 24,
      invoice_footer: "Thank you for choosing United WatchMart. Keep this invoice with your warranty card.", low_stock_threshold: 1,
      notifications: { viewing_email: false, notify_email: "", repair_quote_template: "", repair_ready_template: "" },
    },
    invites: [{ email: "rafi@unitedwatchmart.test", full_name: "Rafi Chowdhury", role: "sales", branch_id: seed.branches[2].id, created_at: ago(60 * 26), accepted_at: null }],
    campaigns: [{
      id: "00000000-0000-4000-8014-000000000001", name: "Spring service reminder", channel: "email", subject: "Time for a check-up?",
      message: "Hello {first_name}, a mechanical watch runs best with a service every few years. Book a free check at any of our boutiques this month.",
      segment: {}, status: "sent", recipients: 0, sent_at: ago(60 * 24 * 20), created_at: ago(60 * 24 * 21),
    }],
    sitePages: PAGES.map((p) => ({ slug: p.slug, title: p.title, draft: null, published: null, published_at: null, draft_updated_at: null })),
    siteVersions: [],
    media: [],
  };
}

const g = globalThis as unknown as { __watchmartDemo?: DemoDb };
/** In-memory database for demo mode. Changes last until the server restarts. */
export const demo: DemoDb = (g.__watchmartDemo?.sitePages ? g.__watchmartDemo : (g.__watchmartDemo = build()));
