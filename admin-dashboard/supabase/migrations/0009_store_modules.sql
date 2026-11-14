-- Phase 7: watch brands, categories, checkout leads, risk review, home slider, reviews, wrist try-on,
-- coupons and shipping. Matches lib/resources.ts.

-- ---------- Watch brands and categories ----------
alter table brands
  add column if not exists founded_year int check (founded_year between 1600 and 2100),
  add column if not exists website      text,
  add column if not exists logo_url     text,
  add column if not exists description  text,
  add column if not exists sort_order   int not null default 0,
  add column if not exists is_featured  boolean not null default false,
  add column if not exists is_active    boolean not null default true;

alter table collections
  add column if not exists description  text,
  add column if not exists image_url    text,
  add column if not exists sort_order   int not null default 0,
  add column if not exists is_active    boolean not null default true;

-- ---------- Checkout leads (abandoned checkouts) ----------
create table checkout_leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text,
  city        text,
  items       text,
  cart_total  numeric(12,2) not null default 0 check (cart_total >= 0),
  step        text not null default 'details' check (step in ('cart','details','shipping','payment')),
  status      text not null default 'new' check (status in ('new','contacted','recovered','lost')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index checkout_leads_status_idx on checkout_leads(status, created_at desc);
create trigger checkout_leads_updated before update on checkout_leads for each row execute function set_updated_at();

-- ---------- Risk review decisions (scores are computed in the app) ----------
create table order_risk_reviews (
  order_id     uuid primary key references orders(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','approved','held','cancelled')),
  note         text,
  reviewed_by  uuid references profiles(id) on delete set null,
  reviewed_at  timestamptz
);

-- ---------- Home slider ----------
create table site_slides (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  eyebrow     text,
  subtitle    text,
  image_url   text not null,
  cta_label   text,
  cta_href    text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger site_slides_updated before update on site_slides for each row execute function set_updated_at();

-- ---------- Reviews: same table the website reads (drizzle/0001_reviews.sql in the website repo) ----------
do $$ begin
  create type review_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null,
  rating       integer not null,
  title        text,
  body         text not null,
  author_name  text not null,
  author_city  text,
  verified     boolean not null default false,
  featured     boolean not null default false,
  status       review_status not null default 'pending',
  created_at   timestamptz not null default now(),
  constraint reviews_rating_range check (rating between 1 and 5)
);
create index if not exists reviews_slug_idx on reviews(slug);
create index if not exists reviews_status_idx on reviews(status);

-- ---------- Wrist try-on ----------
create table tryon_settings (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null unique references products(id) on delete cascade,
  overlay_url    text not null,
  case_mm        numeric(5,1),
  lug_to_lug_mm  numeric(5,1),
  scale_pct      numeric(5,1) not null default 100,
  notes          text,
  is_enabled     boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger tryon_settings_updated before update on tryon_settings for each row execute function set_updated_at();

-- ---------- Coupons ----------
create table coupons (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
  description    text,
  discount_type  text not null default 'percent' check (discount_type in ('percent','fixed','free_shipping')),
  value          numeric(12,2) not null default 0 check (value >= 0),
  min_order      numeric(12,2) not null default 0 check (min_order >= 0),
  max_uses       int check (max_uses > 0),
  used_count     int not null default 0 check (used_count >= 0),
  brand_id       uuid references brands(id) on delete set null,
  starts_on      date,
  ends_on        date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (discount_type <> 'percent' or value <= 100),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create trigger coupons_updated before update on coupons for each row execute function set_updated_at();

-- ---------- Shipping ----------
create table shipping_zones (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  regions     text[] not null default '{}',
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger shipping_zones_updated before update on shipping_zones for each row execute function set_updated_at();

create table shipping_methods (
  id          uuid primary key default gen_random_uuid(),
  zone_id     uuid not null references shipping_zones(id) on delete restrict,
  name        text not null,
  carrier     text,
  rate        numeric(12,2) not null default 0 check (rate >= 0),
  free_over   numeric(12,2) check (free_over >= 0),
  min_days    int check (min_days >= 0),
  max_days    int check (max_days >= 0),
  is_insured  boolean not null default true,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (max_days is null or min_days is null or max_days >= min_days)
);
create index shipping_methods_zone_idx on shipping_methods(zone_id);
create trigger shipping_methods_updated before update on shipping_methods for each row execute function set_updated_at();

-- ---------- Security ----------
do $$ declare t text; begin
  foreach t in array array['checkout_leads','order_risk_reviews','site_slides','reviews','tryon_settings','coupons','shipping_zones','shipping_methods'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "staff read %1$s" on %1$I for select to authenticated using (is_staff())', t);
  end loop;
end $$;

-- Any active staff member follows up on leads
create policy "staff insert checkout_leads" on checkout_leads for insert to authenticated with check (is_staff());
create policy "staff update checkout_leads" on checkout_leads for update to authenticated using (is_staff()) with check (is_staff());
create policy "admins delete checkout_leads" on checkout_leads for delete to authenticated using (current_role_is('{owner,admin}'));

-- Storefront, pricing and risk decisions: managers and above
do $$ declare t text; begin
  foreach t in array array['order_risk_reviews','site_slides','reviews','tryon_settings','coupons','shipping_zones','shipping_methods'] loop
    execute format($f$create policy "managers write %1$s" on %1$I for all to authenticated
      using (current_role_is('{owner,admin,manager}')) with check (current_role_is('{owner,admin,manager}'))$f$, t);
  end loop;
end $$;

-- What the public website may read or send
create policy "public read active slides" on site_slides for select to anon using (is_active);
create policy "public read approved reviews" on reviews for select to anon using (status = 'approved');
create policy "public submit review" on reviews for insert to anon with check (status = 'pending' and not featured and not verified);
create policy "public read try-on" on tryon_settings for select to anon using (is_enabled);
create policy "public read shipping zones" on shipping_zones for select to anon using (is_active);
create policy "public read shipping methods" on shipping_methods for select to anon using (is_active);
create policy "public submit checkout lead" on checkout_leads for insert to anon with check (status = 'new' and notes is null);
-- Coupons are checked on the server at checkout, never listed to the public.
