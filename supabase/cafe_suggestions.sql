-- MatchaDB café suggestions: only signed-in members can submit one; nobody can read them with the public key.
-- Run once in the Supabase SQL editor (idempotent: safe to run again).
-- Suggestions are read only with the secret key, by the review scripts in scripts/cafes/suggestions/ on your own machine.
-- A suggestion comes from a real person who knows the place, so the review only checks that the place exists and where it is.

create table if not exists public.cafe_suggestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  address text not null check (char_length(btrim(address)) between 3 and 200),
  link text check (link is null or char_length(link) <= 300),
  note text check (note is null or char_length(note) <= 500),
  email text check (email is null or char_length(email) <= 200),
  locale text check (locale is null or char_length(locale) <= 8),
  status text not null default 'new' check (status in ('new', 'checking', 'added', 'rejected')),
  reviewer_note text
);

-- Who sent it: filled in by the database from the member's own sign-in, never by the browser.
alter table public.cafe_suggestions add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete set null;
alter table public.cafe_suggestions alter column user_id set default auth.uid();
alter table public.cafe_suggestions alter column email set default (auth.jwt() ->> 'email');

alter table public.cafe_suggestions enable row level security;

-- Signed-in members may add a row for themselves and nothing else: no select, update or delete policy exists.
-- Visitors who are not signed in can no longer add one.
drop policy if exists "cafe_suggestions: anyone can add" on public.cafe_suggestions;
drop policy if exists "cafe_suggestions: members can add" on public.cafe_suggestions;
create policy "cafe_suggestions: members can add" on public.cafe_suggestions
  for insert to authenticated
  with check (status = 'new' and reviewer_note is null and user_id = auth.uid());

revoke all on table public.cafe_suggestions from anon, authenticated;
grant insert (name, address, link, locale) on table public.cafe_suggestions to authenticated;
