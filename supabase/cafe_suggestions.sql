-- MatchaDB café suggestions: anyone can submit one; nobody can read them with the public key.
-- Run once in the Supabase SQL editor (idempotent: safe to run again).
-- Suggestions are read only with the secret key, by scripts/cafes/weekly/pull_suggestions.py on your own machine.
-- A suggestion is only a lead. A café goes on the map after it is checked against its own menu.

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

alter table public.cafe_suggestions enable row level security;

-- The public key may add a row and nothing else: no select, update or delete policy exists.
drop policy if exists "cafe_suggestions: anyone can add" on public.cafe_suggestions;
create policy "cafe_suggestions: anyone can add" on public.cafe_suggestions
  for insert to anon, authenticated
  with check (status = 'new' and reviewer_note is null);

revoke all on table public.cafe_suggestions from anon, authenticated;
grant insert (name, address, link, note, email, locale) on table public.cafe_suggestions to anon, authenticated;
