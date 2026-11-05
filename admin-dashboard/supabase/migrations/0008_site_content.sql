-- Phase 6: website content (pages, sections, media) edited from the admin.

-- One row per website page. Sections are stored as JSON: a draft that staff edit
-- and a published copy that the website reads. Publishing copies draft -> published.
create table site_pages (
  slug              text primary key,                 -- home, anatomy, collection, pricing, about, legal, global
  title             text not null,
  draft             jsonb not null default '{"seo":{},"sections":[]}'::jsonb,
  published         jsonb,
  published_at      timestamptz,
  published_by      uuid references profiles(id) on delete set null,
  draft_updated_at  timestamptz not null default now(),
  draft_updated_by  uuid references profiles(id) on delete set null
);
alter table site_pages enable row level security;
create policy "staff read site pages" on site_pages for select to authenticated using (is_staff());
create policy "managers write site pages" on site_pages for all to authenticated
  using (current_role_is('{owner,admin,manager}')) with check (current_role_is('{owner,admin,manager}'));

-- Every published change is kept, so a page can be rolled back.
create table site_page_versions (
  id            bigint generated always as identity primary key,
  slug          text not null references site_pages(slug) on delete cascade,
  content       jsonb not null,
  published_at  timestamptz not null default now(),
  published_by  uuid references profiles(id) on delete set null
);
create index site_page_versions_slug_idx on site_page_versions(slug, published_at desc);
alter table site_page_versions enable row level security;
create policy "staff read page versions" on site_page_versions for select to authenticated using (is_staff());
create policy "managers add page versions" on site_page_versions for insert to authenticated
  with check (current_role_is('{owner,admin,manager}'));

create or replace function publish_site_page(p_slug text) returns timestamptz
language plpgsql security invoker set search_path = public as $$
declare v_now timestamptz := now();
begin
  if not current_role_is('{owner,admin,manager}') then raise exception 'Only a manager can publish'; end if;
  update site_pages set published = draft, published_at = v_now, published_by = auth.uid() where slug = p_slug;
  if not found then raise exception 'Page not found'; end if;
  insert into site_page_versions (slug, content, published_at, published_by)
  select slug, published, v_now, auth.uid() from site_pages where slug = p_slug;
  return v_now;
end $$;

-- The public website reads published content only, through this function.
create or replace function get_published_page(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('slug', slug, 'title', title, 'published_at', published_at, 'content', published)
  from site_pages where slug = p_slug and published is not null;
$$;
revoke all on function get_published_page(text) from public;
grant execute on function get_published_page(text) to anon, authenticated;

-- Media library: images uploaded to the public "site-media" storage bucket.
create table site_media (
  id          uuid primary key default gen_random_uuid(),
  path        text not null unique,                   -- path inside the bucket
  url         text not null,
  file_name   text not null,
  mime_type   text not null,
  size_bytes  int not null,
  width       int,
  height      int,
  alt         text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table site_media enable row level security;
create policy "staff read media" on site_media for select to authenticated using (is_staff());
create policy "managers write media" on site_media for all to authenticated
  using (current_role_is('{owner,admin,manager}')) with check (current_role_is('{owner,admin,manager}'));

insert into storage.buckets (id, name, public) values ('site-media', 'site-media', true)
on conflict (id) do nothing;
create policy "managers upload site media" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and current_role_is('{owner,admin,manager}'));
create policy "managers update site media" on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and current_role_is('{owner,admin,manager}'));
create policy "managers delete site media" on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and current_role_is('{owner,admin,manager}'));

-- The pages the website has. Content starts empty; the admin fills each page
-- with its starter sections the first time it is opened.
insert into site_pages (slug, title) values
  ('home', 'Home'), ('anatomy', 'Anatomy of a Watch'), ('collection', 'Collection'), ('pricing', 'Pricing'),
  ('about', 'About'), ('legal', 'Privacy and terms'), ('global', 'Header and footer')
on conflict (slug) do nothing;
