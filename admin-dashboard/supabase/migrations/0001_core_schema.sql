-- United WatchMart admin: core schema (covers all phases so later phases need no restructuring)
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------- Enums ----------
create type staff_role        as enum ('owner','admin','manager','sales','technician');
create type movement_type     as enum ('automatic','manual','quartz','solar','spring_drive');
create type strap_type        as enum ('bracelet','leather','rubber','fabric','other');
create type product_status    as enum ('draft','active','archived');
create type item_condition    as enum ('new','pre_owned','display');
create type stock_status      as enum ('in_stock','reserved','sold','in_repair','in_transit','returned','written_off');
create type order_status      as enum ('draft','pending','paid','completed','cancelled','refunded');
create type order_channel     as enum ('store','online','phone','whatsapp');
create type payment_method    as enum ('cash','card','bank_transfer','mobile_banking','stripe','trade_in','other');
create type purchase_status   as enum ('draft','ordered','partially_received','received','cancelled');
create type transfer_status   as enum ('draft','in_transit','received','cancelled');
create type viewing_status    as enum ('new','confirmed','completed','no_show','cancelled');
create type repair_status     as enum ('received','diagnosing','awaiting_approval','in_progress','ready','collected','cancelled');
create type stock_move_reason as enum ('purchase','sale','return','transfer_out','transfer_in','repair_in','repair_out','adjustment','reservation');

-- ---------- Helpers ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Human friendly document numbers: ORD-000123, PO-000045 ...
create sequence order_number_seq;
create sequence purchase_number_seq;
create sequence repair_number_seq;
create sequence transfer_number_seq;
create sequence warranty_number_seq;

-- ---------- Organisation ----------
create table branches (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,              -- e.g. DHK-GUL
  name        text not null,
  address     text,
  city        text,
  phone       text,
  email       citext,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table profiles (                           -- one row per staff member (auth.users)
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       citext,
  phone       text,
  role        staff_role not null default 'sales',
  branch_id   uuid references branches(id) on delete set null,   -- home branch
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table store_settings (                     -- single row (id = 1)
  id                 int primary key default 1 check (id = 1),
  store_name         text not null default 'United WatchMart',
  legal_name         text,
  currency           text not null default 'USD',
  tax_rate           numeric(5,2) not null default 0,
  default_warranty_months int not null default 24,
  invoice_prefix     text not null default 'ORD-',
  invoice_footer     text,
  logo_url           text,
  low_stock_threshold int not null default 1,
  notifications      jsonb not null default '{}'::jsonb,
  integrations       jsonb not null default '{}'::jsonb,  -- no secrets here
  updated_at         timestamptz not null default now()
);
insert into store_settings (id) values (1);

-- ---------- Catalogue ----------
create table brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  country     text,
  created_at  timestamptz not null default now()
);

create table collections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

create table products (                           -- a watch model / reference
  id                 uuid primary key default gen_random_uuid(),
  sku                text not null unique,
  ref_number         text not null,             -- manufacturer reference, e.g. UW-H42-NV
  slug               text not null unique,
  name               text not null,
  tagline            text,
  description        text,
  brand_id           uuid references brands(id) on delete set null,
  collection_id      uuid references collections(id) on delete set null,
  status             product_status not null default 'draft',
  is_published       boolean not null default false,  -- shown on the public website
  -- specs
  case_mm            numeric(4,1),
  case_material      text,
  bezel              text,
  dial               text,
  movement           movement_type,
  calibre            text,
  power_reserve_h    int,
  water_resistance_m int,
  strap              strap_type,
  strap_detail       text,
  gender             text check (gender in ('men','women','unisex')),
  -- pricing
  cost_price         numeric(12,2) not null default 0,
  price              numeric(12,2) not null default 0,
  compare_at_price   numeric(12,2),
  warranty_months    int not null default 24,
  images             text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index products_brand_idx on products(brand_id);
create index products_ref_idx on products(ref_number);

-- ---------- Parties ----------
create table customers (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  email             citext,
  phone             text,
  address           text,
  city              text,
  country           text,
  birthday          date,
  wrist_size_mm     int,
  preferred_branch_id uuid references branches(id) on delete set null,
  is_vip            boolean not null default false,
  marketing_opt_in  boolean not null default false,
  tags              text[] not null default '{}',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index customers_email_idx on customers(email);
create index customers_phone_idx on customers(phone);

create table suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_name  text,
  email         citext,
  phone         text,
  address       text,
  country       text,
  payment_terms text,
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- Purchasing ----------
create table purchases (
  id            uuid primary key default gen_random_uuid(),
  number        text not null unique default ('PO-' || lpad(nextval('purchase_number_seq')::text, 6, '0')),
  supplier_id   uuid not null references suppliers(id),
  branch_id     uuid not null references branches(id),     -- receiving branch
  status        purchase_status not null default 'draft',
  ordered_at    date,
  expected_at   date,
  received_at   timestamptz,
  shipping_cost numeric(12,2) not null default 0,
  total         numeric(12,2) not null default 0,
  notes         text,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table purchase_items (
  id            uuid primary key default gen_random_uuid(),
  purchase_id   uuid not null references purchases(id) on delete cascade,
  product_id    uuid not null references products(id),
  quantity      int not null check (quantity > 0),
  received_qty  int not null default 0,
  unit_cost     numeric(12,2) not null default 0
);

-- ---------- Inventory (serialised: one row per physical watch) ----------
create table stock_items (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id),
  branch_id       uuid not null references branches(id),
  serial_number   text not null unique,
  status          stock_status not null default 'in_stock',
  condition       item_condition not null default 'new',
  cost_price      numeric(12,2),
  has_box         boolean not null default true,
  has_papers      boolean not null default true,
  location_note   text,                          -- e.g. "Showcase 3"
  purchase_id     uuid references purchases(id) on delete set null,
  received_at     timestamptz not null default now(),
  sold_at         timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index stock_items_product_idx on stock_items(product_id);
create index stock_items_branch_status_idx on stock_items(branch_id, status);

create table stock_movements (                    -- audit trail for every stock change
  id             uuid primary key default gen_random_uuid(),
  stock_item_id  uuid not null references stock_items(id) on delete cascade,
  reason         stock_move_reason not null,
  from_branch_id uuid references branches(id),
  to_branch_id   uuid references branches(id),
  from_status    stock_status,
  to_status      stock_status,
  reference      text,                            -- ORD-…, PO-…, TR-…
  note           text,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now()
);
create index stock_movements_item_idx on stock_movements(stock_item_id);

create table stock_transfers (
  id            uuid primary key default gen_random_uuid(),
  number        text not null unique default ('TR-' || lpad(nextval('transfer_number_seq')::text, 6, '0')),
  from_branch_id uuid not null references branches(id),
  to_branch_id  uuid not null references branches(id),
  status        transfer_status not null default 'draft',
  shipped_at    timestamptz,
  received_at   timestamptz,
  notes         text,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  check (from_branch_id <> to_branch_id)
);
create table stock_transfer_items (
  transfer_id   uuid not null references stock_transfers(id) on delete cascade,
  stock_item_id uuid not null references stock_items(id),
  primary key (transfer_id, stock_item_id)
);

-- ---------- Sales ----------
create table orders (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique default ('ORD-' || lpad(nextval('order_number_seq')::text, 6, '0')),
  customer_id     uuid references customers(id) on delete set null,
  branch_id       uuid not null references branches(id),
  staff_id        uuid references profiles(id),
  channel         order_channel not null default 'store',
  status          order_status not null default 'pending',
  subtotal        numeric(12,2) not null default 0,
  discount        numeric(12,2) not null default 0,
  tax             numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  amount_paid     numeric(12,2) not null default 0,
  notes           text,
  placed_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index orders_placed_idx on orders(placed_at desc);
create index orders_customer_idx on orders(customer_id);

create table order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  product_id     uuid not null references products(id),
  stock_item_id  uuid references stock_items(id),   -- the exact serial sold
  description    text,
  unit_price     numeric(12,2) not null,
  discount       numeric(12,2) not null default 0,
  line_total     numeric(12,2) generated always as (unit_price - discount) stored
);

create table payments (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  method      payment_method not null,
  amount      numeric(12,2) not null,
  reference   text,
  paid_at     timestamptz not null default now(),
  received_by uuid references profiles(id)
);

create table warranties (
  id             uuid primary key default gen_random_uuid(),
  card_number    text not null unique default ('WR-' || lpad(nextval('warranty_number_seq')::text, 6, '0')),
  stock_item_id  uuid not null references stock_items(id),
  order_id       uuid references orders(id) on delete set null,
  customer_id    uuid references customers(id) on delete set null,
  starts_on      date not null default current_date,
  ends_on        date not null,
  notes          text,
  created_at     timestamptz not null default now()
);

-- ---------- Clienteling & service ----------
create table viewing_requests (                    -- "Request a viewing" from the website
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid references customers(id) on delete set null,
  name           text not null,
  email          citext not null,
  phone          text,
  product_id     uuid references products(id) on delete set null,
  branch_id      uuid references branches(id) on delete set null,
  preferred_at   timestamptz,
  status         viewing_status not null default 'new',
  source         text not null default 'website',
  message        text,
  assigned_to    uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table repairs (                              -- servicing / repair jobs
  id               uuid primary key default gen_random_uuid(),
  number           text not null unique default ('SRV-' || lpad(nextval('repair_number_seq')::text, 6, '0')),
  customer_id      uuid not null references customers(id),
  branch_id        uuid not null references branches(id),
  stock_item_id    uuid references stock_items(id),  -- if sold by us
  brand_text       text,
  model_text       text,
  serial_number    text,
  issue            text not null,
  diagnosis        text,
  status           repair_status not null default 'received',
  under_warranty   boolean not null default false,
  estimate         numeric(12,2),
  final_cost       numeric(12,2),
  technician_id    uuid references profiles(id) on delete set null,
  received_at      timestamptz not null default now(),
  promised_at      date,
  completed_at     timestamptz,
  collected_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table activity_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references profiles(id) on delete set null,
  entity      text not null,
  entity_id   uuid,
  action      text not null,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- updated_at triggers
do $$ declare t text; begin
  foreach t in array array['branches','profiles','products','customers','suppliers','purchases',
                           'stock_items','orders','viewing_requests','repairs'] loop
    execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ---------- Views ----------
create view inventory_summary with (security_invoker = true) as
select p.id as product_id, p.name, p.ref_number, p.price, b.id as branch_id, b.name as branch_name,
       count(s.*) filter (where s.status = 'in_stock')  as in_stock,
       count(s.*) filter (where s.status = 'reserved')  as reserved,
       count(s.*) filter (where s.status = 'in_repair') as in_repair
from products p
cross join branches b
left join stock_items s on s.product_id = p.id and s.branch_id = b.id
group by p.id, b.id;

-- Create a profile automatically when a staff user signs up / is invited.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- The very first user becomes the active owner. Everyone after that starts
  -- inactive until an owner/admin approves them in Users.
  insert into profiles (id, email, full_name, role, is_active)
  select new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''),
         case when first then 'owner'::staff_role else 'sales'::staff_role end, first
  from (select not exists (select 1 from profiles) as first) f;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
