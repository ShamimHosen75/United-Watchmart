-- Phase 2: sales, payments, refunds, warranties and viewings.
alter table warranties add column status text not null default 'active' check (status in ('active','void'));
alter table viewing_requests add column stock_item_id uuid references stock_items(id) on delete set null;
alter table viewing_requests add column staff_notes text;
alter table orders add column refunded_at timestamptz;
alter table orders add column refund_reason text;

-- One sale, all or nothing: order + lines + payments, watches marked sold, warranty cards issued.
-- Runs as the calling user (security invoker), so row level security still applies.
create or replace function create_sale(p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_order_id uuid;
  v_customer_id uuid := nullif(p->>'customer_id', '')::uuid;
  v_branch uuid := (p->>'branch_id')::uuid;
  v_tax_rate numeric := coalesce((select tax_rate from store_settings where id = 1), 0);
  v_subtotal numeric := 0;
  v_line_discounts numeric := 0;
  v_order_discount numeric := coalesce((p->>'order_discount')::numeric, 0);
  v_tax numeric;
  v_total numeric;
  v_paid numeric := 0;
  it jsonb;
  pay jsonb;
  s stock_items%rowtype;
  pr products%rowtype;
begin
  if not is_staff() then raise exception 'Not allowed'; end if;
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then raise exception 'Add at least one watch'; end if;

  if v_customer_id is null and nullif(trim(p->'new_customer'->>'full_name'), '') is not null then
    insert into customers (full_name, phone, email, preferred_branch_id)
    values (trim(p->'new_customer'->>'full_name'), nullif(trim(p->'new_customer'->>'phone'), ''),
            nullif(trim(p->'new_customer'->>'email'), ''), v_branch)
    returning id into v_customer_id;
  end if;

  insert into orders (customer_id, branch_id, staff_id, channel, status, notes)
  values (v_customer_id, v_branch, auth.uid(), coalesce((p->>'channel')::order_channel, 'store'), 'pending', nullif(p->>'notes', ''))
  returning id into v_order_id;

  for it in select * from jsonb_array_elements(p->'items') loop
    select * into s from stock_items where id = (it->>'stock_item_id')::uuid for update;
    if not found then raise exception 'Watch not found'; end if;
    if s.status not in ('in_stock', 'reserved') then raise exception 'Serial % is not available (%)', s.serial_number, s.status; end if;
    if s.branch_id <> v_branch then raise exception 'Serial % is in another branch', s.serial_number; end if;
    select * into pr from products where id = s.product_id;
    insert into order_items (order_id, product_id, stock_item_id, description, unit_price, discount)
    values (v_order_id, s.product_id, s.id, pr.name || ' · ' || pr.ref_number || ' · ' || s.serial_number,
            (it->>'unit_price')::numeric, coalesce((it->>'discount')::numeric, 0));
    v_subtotal := v_subtotal + (it->>'unit_price')::numeric;
    v_line_discounts := v_line_discounts + coalesce((it->>'discount')::numeric, 0);
    update stock_items set status = 'sold', sold_at = now() where id = s.id;
    insert into warranties (stock_item_id, order_id, customer_id, starts_on, ends_on)
    values (s.id, v_order_id, v_customer_id, current_date, current_date + make_interval(months => pr.warranty_months));
  end loop;

  v_tax := round((v_subtotal - v_line_discounts - v_order_discount) * v_tax_rate / 100, 2);
  v_total := v_subtotal - v_line_discounts - v_order_discount + v_tax;
  if v_total < 0 then raise exception 'Discount is larger than the total'; end if;

  for pay in select * from jsonb_array_elements(coalesce(p->'payments', '[]'::jsonb)) loop
    if (pay->>'amount')::numeric <= 0 then continue; end if;
    insert into payments (order_id, method, amount, reference, received_by)
    values (v_order_id, (pay->>'method')::payment_method, (pay->>'amount')::numeric, nullif(pay->>'reference', ''), auth.uid());
    v_paid := v_paid + (pay->>'amount')::numeric;
  end loop;
  if v_paid > v_total then raise exception 'Payments are more than the total'; end if;

  update orders set subtotal = v_subtotal, discount = v_line_discounts + v_order_discount, tax = v_tax, total = v_total,
         amount_paid = v_paid, status = case when v_paid >= v_total then 'completed' else 'pending' end::order_status
  where id = v_order_id;
  -- Viewings that reserved one of these watches are done
  update viewing_requests set status = 'completed'
  where stock_item_id in (select (x->>'stock_item_id')::uuid from jsonb_array_elements(p->'items') x) and status in ('new','confirmed');
  return v_order_id;
end $$;

create or replace function add_payment(p_order uuid, p_method payment_method, p_amount numeric, p_reference text)
returns void language plpgsql security invoker set search_path = public as $$
declare o orders%rowtype;
begin
  if not is_staff() then raise exception 'Not allowed'; end if;
  select * into o from orders where id = p_order for update;
  if o.status not in ('pending', 'paid') then raise exception 'This order is %', o.status; end if;
  if p_amount <= 0 or o.amount_paid + p_amount > o.total then raise exception 'Amount is more than the balance due'; end if;
  insert into payments (order_id, method, amount, reference, received_by) values (p_order, p_method, p_amount, nullif(p_reference, ''), auth.uid());
  update orders set amount_paid = amount_paid + p_amount,
         status = case when amount_paid + p_amount >= total then 'completed'::order_status else status end
  where id = p_order;
end $$;

-- Refund (completed) or cancel (pending): watches go back in stock, warranties voided.
create or replace function refund_order(p_order uuid, p_reason text) returns void
language plpgsql security invoker set search_path = public as $$
declare o orders%rowtype;
begin
  if not current_role_is('{owner,admin,manager}') then raise exception 'Only a manager can refund or cancel'; end if;
  select * into o from orders where id = p_order for update;
  if o.status in ('cancelled', 'refunded') then raise exception 'Already %', o.status; end if;
  update stock_items set status = 'in_stock', sold_at = null
  where id in (select stock_item_id from order_items where order_id = p_order and stock_item_id is not null);
  update warranties set status = 'void' where order_id = p_order;
  update orders set status = case when o.amount_paid > 0 then 'refunded' else 'cancelled' end::order_status,
         refunded_at = now(), refund_reason = nullif(p_reason, '')
  where id = p_order;
end $$;
