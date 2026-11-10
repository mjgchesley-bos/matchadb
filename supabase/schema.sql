-- MatchaDB accounts: profiles, favorites, ratings, reviews, reports.
-- Run once in the Supabase SQL editor (idempotent: safe to run again).
-- Row Level Security is what protects the data: the publishable key ships to every
-- browser, so every table below is locked down by policies, never by hiding the key.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_display_name_key on public.profiles (lower(display_name));
alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Names that could pass for the site or its moderators are not allowed.
-- Names that could pass for the site or its moderators are reserved for members on the private staff list
-- (a table with row level security and no policies: only the service role can read or write it).
create table if not exists public.staff (user_id uuid primary key references auth.users (id) on delete cascade);
alter table public.staff enable row level security;
create or replace function public.guard_display_name() returns trigger
language plpgsql security definer set search_path = public as $
begin
  if new.display_name ~* '(matchadb|admin|moderator|official)' and not exists (select 1 from public.staff where user_id = new.id) then
    raise exception 'That name is reserved.' using errcode = '23514';
  end if;
  return new;
end;
$;
alter table public.profiles drop constraint if exists profiles_display_name_reserved;
drop trigger if exists profiles_guard_name on public.profiles;
create trigger profiles_guard_name before insert or update of display_name on public.profiles for each row execute function public.guard_display_name();

-- New sign-ups get a neutral public name, never their real name or email.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, 'Matcha fan ' || substr(md5(new.id::text), 1, 5))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- favorites
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id integer not null check (product_id between 1 and 100000),
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.favorites enable row level security;
drop policy if exists "favorites: read own" on public.favorites;
create policy "favorites: read own" on public.favorites for select to authenticated using (user_id = auth.uid());
drop policy if exists "favorites: add own" on public.favorites;
create policy "favorites: add own" on public.favorites for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "favorites: remove own" on public.favorites;
create policy "favorites: remove own" on public.favorites for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------- ratings
create table if not exists public.ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id integer not null check (product_id between 1 and 100000),
  score numeric(2, 1) not null check (score >= 0.5 and score <= 5 and mod(score * 2, 1) = 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.ratings enable row level security;
drop policy if exists "ratings: read own" on public.ratings;
create policy "ratings: read own" on public.ratings for select to authenticated using (user_id = auth.uid());
drop policy if exists "ratings: add own" on public.ratings;
create policy "ratings: add own" on public.ratings for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "ratings: change own" on public.ratings;
create policy "ratings: change own" on public.ratings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "ratings: remove own" on public.ratings;
create policy "ratings: remove own" on public.ratings for delete to authenticated using (user_id = auth.uid());

-- Anyone may see the totals; nobody but the owner may see who rated what.
create or replace view public.rating_stats with (security_invoker = false) as
  select product_id, count(*)::integer as rating_count, round(avg(score), 2)::float8 as average
  from public.ratings group by product_id;
grant select on public.rating_stats to anon, authenticated;

-- ---------------------------------------------------------------- reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id integer not null check (product_id between 1 and 100000),
  body text not null check (char_length(body) between 20 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.reviews enable row level security;
drop policy if exists "reviews: read own" on public.reviews;
create policy "reviews: read own" on public.reviews for select to authenticated using (user_id = auth.uid());
drop policy if exists "reviews: write own" on public.reviews;
create policy "reviews: write own" on public.reviews for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "reviews: edit own" on public.reviews;
create policy "reviews: edit own" on public.reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "reviews: delete own" on public.reviews;
create policy "reviews: delete own" on public.reviews for delete to authenticated using (user_id = auth.uid());

-- At most 10 new reviews per person per day.
create or replace function public.limit_review_rate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reviews where user_id = new.user_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Too many reviews today. Try again tomorrow.';
  end if;
  return new;
end;
$$;
drop trigger if exists reviews_rate_limit on public.reviews;
create trigger reviews_rate_limit before insert on public.reviews
  for each row execute function public.limit_review_rate();

-- What the public sees: approved reviews with the author's display name and their star rating.
create or replace view public.approved_reviews with (security_invoker = false) as
  select r.id, r.product_id, r.body, r.created_at, p.display_name, rt.score as rating
  from public.reviews r
  join public.profiles p on p.id = r.user_id
  left join public.ratings rt on rt.user_id = r.user_id and rt.product_id = r.product_id
  where r.status = 'approved';
grant select on public.approved_reviews to anon, authenticated;

-- ---------------------------------------------------------------- reports
create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)
);
alter table public.review_reports enable row level security;
drop policy if exists "reports: file own" on public.review_reports;
create policy "reports: file own" on public.review_reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- ====================================================================== community (comments, photos, favorite brands)
-- ---------------------------------------------------------------- favorite brands
create table if not exists public.favorite_brands (
  user_id uuid not null references auth.users (id) on delete cascade,
  brand text not null check (char_length(brand) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key (user_id, brand)
);
alter table public.favorite_brands enable row level security;
drop policy if exists "favorite brands: read own" on public.favorite_brands;
create policy "favorite brands: read own" on public.favorite_brands for select to authenticated using (user_id = auth.uid());
drop policy if exists "favorite brands: add own" on public.favorite_brands;
create policy "favorite brands: add own" on public.favorite_brands for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "favorite brands: remove own" on public.favorite_brands;
create policy "favorite brands: remove own" on public.favorite_brands for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------- favorite cafés (ids from data/cafes)
create table if not exists public.favorite_cafes (
  user_id uuid not null references auth.users (id) on delete cascade,
  cafe_id text not null check (cafe_id ~ '^([0-9a-f]{10}|fsq[0-9a-f]{7})$'),
  created_at timestamptz not null default now(),
  primary key (user_id, cafe_id)
);
alter table public.favorite_cafes enable row level security;
drop policy if exists "favorite cafes: read own" on public.favorite_cafes;
create policy "favorite cafes: read own" on public.favorite_cafes for select to authenticated using (user_id = auth.uid());
drop policy if exists "favorite cafes: add own" on public.favorite_cafes;
create policy "favorite cafes: add own" on public.favorite_cafes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "favorite cafes: remove own" on public.favorite_cafes;
create policy "favorite cafes: remove own" on public.favorite_cafes for delete to authenticated using (user_id = auth.uid());

-- How many people saved each product or brand (counts only, never who).
create or replace view public.favorite_counts with (security_invoker = false) as
  select 'product'::text as kind, product_id::text as key, count(*)::integer as saves from public.favorites group by product_id
  union all
  select 'brand'::text, brand, count(*)::integer from public.favorite_brands group by brand
  union all
  select 'cafe'::text, cafe_id, count(*)::integer from public.favorite_cafes group by cafe_id;
grant select on public.favorite_counts to anon, authenticated;

-- ---------------------------------------------------------------- comments (with photos)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('product', 'brand')),
  target_key text not null check (char_length(target_key) between 1 and 120),
  body text not null check (char_length(body) between 1 and 1500),
  photos text[] not null default '{}' check (coalesce(array_length(photos, 1), 0) <= 3),
  status text not null default 'approved' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now()
);
create index if not exists comments_target_idx on public.comments (target_type, target_key, created_at desc);
alter table public.comments enable row level security;
drop policy if exists "comments: read own" on public.comments;
create policy "comments: read own" on public.comments for select to authenticated using (user_id = auth.uid());
drop policy if exists "comments: write own" on public.comments;
create policy "comments: write own" on public.comments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "comments: delete own" on public.comments;
create policy "comments: delete own" on public.comments for delete to authenticated using (user_id = auth.uid());

-- The database decides the status: text-only comments publish at once, anything with photos waits
-- for approval. Also caps comments per day and makes photos live in the author's own folder.
create or replace function public.prepare_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare p text;
begin
  if (select count(*) from public.comments where user_id = new.user_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Too many comments today. Try again tomorrow.';
  end if;
  foreach p in array coalesce(new.photos, '{}') loop
    if p not like new.user_id::text || '/%' then
      raise exception 'Invalid photo path';
    end if;
  end loop;
  new.status := case when coalesce(array_length(new.photos, 1), 0) > 0 then 'pending' else 'approved' end;
  return new;
end;
$$;
drop trigger if exists comments_prepare on public.comments;
create trigger comments_prepare before insert on public.comments for each row execute function public.prepare_comment();

create or replace view public.approved_comments with (security_invoker = false) as
  select c.id, c.target_type, c.target_key, c.body, c.photos, c.created_at, p.display_name
  from public.comments c
  join public.profiles p on p.id = c.user_id
  where c.status = 'approved';
grant select on public.approved_comments to anon, authenticated;

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);
alter table public.comment_reports enable row level security;
drop policy if exists "comment reports: file own" on public.comment_reports;
create policy "comment reports: file own" on public.comment_reports for insert to authenticated with check (reporter_id = auth.uid());

-- ---------------------------------------------------------------- photo storage
-- Public bucket (files get random names), images only, 5 MB max; each member can only add or
-- remove files in their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comment-photos', 'comment-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "comment photos: upload own" on storage.objects;
create policy "comment photos: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'comment-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "comment photos: remove own" on storage.objects;
create policy "comment photos: remove own" on storage.objects for delete to authenticated
  using (bucket_id = 'comment-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ====================================================================== shelves, visits, research folder, member tiers
create table if not exists public.shelf (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id integer not null check (product_id between 1 and 100000),
  status text not null check (status in ('want', 'using', 'tried')),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.shelf enable row level security;
drop policy if exists "shelf: read own" on public.shelf;
create policy "shelf: read own" on public.shelf for select to authenticated using (user_id = auth.uid());
drop policy if exists "shelf: add own" on public.shelf;
create policy "shelf: add own" on public.shelf for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "shelf: change own" on public.shelf;
create policy "shelf: change own" on public.shelf for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "shelf: remove own" on public.shelf;
create policy "shelf: remove own" on public.shelf for delete to authenticated using (user_id = auth.uid());

-- One row per member per day they visit while signed in (counts toward their tier).
create table if not exists public.member_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default ((now() at time zone 'utc')::date),
  primary key (user_id, day)
);
alter table public.member_days enable row level security;
drop policy if exists "member days: read own" on public.member_days;
create policy "member days: read own" on public.member_days for select to authenticated using (user_id = auth.uid());
drop policy if exists "member days: add own" on public.member_days;
create policy "member days: add own" on public.member_days for insert to authenticated with check (user_id = auth.uid());

create table if not exists public.research_bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  study_id integer not null check (study_id between 1 and 1000000),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, study_id)
);
alter table public.research_bookmarks enable row level security;
drop policy if exists "bookmarks: read own" on public.research_bookmarks;
create policy "bookmarks: read own" on public.research_bookmarks for select to authenticated using (user_id = auth.uid());
drop policy if exists "bookmarks: add own" on public.research_bookmarks;
create policy "bookmarks: add own" on public.research_bookmarks for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "bookmarks: change own" on public.research_bookmarks;
create policy "bookmarks: change own" on public.research_bookmarks for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "bookmarks: remove own" on public.research_bookmarks;
create policy "bookmarks: remove own" on public.research_bookmarks for delete to authenticated using (user_id = auth.uid());

-- Member points: each kind of activity is capped so nobody can farm a tier. Only approved reviews and
-- comments count, so the top tiers need real contributions. Tiers: Member 0, Bronze 10, Silver 40,
-- Gold 100, Matcha Master 220.
create or replace function public.member_points(p_uid uuid) returns integer
language sql stable security definer set search_path = public as $$
  select (
    least((select count(*) from public.ratings where user_id = p_uid), 50) * 2
    + least((select count(*) from public.favorites where user_id = p_uid), 30)
    + least((select count(*) from public.favorite_brands where user_id = p_uid), 20)
    + least((select count(*) from public.favorite_cafes where user_id = p_uid), 20)
    + least((select count(*) from public.shelf where user_id = p_uid), 50)
    + least((select count(*) from public.reviews where user_id = p_uid and status = 'approved'), 10) * 10
    + least((select count(*) from public.comments where user_id = p_uid and status = 'approved'), 20) * 3
    + least((select coalesce(sum(coalesce(array_length(photos, 1), 0)), 0) from public.comments where user_id = p_uid and status = 'approved'), 20) * 2
    + least((select count(*) from public.research_bookmarks where user_id = p_uid), 20)
    + least((select count(*) from public.member_days where user_id = p_uid), 60)
  )::integer;
$$;

create or replace function public.member_tier(p integer) returns text
language sql immutable as $$
  select case when p >= 220 then 'Matcha Master' when p >= 100 then 'Gold' when p >= 40 then 'Silver' when p >= 10 then 'Bronze' else 'Member' end;
$$;

create or replace function public.my_stats() returns json
language plpgsql stable security definer set search_path = public as $$
declare u uuid := auth.uid(); p integer;
begin
  if u is null then return null; end if;
  p := public.member_points(u);
  return json_build_object(
    'points', p,
    'tier', public.member_tier(p),
    'next_tier', case when p < 10 then 'Bronze' when p < 40 then 'Silver' when p < 100 then 'Gold' when p < 220 then 'Matcha Master' end,
    'next_at', case when p < 10 then 10 when p < 40 then 40 when p < 100 then 100 when p < 220 then 220 end,
    'ratings', (select count(*) from public.ratings where user_id = u),
    'reviews', (select count(*) from public.reviews where user_id = u and status = 'approved'),
    'comments', (select count(*) from public.comments where user_id = u and status = 'approved'),
    'photos', (select coalesce(sum(coalesce(array_length(photos, 1), 0)), 0) from public.comments where user_id = u and status = 'approved'),
    'saves', (select count(*) from public.favorites where user_id = u),
    'brands', (select count(*) from public.favorite_brands where user_id = u),
    'shelf', (select count(*) from public.shelf where user_id = u),
    'bookmarks', (select count(*) from public.research_bookmarks where user_id = u),
    'days', (select count(*) from public.member_days where user_id = u)
  );
end;
$$;
-- Postgres checks function permission as the caller even inside a view, so the tier helpers are callable by everyone
-- (they only reveal a tier for a user id, and user ids are never public).
grant execute on function public.member_points(uuid) to anon, authenticated;
grant execute on function public.member_tier(integer) to anon, authenticated;
revoke execute on function public.my_stats() from public, anon;
grant execute on function public.my_stats() to authenticated;

-- Show the author's tier next to their name on public reviews and comments.
create or replace view public.approved_reviews with (security_invoker = false) as
  select r.id, r.product_id, r.body, r.created_at, p.display_name, rt.score as rating,
         public.member_tier(public.member_points(r.user_id)) as tier
  from public.reviews r
  join public.profiles p on p.id = r.user_id
  left join public.ratings rt on rt.user_id = r.user_id and rt.product_id = r.product_id
  where r.status = 'approved';
grant select on public.approved_reviews to anon, authenticated;

create or replace view public.approved_comments with (security_invoker = false) as
  select c.id, c.target_type, c.target_key, c.body, c.photos, c.created_at, p.display_name,
         public.member_tier(public.member_points(c.user_id)) as tier
  from public.comments c
  join public.profiles p on p.id = c.user_id
  where c.status = 'approved';
grant select on public.approved_comments to anon, authenticated;

-- ====================================================================== public profiles, custom lists, tasting challenge
alter table public.profiles add column if not exists is_public boolean not null default false;
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists avatar text;
alter table public.profiles add column if not exists how_i_drink text;
alter table public.profiles add column if not exists challenge_goal integer;
alter table public.profiles drop constraint if exists profiles_bio_check;
alter table public.profiles add constraint profiles_bio_check check (char_length(bio) <= 140 and bio !~* '(https?://|www\.|\.com|\.net|\.org)');
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (avatar is null or avatar in ('cup', 'whisk', 'leaf', 'tin', 'kettle', 'sprout', 'bowl', 'spoon', 'bamboo', 'blossom', 'mountain', 'teapot'));
alter table public.profiles drop constraint if exists profiles_how_check;
alter table public.profiles add constraint profiles_how_check check (how_i_drink is null or how_i_drink in ('lattes', 'usucha', 'koicha', 'iced', 'baking', 'everything'));
alter table public.profiles drop constraint if exists profiles_goal_check;
alter table public.profiles add constraint profiles_goal_check check (challenge_goal is null or challenge_goal between 1 and 365);

-- Custom lists ("Best for lattes", "Gift ideas"): up to 10 lists of up to 100 matchas each.
create table if not exists public.custom_shelves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create table if not exists public.custom_shelf_items (
  shelf_id uuid not null references public.custom_shelves (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id integer not null check (product_id between 1 and 100000),
  added_at timestamptz not null default now(),
  primary key (shelf_id, product_id)
);
alter table public.custom_shelves enable row level security;
alter table public.custom_shelf_items enable row level security;
drop policy if exists "lists: read own" on public.custom_shelves;
create policy "lists: read own" on public.custom_shelves for select to authenticated using (user_id = auth.uid());
drop policy if exists "lists: add own" on public.custom_shelves;
create policy "lists: add own" on public.custom_shelves for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "lists: rename own" on public.custom_shelves;
create policy "lists: rename own" on public.custom_shelves for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "lists: delete own" on public.custom_shelves;
create policy "lists: delete own" on public.custom_shelves for delete to authenticated using (user_id = auth.uid());
drop policy if exists "list items: read own" on public.custom_shelf_items;
create policy "list items: read own" on public.custom_shelf_items for select to authenticated using (user_id = auth.uid());
drop policy if exists "list items: add own" on public.custom_shelf_items;
create policy "list items: add own" on public.custom_shelf_items for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.custom_shelves s where s.id = shelf_id and s.user_id = auth.uid()));
drop policy if exists "list items: remove own" on public.custom_shelf_items;
create policy "list items: remove own" on public.custom_shelf_items for delete to authenticated using (user_id = auth.uid());

create or replace function public.limit_lists() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.custom_shelves where user_id = new.user_id) >= 10 then
    raise exception 'You can have up to 10 lists.';
  end if;
  return new;
end;
$$;
drop trigger if exists custom_shelves_limit on public.custom_shelves;
create trigger custom_shelves_limit before insert on public.custom_shelves for each row execute function public.limit_lists();
create or replace function public.limit_list_items() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.custom_shelf_items where shelf_id = new.shelf_id) >= 100 then
    raise exception 'A list can hold up to 100 matchas.';
  end if;
  return new;
end;
$$;
drop trigger if exists custom_shelf_items_limit on public.custom_shelf_items;
create trigger custom_shelf_items_limit before insert on public.custom_shelf_items for each row execute function public.limit_list_items();

-- How many members have each product on a shelf (counts only).
create or replace view public.shelf_counts with (security_invoker = false) as
  select product_id, status, count(*)::integer as members from public.shelf group by product_id, status;
grant select on public.shelf_counts to anon, authenticated;

-- One place that computes a member's activity numbers; my_stats() and public_profile() both use it.
create or replace function public.member_stats_json(u uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare p integer;
begin
  p := public.member_points(u);
  return json_build_object(
    'points', p,
    'tier', public.member_tier(p),
    'next_tier', case when p < 10 then 'Bronze' when p < 40 then 'Silver' when p < 100 then 'Gold' when p < 220 then 'Matcha Master' end,
    'next_at', case when p < 10 then 10 when p < 40 then 40 when p < 100 then 100 when p < 220 then 220 end,
    'ratings', (select count(*) from public.ratings where user_id = u),
    'reviews', (select count(*) from public.reviews where user_id = u and status = 'approved'),
    'comments', (select count(*) from public.comments where user_id = u and status = 'approved'),
    'photos', (select coalesce(sum(coalesce(array_length(photos, 1), 0)), 0) from public.comments where user_id = u and status = 'approved'),
    'saves', (select count(*) from public.favorites where user_id = u),
    'brands', (select count(*) from public.favorite_brands where user_id = u),
    'cafes', (select count(*) from public.favorite_cafes where user_id = u),
    'shelf', (select count(*) from public.shelf where user_id = u),
    'bookmarks', (select count(*) from public.research_bookmarks where user_id = u),
    'days', (select count(*) from public.member_days where user_id = u)
  );
end;
$$;
revoke execute on function public.member_stats_json(uuid) from public, anon, authenticated;
create or replace function public.my_stats() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then return null; end if;
  return public.member_stats_json(auth.uid());
end;
$$;

-- The only way to read another member's profile: a member who switched "public profile" on. Returns
-- nothing for anyone else, never exposes ids or email, and includes only what the profile page shows.
create or replace function public.public_profile(p_name text) returns json
language plpgsql stable security definer set search_path = public as $$
declare pr record; u uuid; yr timestamptz := date_trunc('year', now());
begin
  select * into pr from public.profiles where lower(display_name) = lower(p_name) and is_public;
  if not found then return null; end if;
  u := pr.id;
  return json_build_object(
    'name', pr.display_name, 'bio', pr.bio, 'avatar', pr.avatar, 'avatar_path', pr.avatar_path, 'how', pr.how_i_drink, 'since', pr.created_at, 'goal', pr.challenge_goal,
    'tried_this_year', (select count(*) from public.shelf where user_id = u and status = 'tried' and updated_at >= yr),
    'stats', public.member_stats_json(u),
    'shelf', coalesce((select json_agg(json_build_object('product_id', product_id, 'status', status) order by updated_at desc) from public.shelf where user_id = u), '[]'::json),
    'ratings', coalesce((select json_agg(json_build_object('product_id', product_id, 'score', score) order by score desc, updated_at desc)
                         from (select product_id, score, updated_at from public.ratings where user_id = u order by score desc, updated_at desc limit 40) r), '[]'::json),
    'brands', coalesce((select json_agg(brand order by created_at desc) from public.favorite_brands where user_id = u), '[]'::json),
    'cafes', coalesce((select json_agg(cafe_id order by created_at desc) from public.favorite_cafes where user_id = u), '[]'::json),
    'lists', coalesce((select json_agg(json_build_object('name', s.name, 'items', coalesce((select json_agg(i.product_id order by i.added_at desc) from public.custom_shelf_items i where i.shelf_id = s.id), '[]'::json)) order by s.created_at)
                       from public.custom_shelves s where s.user_id = u), '[]'::json),
    'reviews', coalesce((select json_agg(json_build_object('product_id', product_id, 'body', body, 'created_at', created_at) order by created_at desc)
                         from (select product_id, body, created_at from public.reviews where user_id = u and status = 'approved' order by created_at desc limit 5) rv), '[]'::json),
    'photos', coalesce((select json_agg(ph) from (select unnest(photos) as ph from (select photos from public.comments where user_id = u and status = 'approved' order by created_at desc limit 12) c) x), '[]'::json)
  );
end;
$$;
grant execute on function public.public_profile(text) to anon, authenticated;

create table if not exists public.profile_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  profile_name text not null check (char_length(profile_name) between 1 and 60),
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  unique (reporter_id, profile_name)
);
alter table public.profile_reports enable row level security;
drop policy if exists "profile reports: file own" on public.profile_reports;
create policy "profile reports: file own" on public.profile_reports for insert to authenticated with check (reporter_id = auth.uid());

-- Link usernames to public profiles where the member has one.
create or replace view public.approved_reviews with (security_invoker = false) as
  select r.id, r.product_id, r.body, r.created_at, p.display_name, rt.score as rating,
         public.member_tier(public.member_points(r.user_id)) as tier, p.is_public as public_profile
  from public.reviews r
  join public.profiles p on p.id = r.user_id
  left join public.ratings rt on rt.user_id = r.user_id and rt.product_id = r.product_id
  where r.status = 'approved';
grant select on public.approved_reviews to anon, authenticated;
create or replace view public.approved_comments with (security_invoker = false) as
  select c.id, c.target_type, c.target_key, c.body, c.photos, c.created_at, p.display_name,
         public.member_tier(public.member_points(c.user_id)) as tier, p.is_public as public_profile
  from public.comments c
  join public.profiles p on p.id = c.user_id
  where c.status = 'approved';
grant select on public.approved_comments to anon, authenticated;

-- Profile photo: a public 'avatars' bucket (JPEG only, 1 MB; each member can only add or remove files in their
-- own folder) and a pointer on the profile that must live in the member's own folder.
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles drop constraint if exists profiles_avatar_path_check;
alter table public.profiles add constraint profiles_avatar_path_check check (avatar_path is null or avatar_path like id::text || '/%');
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 1048576, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "avatars: upload own" on storage.objects;
create policy "avatars: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars: remove own" on storage.objects;
create policy "avatars: remove own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Home page "Popular right now": products ranked by member activity (saves 3, reviews 3, shelf adds 2,
-- ratings 2). Only product ids and a score are exposed, never who did what.
create or replace view public.popular_products with (security_invoker = false) as
  select product_id, sum(w)::integer as score from (
    select product_id, 3 as w from public.favorites
    union all select product_id, 2 from public.shelf
    union all select product_id, 2 from public.ratings
    union all select product_id, 3 from public.reviews where status = 'approved'
  ) t group by product_id order by score desc limit 12;
grant select on public.popular_products to anon, authenticated;

-- ---------------------------------------------------------------- cafes (matcha cafe finder)
-- Cafes themselves live in data/cafes.json (ids are Overture place ids). Members rate them (here) and
-- comment with photos (comments table, target_type 'cafe', target_key = cafe id).
alter table public.comments drop constraint if exists comments_target_type_check;
alter table public.comments add constraint comments_target_type_check check (target_type in ('product', 'brand', 'cafe'));

create table if not exists public.cafe_ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  cafe_id text not null check (char_length(cafe_id) between 8 and 60),
  score numeric(2, 1) not null check (score >= 0.5 and score <= 5 and mod(score * 2, 1) = 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, cafe_id)
);
alter table public.cafe_ratings enable row level security;
drop policy if exists "cafe_ratings: read own" on public.cafe_ratings;
create policy "cafe_ratings: read own" on public.cafe_ratings for select to authenticated using (user_id = auth.uid());
drop policy if exists "cafe_ratings: add own" on public.cafe_ratings;
create policy "cafe_ratings: add own" on public.cafe_ratings for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "cafe_ratings: change own" on public.cafe_ratings;
create policy "cafe_ratings: change own" on public.cafe_ratings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "cafe_ratings: remove own" on public.cafe_ratings;
create policy "cafe_ratings: remove own" on public.cafe_ratings for delete to authenticated using (user_id = auth.uid());
create or replace view public.cafe_rating_stats with (security_invoker = false) as
  select cafe_id, count(*)::integer as rating_count, round(avg(score), 2)::float8 as average
  from public.cafe_ratings group by cafe_id;
grant select on public.cafe_rating_stats to anon, authenticated;
