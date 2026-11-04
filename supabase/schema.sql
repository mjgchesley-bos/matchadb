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
