-- Phase 3: purchasing, receiving by serial with landed cost, branch transfers.

-- Clearer movement reasons for transfers
create or replace function log_stock_movement() returns trigger
language plpgsql security definer set search_path = public as $$
declare r stock_move_reason;
begin
  if tg_op = 'INSERT' then
    insert into stock_movements (stock_item_id, reason, to_branch_id, to_status, reference, created_by)
    values (new.id, case when new.purchase_id is not null then 'purchase'::stock_move_reason else 'adjustment'::stock_move_reason end,
            new.branch_id, new.status, null, auth.uid());
    return new;
  end if;
  if new.status is distinct from old.status or new.branch_id is distinct from old.branch_id then
    r := case
      when new.branch_id is distinct from old.branch_id then 'transfer_in'
      when new.status = 'in_transit' then 'transfer_out'
      when new.status = 'sold' then 'sale'
      when old.status = 'sold' and new.status = 'in_stock' then 'return'
      when new.status = 'in_repair' then 'repair_in'
      when old.status = 'in_repair' then 'repair_out'
      when new.status = 'reserved' then 'reservation'
      else 'adjustment' end;
    insert into stock_movements (stock_item_id, reason, from_branch_id, to_branch_id, from_status, to_status, created_by)
    values (new.id, r, old.branch_id, new.branch_id, old.status, new.status, auth.uid());
    if new.status = 'sold' and new.sold_at is null then new.sold_at := now(); end if;
  end if;
  return new;
end $$;

-- Create or update a purchase order (draft or ordered) with its lines in one step.
create or replace function save_purchase(p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_id uuid := nullif(p->>'id', '')::uuid; v_status purchase_status; it jsonb;
begin
  if not current_role_is('{owner,admin,manager}') then raise exception 'Only a manager can edit purchases'; end if;
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then raise exception 'Add at least one watch'; end if;
  if v_id is null then
    insert into purchases (supplier_id, branch_id, status, ordered_at, expected_at, shipping_cost, notes, created_by)
    values ((p->>'supplier_id')::uuid, (p->>'branch_id')::uuid, (p->>'status')::purchase_status,
            nullif(p->>'ordered_at', '')::date, nullif(p->>'expected_at', '')::date,
            coalesce((p->>'shipping_cost')::numeric, 0), nullif(p->>'notes', ''), auth.uid())
    returning id into v_id;
  else
    select status into v_status from purchases where id = v_id for update;
    if v_status not in ('draft', 'ordered') then raise exception 'Only draft or ordered purchases can be edited'; end if;
    if exists (select 1 from purchase_items where purchase_id = v_id and received_qty > 0) then raise exception 'Watches were already received on this order'; end if;
    update purchases set supplier_id = (p->>'supplier_id')::uuid, branch_id = (p->>'branch_id')::uuid,
      status = (p->>'status')::purchase_status, ordered_at = nullif(p->>'ordered_at', '')::date,
      expected_at = nullif(p->>'expected_at', '')::date, shipping_cost = coalesce((p->>'shipping_cost')::numeric, 0),
      notes = nullif(p->>'notes', '') where id = v_id;
    delete from purchase_items where purchase_id = v_id;
  end if;
  for it in select * from jsonb_array_elements(p->'items') loop
    insert into purchase_items (purchase_id, product_id, quantity, unit_cost)
    values (v_id, (it->>'product_id')::uuid, (it->>'quantity')::int, (it->>'unit_cost')::numeric);
  end loop;
  update purchases set total = shipping_cost + (select coalesce(sum(quantity * unit_cost), 0) from purchase_items where purchase_id = v_id)
  where id = v_id;
  return v_id;
end $$;

-- Receive watches against a purchase: one stock item per serial, cost = unit cost + its share of shipping.
-- p = { lines: [{ purchase_item_id, serials: [..] }], condition, has_box, has_papers, location_note }
create or replace function receive_purchase(p_purchase uuid, p jsonb) returns int
language plpgsql security invoker set search_path = public as $$
declare
  po purchases%rowtype; line jsonb; pi purchase_items%rowtype; serial text; n int := 0;
  goods numeric; share numeric;
begin
  if not current_role_is('{owner,admin,manager}') then raise exception 'Only a manager can receive purchases'; end if;
  select * into po from purchases where id = p_purchase for update;
  if po.status not in ('ordered', 'partially_received') then raise exception 'Place the order before receiving (status %)', po.status; end if;
  select coalesce(sum(quantity * unit_cost), 0) into goods from purchase_items where purchase_id = p_purchase;
  for line in select * from jsonb_array_elements(p->'lines') loop
    select * into pi from purchase_items where id = (line->>'purchase_item_id')::uuid and purchase_id = p_purchase for update;
    if not found then raise exception 'Line not found'; end if;
    if pi.received_qty + jsonb_array_length(line->'serials') > pi.quantity then raise exception 'More watches than ordered on a line'; end if;
    share := case when goods > 0 then round(po.shipping_cost * pi.unit_cost / goods, 2) else 0 end;
    for serial in select trim(value) from jsonb_array_elements_text(line->'serials') loop
      if serial = '' then continue; end if;
      if exists (select 1 from stock_items where lower(serial_number) = lower(serial)) then raise exception 'Serial % already exists', serial; end if;
      insert into stock_items (product_id, branch_id, serial_number, condition, cost_price, has_box, has_papers, location_note, purchase_id)
      values (pi.product_id, po.branch_id, serial, coalesce((p->>'condition')::item_condition, 'new'), pi.unit_cost + share,
              coalesce((p->>'has_box')::boolean, true), coalesce((p->>'has_papers')::boolean, true), nullif(p->>'location_note', ''), po.id);
      n := n + 1;
    end loop;
    update purchase_items set received_qty = received_qty + jsonb_array_length(line->'serials') where id = pi.id;
  end loop;
  update purchases set
    status = case when (select bool_and(received_qty >= quantity) from purchase_items where purchase_id = po.id) then 'received'::purchase_status else 'partially_received'::purchase_status end,
    received_at = case when (select bool_and(received_qty >= quantity) from purchase_items where purchase_id = po.id) then now() else received_at end
  where id = po.id;
  return n;
end $$;

-- Send watches to another branch. They show "in transit" until the other branch receives them.
create or replace function create_transfer(p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_id uuid; sid uuid; s stock_items%rowtype;
begin
  if not is_staff() then raise exception 'Not allowed'; end if;
  if (p->>'from_branch_id') = (p->>'to_branch_id') then raise exception 'Pick two different branches'; end if;
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then raise exception 'Pick at least one watch'; end if;
  insert into stock_transfers (from_branch_id, to_branch_id, status, shipped_at, notes, created_by)
  values ((p->>'from_branch_id')::uuid, (p->>'to_branch_id')::uuid, 'in_transit', now(), nullif(p->>'notes', ''), auth.uid())
  returning id into v_id;
  for sid in select (value #>> '{}')::uuid from jsonb_array_elements(p->'items') loop
    select * into s from stock_items where id = sid for update;
    if s.branch_id <> (p->>'from_branch_id')::uuid or s.status <> 'in_stock' then
      raise exception 'Serial % is not in stock at the sending branch', s.serial_number;
    end if;
    insert into stock_transfer_items (transfer_id, stock_item_id) values (v_id, sid);
    update stock_items set status = 'in_transit' where id = sid;
  end loop;
  return v_id;
end $$;

-- p_receive = true: arrived at the destination. false: cancelled, back in stock at the sender.
create or replace function close_transfer(p_transfer uuid, p_receive boolean) returns void
language plpgsql security invoker set search_path = public as $$
declare t stock_transfers%rowtype;
begin
  if not is_staff() then raise exception 'Not allowed'; end if;
  select * into t from stock_transfers where id = p_transfer for update;
  if t.status <> 'in_transit' then raise exception 'This transfer is %', t.status; end if;
  update stock_items set status = 'in_stock', branch_id = case when p_receive then t.to_branch_id else branch_id end
  where id in (select stock_item_id from stock_transfer_items where transfer_id = p_transfer);
  update stock_transfers set status = case when p_receive then 'received' else 'cancelled' end::transfer_status,
         received_at = case when p_receive then now() end
  where id = p_transfer;
end $$;
