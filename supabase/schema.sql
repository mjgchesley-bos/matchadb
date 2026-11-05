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
alter table public.profiles drop constraint if exists profiles_display_name_reserved;
alter table public.profiles add constraint profiles_display_name_reserved check (display_name !~* '(matchadb|admin|moderator|official)');

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

-- How many people saved each product or brand (counts only, never who).
create or replace view public.favorite_counts with (security_invoker = false) as
  select 'product'::text as kind, product_id::text as key, count(*)::integer as saves from public.favorites group by product_id
  union all
  select 'brand'::text, brand, count(*)::integer from public.favorite_brands group by brand;
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
