export type StaffRole = "owner" | "admin" | "manager" | "sales" | "technician";
export type MovementType = "automatic" | "manual" | "quartz" | "solar" | "spring_drive";
export type StrapType = "bracelet" | "leather" | "rubber" | "fabric" | "other";
export type ProductStatus = "draft" | "active" | "archived";
export type ItemCondition = "new" | "pre_owned" | "display";
export type StockStatus =
  | "in_stock"
  | "reserved"
  | "sold"
  | "in_repair"
  | "in_transit"
  | "returned"
  | "written_off";
export type OrderStatus = "draft" | "pending" | "paid" | "completed" | "cancelled" | "refunded";
export type OrderChannel = "store" | "online" | "phone" | "whatsapp";
export type ViewingStatus = "new" | "confirmed" | "completed" | "no_show" | "cancelled";
export type RepairStatus =
  | "received"
  | "diagnosing"
  | "awaiting_approval"
  | "in_progress"
  | "ready"
  | "collected"
  | "cancelled";

export interface Branch {
  id: string;
  code: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  opening_hours: string | null;
  is_active: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  branch_id: string | null;
  is_active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  country?: string | null;
  founded_year?: number | null;
  website?: string | null;
  logo_url?: string | null;
  description?: string | null;
  sort_order?: number;
  is_featured?: boolean;
  is_active?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

/** A row of one of the simple modules in lib/resources.ts. */
export type ResourceRecord = { id: string } & Record<string, unknown>;

export type RiskStatus = "pending" | "approved" | "held" | "cancelled";
export interface RiskReview {
  order_id: string;
  status: RiskStatus;
  note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface Product {
  id: string;
  sku: string;
  ref_number: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  brand_id: string | null;
  collection_id: string | null;
  status: ProductStatus;
  is_published: boolean;
  case_mm: number | null;
  case_material: string | null;
  bezel: string | null;
  dial: string | null;
  movement: MovementType | null;
  calibre: string | null;
  power_reserve_h: number | null;
  water_resistance_m: number | null;
  strap: StrapType | null;
  strap_detail: string | null;
  gender: "men" | "women" | "unisex" | null;
  cost_price: number;
  price: number;
  compare_at_price: number | null;
  warranty_months: number;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface StockItem {
  id: string;
  product_id: string;
  branch_id: string;
  serial_number: string;
  status: StockStatus;
  condition: ItemCondition;
  cost_price: number | null;
  has_box: boolean;
  has_papers: boolean;
  location_note: string | null;
  received_at: string;
  sold_at: string | null;
  notes: string | null;
}

export interface StockMovement {
  id: string;
  stock_item_id: string;
  reason: string;
  from_branch_id: string | null;
  to_branch_id: string | null;
  from_status: StockStatus | null;
  to_status: StockStatus | null;
  note: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  birthday: string | null;
  wrist_size_mm: number | null;
  preferred_branch_id: string | null;
  is_vip: boolean;
  marketing_opt_in: boolean;
  tags: string[];
  notes: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  number: string;
  customer_id: string | null;
  branch_id: string;
  staff_id: string | null;
  channel: OrderChannel;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amount_paid: number;
  notes: string | null;
  placed_at: string;
  refunded_at: string | null;
  refund_reason: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  stock_item_id: string | null;
  description: string | null;
  unit_price: number;
  discount: number;
}

export type PaymentMethod = "cash" | "card" | "bank_transfer" | "mobile_banking" | "stripe" | "trade_in" | "other";

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  paid_at: string;
}

export interface Warranty {
  id: string;
  card_number: string;
  stock_item_id: string;
  order_id: string | null;
  customer_id: string | null;
  starts_on: string;
  ends_on: string;
  status: "active" | "void";
}

export interface ViewingRequest {
  id: string;
  customer_id: string | null;
  stock_item_id: string | null;
  assigned_to: string | null;
  source: string;
  message: string | null;
  staff_notes: string | null;
  name: string;
  email: string;
  phone: string | null;
  product_id: string | null;
  branch_id: string | null;
  preferred_at: string | null;
  status: ViewingStatus;
  created_at: string;
}

export interface Repair {
  id: string;
  number: string;
  customer_id: string;
  branch_id: string;
  stock_item_id: string | null;
  brand_text: string | null;
  model_text: string | null;
  serial_number: string | null;
  issue: string;
  intake_notes: string | null;
  diagnosis: string | null;
  status: RepairStatus;
  under_warranty: boolean;
  estimate: number | null;
  final_cost: number | null;
  paid_amount: number;
  payment_method: PaymentMethod | null;
  technician_id: string | null;
  promised_at: string | null;
  received_at: string;
  approved_at: string | null;
  completed_at: string | null;
  collected_at: string | null;
}

export interface RepairEvent {
  id: string;
  repair_id: string;
  kind: "status" | "note";
  from_status: RepairStatus | null;
  to_status: RepairStatus | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

/** Product joined with names and stock counts, for lists. */
export interface ProductRow extends Product {
  brand_name: string | null;
  collection_name: string | null;
  in_stock: number;
  reserved: number;
}

export interface StockRow extends StockItem {
  product_name: string;
  ref_number: string;
  price: number;
  branch_name: string;
}

export type PurchaseStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";
export type TransferStatus = "draft" | "in_transit" | "received" | "cancelled";

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Purchase {
  id: string;
  number: string;
  supplier_id: string;
  branch_id: string;
  status: PurchaseStatus;
  ordered_at: string | null;
  expected_at: string | null;
  received_at: string | null;
  shipping_cost: number;
  total: number;
  notes: string | null;
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  received_qty: number;
  unit_cost: number;
}

export interface Transfer {
  id: string;
  number: string;
  from_branch_id: string;
  to_branch_id: string;
  status: TransferStatus;
  shipped_at: string | null;
  received_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface StoreSettings {
  store_name: string;
  legal_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website_url: string | null;
  whatsapp_number: string | null;
  currency: string;
  tax_rate: number;
  default_warranty_months: number;
  invoice_footer: string | null;
  low_stock_threshold: number;
  notifications: {
    viewing_email?: boolean;
    notify_email?: string;
    repair_quote_template?: string;
    repair_ready_template?: string;
  };
}

export interface StaffInvite {
  email: string;
  full_name: string;
  role: StaffRole;
  branch_id: string | null;
  created_at: string;
  accepted_at: string | null;
}

export interface CampaignSegment {
  vip?: boolean;
  tag?: string;
  birthday_month?: boolean;
  branch_id?: string;
  brand_id?: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: "email" | "whatsapp";
  subject: string | null;
  message: string;
  segment: CampaignSegment;
  status: "draft" | "sent";
  recipients: number;
  sent_at: string | null;
  created_at: string;
}

export interface SiteMedia {
  id: string;
  path: string;
  url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  created_at: string;
}
