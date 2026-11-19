-- MatchaDB owner-managed café pages: a café's verified owner customises its page like a small landing page (cover photo, tagline, about, hours, contact,
-- social and order links, photo gallery, menu files, amenities, announcement, colour theme). Everyone can read; only the café's owner (a row in cafe_owners,
-- written by staff when a request is approved) can write. Run once in the Supabase SQL editor (safe to re-run). Needs tiers_menus_dms.sql.

create table if not exists public.cafe_pages (
  cafe_id text primary key check (cafe_id ~ '^([0-9a-f]{10}|fsq[0-9a-f]{7})$'),
  tagline text check (tagline is null or char_length(tagline) <= 140),
  bio text check (bio is null or char_length(bio) <= 2500),
  matcha_info text check (matcha_info is null or char_length(matcha_info) <= 800),
  announcement text check (announcement is null or char_length(announcement) <= 240),
  cover_path text check (cover_path is null or char_length(cover_path) <= 200),
  accent text not null default 'green' check (accent in ('green', 'pink', 'gold', 'blue', 'plum', 'charcoal')),
  hours jsonb not null default '{}'::jsonb,
  phone text check (phone is null or char_length(phone) <= 40),
  public_email text check (public_email is null or (char_length(public_email) <= 120 and public_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  website_url text check (website_url is null or website_url ~ '^https://\S+$'),
  order_url text check (order_url is null or order_url ~ '^https://\S+$'),
  reservation_url text check (reservation_url is null or reservation_url ~ '^https://\S+$'),
  links jsonb not null default '{}'::jsonb,
  amenities text[] not null default '{}' check (coalesce(array_length(amenities, 1), 0) <= 16),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users (id) on delete set null
);

-- Social links: only known networks, https only.
create or replace function public.cafe_pages_clean() returns trigger language plpgsql as $$
declare k text; v text;
begin
  for k, v in select key, value from jsonb_each_text(coalesce(new.links, '{}'::jsonb)) loop
    if k not in ('instagram', 'x', 'facebook', 'tiktok', 'youtube', 'threads', 'pinterest', 'yelp', 'google_maps', 'linkedin', 'spotify') then
      raise exception 'unknown link: %', k;
    end if;
    if v is null or v !~ '^https://\S+$' or char_length(v) > 200 then raise exception 'links must start with https://'; end if;
  end loop;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
drop trigger if exists cafe_pages_clean on public.cafe_pages;
create trigger cafe_pages_clean before insert or update on public.cafe_pages for each row execute function public.cafe_pages_clean();

create table if not exists public.cafe_photos (
  id uuid primary key default gen_random_uuid(),
  cafe_id text not null check (cafe_id ~ '^([0-9a-f]{10}|fsq[0-9a-f]{7})$'),
  path text not null check (char_length(path) <= 200 and path like cafe_id || '/%'),
  caption text check (caption is null or char_length(caption) <= 120),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists cafe_photos_cafe_idx on public.cafe_photos (cafe_id, sort, created_at);

create table if not exists public.cafe_menu_files (
  id uuid primary key default gen_random_uuid(),
  cafe_id text not null check (cafe_id ~ '^([0-9a-f]{10}|fsq[0-9a-f]{7})$'),
  path text not null check (char_length(path) <= 200 and path like cafe_id || '/%'),
  label text not null default 'Menu' check (char_length(label) between 1 and 60),
  kind text not null check (kind in ('pdf', 'image')),
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists cafe_menu_files_cafe_idx on public.cafe_menu_files (cafe_id, sort, created_at);

-- At most 16 photos and 6 menu files per café.
create or replace function public.cafe_media_limits() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'cafe_photos' and (select count(*) from public.cafe_photos where cafe_id = new.cafe_id) >= 16 then raise exception 'photo limit reached'; end if;
  if tg_table_name = 'cafe_menu_files' and (select count(*) from public.cafe_menu_files where cafe_id = new.cafe_id) >= 6 then raise exception 'menu file limit reached'; end if;
  return new;
end $$;
drop trigger if exists cafe_photos_limit on public.cafe_photos;
create trigger cafe_photos_limit before insert on public.cafe_photos for each row execute function public.cafe_media_limits();
drop trigger if exists cafe_menu_files_limit on public.cafe_menu_files;
create trigger cafe_menu_files_limit before insert on public.cafe_menu_files for each row execute function public.cafe_media_limits();

alter table public.cafe_pages enable row level security;
alter table public.cafe_photos enable row level security;
alter table public.cafe_menu_files enable row level security;
revoke all on table public.cafe_pages, public.cafe_photos, public.cafe_menu_files from anon, authenticated;
grant select on table public.cafe_pages, public.cafe_photos, public.cafe_menu_files to anon, authenticated;
grant insert, update, delete on table public.cafe_pages, public.cafe_photos, public.cafe_menu_files to authenticated;

do $$
declare t text;
begin
  foreach t in array array['cafe_pages', 'cafe_photos', 'cafe_menu_files'] loop
    execute format('drop policy if exists "%1$s: public read" on public.%1$s', t);
    execute format('create policy "%1$s: public read" on public.%1$s for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "%1$s: owner add" on public.%1$s', t);
    execute format('create policy "%1$s: owner add" on public.%1$s for insert to authenticated with check (exists (select 1 from public.cafe_owners o where o.cafe_id = %1$s.cafe_id and o.user_id = auth.uid()))', t);
    execute format('drop policy if exists "%1$s: owner edit" on public.%1$s', t);
    execute format('create policy "%1$s: owner edit" on public.%1$s for update to authenticated using (exists (select 1 from public.cafe_owners o where o.cafe_id = %1$s.cafe_id and o.user_id = auth.uid())) with check (exists (select 1 from public.cafe_owners o where o.cafe_id = %1$s.cafe_id and o.user_id = auth.uid()))', t);
    execute format('drop policy if exists "%1$s: owner remove" on public.%1$s', t);
    execute format('create policy "%1$s: owner remove" on public.%1$s for delete to authenticated using (exists (select 1 from public.cafe_owners o where o.cafe_id = %1$s.cafe_id and o.user_id = auth.uid()))', t);
  end loop;
end $$;

-- Pictures and menu files: a public bucket, one folder per café (the folder name is the café id), writable only by that café's owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cafe-media', 'cafe-media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = true, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
drop policy if exists "cafe media: owner add" on storage.objects;
create policy "cafe media: owner add" on storage.objects for insert to authenticated
  with check (bucket_id = 'cafe-media' and exists (select 1 from public.cafe_owners o where o.cafe_id = (storage.foldername(name))[1] and o.user_id = auth.uid()));
drop policy if exists "cafe media: owner remove" on storage.objects;
create policy "cafe media: owner remove" on storage.objects for delete to authenticated
  using (bucket_id = 'cafe-media' and exists (select 1 from public.cafe_owners o where o.cafe_id = (storage.foldername(name))[1] and o.user_id = auth.uid()));
