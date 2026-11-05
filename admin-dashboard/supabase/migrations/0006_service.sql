-- Phase 4: workshop. Repair history, client approval, collection and payment.
alter table repairs add column intake_notes text;          -- scratches, strap wear, what came with the watch
alter table repairs add column approved_at timestamptz;
alter table repairs add column paid_amount numeric(12,2) not null default 0;
alter table repairs add column payment_method payment_method;

create table repair_events (
  id          uuid primary key default gen_random_uuid(),
  repair_id   uuid not null references repairs(id) on delete cascade,
  kind        text not null check (kind in ('status', 'note')),
  from_status repair_status,
  to_status   repair_status,
  note        text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index repair_events_repair_idx on repair_events(repair_id, created_at);
alter table repair_events enable row level security;
create policy "staff read repair_events" on repair_events for select to authenticated using (is_staff());
create policy "staff insert repair_events" on repair_events for insert to authenticated with check (is_staff());

-- Log every status change and stamp the matching dates.
create or replace function repair_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into repair_events (repair_id, kind, to_status, note, created_by) values (new.id, 'status', new.status, 'Watch received', auth.uid());
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into repair_events (repair_id, kind, from_status, to_status, created_by) values (new.id, 'status', old.status, new.status, auth.uid());
    if old.status = 'awaiting_approval' and new.status = 'in_progress' and new.approved_at is null then new.approved_at := now(); end if;
    if new.status = 'ready' and new.completed_at is null then new.completed_at := now(); end if;
    if new.status = 'collected' and new.collected_at is null then new.collected_at := now(); end if;
  end if;
  return new;
end $$;
create trigger repairs_status_before before update on repairs for each row execute function repair_status_change();
create trigger repairs_status_insert after insert on repairs for each row execute function repair_status_change();
