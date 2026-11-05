-- Every change of a watch's branch or status is written to stock_movements automatically.
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

create trigger stock_items_log_insert after insert on stock_items for each row execute function log_stock_movement();
create trigger stock_items_log_update before update on stock_items for each row execute function log_stock_movement();
