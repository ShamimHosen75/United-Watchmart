-- Row level security: only active staff can use the admin. Writes are limited by role.
create or replace function current_role_is(roles staff_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active and role = any(roles));
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active);
$$;

do $$ declare t text; begin
  foreach t in array array['branches','profiles','store_settings','brands','collections','products','customers',
    'suppliers','purchases','purchase_items','stock_items','stock_movements','stock_transfers','stock_transfer_items',
    'orders','order_items','payments','warranties','viewing_requests','repairs','activity_log'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "staff read %1$s" on %1$I for select to authenticated using (is_staff())', t);
  end loop;
end $$;

-- Day-to-day tables any active staff member can write
do $$ declare t text; begin
  foreach t in array array['customers','orders','order_items','payments','warranties','viewing_requests',
    'repairs','stock_items','stock_movements','stock_transfers','stock_transfer_items','activity_log'] loop
    execute format('create policy "staff insert %1$s" on %1$I for insert to authenticated with check (is_staff())', t);
    execute format('create policy "staff update %1$s" on %1$I for update to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

-- Catalogue, purchasing and suppliers: managers and above
do $$ declare t text; begin
  foreach t in array array['brands','collections','products','suppliers','purchases','purchase_items'] loop
    execute format($f$create policy "managers write %1$s" on %1$I for all to authenticated
      using (current_role_is('{owner,admin,manager}')) with check (current_role_is('{owner,admin,manager}'))$f$, t);
  end loop;
end $$;

-- Deletes of sales/stock records: owner/admin only
do $$ declare t text; begin
  foreach t in array array['customers','orders','order_items','payments','warranties','viewing_requests','repairs','stock_items'] loop
    execute format($f$create policy "admins delete %1$s" on %1$I for delete to authenticated
      using (current_role_is('{owner,admin}'))$f$, t);
  end loop;
end $$;

-- Branches, settings, staff: owner/admin
create policy "admins write branches" on branches for all to authenticated
  using (current_role_is('{owner,admin}')) with check (current_role_is('{owner,admin}'));
create policy "admins write settings" on store_settings for update to authenticated
  using (current_role_is('{owner,admin}')) with check (current_role_is('{owner,admin}'));
create policy "admins manage profiles" on profiles for update to authenticated
  using (current_role_is('{owner,admin}')) with check (current_role_is('{owner,admin}'));
-- Everyone can read their own profile (so a not-yet-approved user sees the "waiting for approval" screen)
create policy "self read profile" on profiles for select to authenticated using (id = auth.uid());
-- Staff may edit their own name/phone/avatar (role and is_active are protected by the trigger below)
create policy "self update profile" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create or replace function protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not current_role_is('{owner,admin}') and
     (new.role is distinct from old.role or new.is_active is distinct from old.is_active or new.branch_id is distinct from old.branch_id) then
    raise exception 'Only an owner or admin can change role, branch or active status';
  end if;
  if old.role = 'owner' and new.role <> 'owner' and not current_role_is('{owner}') then
    raise exception 'Only an owner can change another owner';
  end if;
  return new;
end $$;
create trigger profiles_protect before update on profiles for each row execute function protect_profile_fields();

-- Public website: anyone may submit a viewing request (insert only, never read)
create policy "public submit viewing" on viewing_requests for insert to anon
  with check (status = 'new' and customer_id is null and assigned_to is null);

-- Public website may read published products
create policy "public read published products" on products for select to anon
  using (is_published and status = 'active');
create policy "public read brands" on brands for select to anon using (true);
create policy "public read collections" on collections for select to anon using (true);

-- Storage bucket for product images
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;
create policy "staff upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and current_role_is('{owner,admin,manager}'));
create policy "staff update product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and current_role_is('{owner,admin,manager}'));
create policy "staff delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and current_role_is('{owner,admin,manager}'));
