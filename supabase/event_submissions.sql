-- MatchaDB: "Post an event" and event photos. Run once in the Supabase SQL editor (idempotent: safe to run again).
-- Needs public.staff and public.is_staff() from admin_activity.sql.
--
-- Flow: a signed-in member posts an event (link, details, optional flyer or photos) -> it waits as "pending" -> staff review it in /admin ->
-- when approved it appears on the events page with its own page. Members can also add photos or flyers from past editions to any event;
-- those wait for review too. Pictures upload to a private bucket (event-uploads); on approval staff copy them to the public bucket (event-media).
-- Nobody but staff can read pending rows other than their own, and contact emails are never exposed publicly.

-- ---------------------------------------------------------------- tables
create table if not exists public.event_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  name text not null check (char_length(btrim(name)) between 3 and 120),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  city text not null check (char_length(btrim(city)) between 2 and 80),
  country text not null check (char_length(btrim(country)) between 2 and 60),
  continent text check (continent is null or continent in ('North America', 'South America', 'Europe', 'Asia', 'Oceania', 'Africa')),
  venue text check (venue is null or char_length(venue) <= 160),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  organizer text check (organizer is null or char_length(organizer) <= 120),
  url text not null check (url ~ '^https://[^ ]+$' and char_length(url) <= 300),
  description text check (description is null or char_length(description) <= 1500),
  contact_email text check (contact_email is null or char_length(contact_email) <= 200),
  images text[] not null default '{}' check (coalesce(array_length(images, 1), 0) <= 4),
  rights_ok boolean not null default false check (rights_ok),
  admin_note text,
  approved_at timestamptz
);
alter table public.event_submissions alter column contact_email set default (auth.jwt() ->> 'email');

create table if not exists public.event_photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event_id text not null check (char_length(event_id) between 3 and 160),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  path text not null check (char_length(path) <= 200),
  caption text check (caption is null or char_length(caption) <= 200),
  year integer check (year is null or year between 1990 and 2100),
  credit text check (credit is null or char_length(credit) <= 120),
  rights_ok boolean not null default false check (rights_ok),
  admin_note text
);

alter table public.event_submissions enable row level security;
alter table public.event_photos enable row level security;

-- ---------------------------------------------------------------- policies (rows)
drop policy if exists "event_submissions: add own" on public.event_submissions;
create policy "event_submissions: add own" on public.event_submissions for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and rights_ok and approved_at is null and admin_note is null);
drop policy if exists "event_submissions: read own or staff" on public.event_submissions;
create policy "event_submissions: read own or staff" on public.event_submissions for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists "event_submissions: staff review" on public.event_submissions;
create policy "event_submissions: staff review" on public.event_submissions for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "event_photos: add own" on public.event_photos;
create policy "event_photos: add own" on public.event_photos for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and rights_ok and admin_note is null);
drop policy if exists "event_photos: read own or staff" on public.event_photos;
create policy "event_photos: read own or staff" on public.event_photos for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
drop policy if exists "event_photos: staff review" on public.event_photos;
create policy "event_photos: staff review" on public.event_photos for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Members may only fill in the content columns; status, notes and approval are staff-only.
revoke all on table public.event_submissions from anon, authenticated;
grant select on table public.event_submissions to authenticated;
grant insert (name, start_date, end_date, city, country, venue, organizer, url, description, images, rights_ok) on table public.event_submissions to authenticated;
grant update on table public.event_submissions to authenticated; -- narrowed by the staff-only policy above
revoke all on table public.event_photos from anon, authenticated;
grant select on table public.event_photos to authenticated;
grant insert (event_id, path, caption, year, credit, rights_ok) on table public.event_photos to authenticated;
grant update on table public.event_photos to authenticated;

-- At most 5 submissions and 12 photos a day per member.
create or replace function public.event_limits() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'event_submissions' and (select count(*) from public.event_submissions where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'daily limit reached' using errcode = 'P0001';
  end if;
  if tg_table_name = 'event_photos' and (select count(*) from public.event_photos where user_id = new.user_id and created_at > now() - interval '1 day') >= 12 then
    raise exception 'daily limit reached' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists event_submissions_limit on public.event_submissions;
create trigger event_submissions_limit before insert on public.event_submissions for each row execute function public.event_limits();
drop trigger if exists event_photos_limit on public.event_photos;
create trigger event_photos_limit before insert on public.event_photos for each row execute function public.event_limits();

-- ---------------------------------------------------------------- public reads (approved only, no emails, no user ids)
create or replace function public.public_events()
returns table (id text, name text, start_date date, end_date date, city text, country text, continent text, venue text, lat double precision, lng double precision, organizer text, url text, description text, images text[])
language sql stable security definer set search_path = public as $$
  select 'community-' || substr(e.id::text, 1, 8), e.name, e.start_date, e.end_date, e.city, e.country, e.continent, e.venue, e.lat, e.lng, e.organizer, e.url, e.description, e.images
  from public.event_submissions e where e.status = 'approved' and e.lat is not null and e.lng is not null and e.continent is not null;
$$;
grant execute on function public.public_events() to anon, authenticated;

create or replace function public.public_event_photos(p_event text)
returns table (path text, caption text, year integer, credit text)
language sql stable security definer set search_path = public as $$
  select p.path, p.caption, p.year, p.credit from public.event_photos p where p.event_id = p_event and p.status = 'approved' order by p.created_at;
$$;
grant execute on function public.public_event_photos(text) to anon, authenticated;

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-uploads', 'event-uploads', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-media', 'event-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "event uploads: add own" on storage.objects;
create policy "event uploads: add own" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "event uploads: read own or staff" on storage.objects;
create policy "event uploads: read own or staff" on storage.objects for select to authenticated
  using (bucket_id = 'event-uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));
drop policy if exists "event uploads: staff remove" on storage.objects;
create policy "event uploads: staff remove" on storage.objects for delete to authenticated
  using (bucket_id = 'event-uploads' and public.is_staff());
drop policy if exists "event media: staff add" on storage.objects;
create policy "event media: staff add" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-media' and public.is_staff());
drop policy if exists "event media: staff remove" on storage.objects;
create policy "event media: staff remove" on storage.objects for delete to authenticated
  using (bucket_id = 'event-media' and public.is_staff());
