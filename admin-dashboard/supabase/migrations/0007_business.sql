-- Phase 5: branches, staff invites, store settings, marketing campaigns.

-- ---------- Branches ----------
alter table branches add column if not exists opening_hours text;

-- ---------- Store settings ----------
alter table store_settings
  add column if not exists phone text,
  add column if not exists email citext,
  add column if not exists address text,
  add column if not exists website_url text,
  add column if not exists whatsapp_number text;

-- ---------- Staff invites ----------
-- An owner or admin adds the email here with a role and branch. When that person
-- signs in for the first time, handle_new_user() applies the invite and activates them.
create table staff_invites (
  email       citext primary key,
  full_name   text not null default '',
  role        staff_role not null default 'sales',
  branch_id   uuid references branches(id) on delete set null,
  invited_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);
alter table staff_invites enable row level security;
create policy "admins manage invites" on staff_invites for all to authenticated
  using (current_role_is('{owner,admin}')) with check (current_role_is('{owner,admin}'));

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv staff_invites;
  first boolean := not exists (select 1 from profiles);
begin
  select * into inv from staff_invites where email = new.email and accepted_at is null;
  if first then
    insert into profiles (id, email, full_name, role, is_active)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'owner', true);
  elsif inv.email is not null then
    insert into profiles (id, email, full_name, role, branch_id, is_active)
    values (new.id, new.email, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), inv.full_name), inv.role, inv.branch_id, true);
    update staff_invites set accepted_at = now() where email = inv.email;
  else
    -- Not invited: waits in Users until an owner or admin approves them.
    insert into profiles (id, email, full_name, role, is_active)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'sales', false);
  end if;
  return new;
end $$;


-- ---------- Marketing campaigns ----------
create type campaign_channel as enum ('email', 'whatsapp');

create table campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  channel     campaign_channel not null,
  subject     text,
  message     text not null,
  segment     jsonb not null default '{}'::jsonb,   -- { vip, tag, birthday_month, branch_id, brand_id }
  status      text not null default 'draft' check (status in ('draft', 'sent')),
  recipients  int not null default 0,
  sent_at     timestamptz,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger campaigns_updated_at before update on campaigns for each row execute function set_updated_at();
alter table campaigns enable row level security;
create policy "staff read campaigns" on campaigns for select to authenticated using (is_staff());
create policy "managers write campaigns" on campaigns for all to authenticated
  using (current_role_is('{owner,admin,manager}')) with check (current_role_is('{owner,admin,manager}'));

-- Brands and collections can't be removed while watches still use them.
create or replace function block_used_catalogue_delete() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from products where (tg_table_name = 'brands' and brand_id = old.id)
                                       or (tg_table_name = 'collections' and collection_id = old.id)) then
    raise exception 'Still used by watches in the catalogue';
  end if;
  return old;
end $$;
create trigger brands_block_delete before delete on brands for each row execute function block_used_catalogue_delete();
create trigger collections_block_delete before delete on collections for each row execute function block_used_catalogue_delete();
