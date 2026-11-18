-- MatchaDB: designed avatars, account types (general / café owner / wholesaler), owner-managed café menus, and direct messages.
-- Run once in the Supabase SQL editor (idempotent: safe to run again). Needs schema.sql, friends.sql and admin_activity.sql first.

-- ---------------------------------------------------------------- designed avatars
-- A designed avatar is stored in profiles.avatar as "d:" + 7 base-36 characters (background, skin, hair style, hair colour, eyes, mouth, extra).
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (
  avatar is null
  or avatar in ('cup', 'whisk', 'leaf', 'tin', 'kettle', 'sprout', 'bowl', 'spoon', 'bamboo', 'blossom', 'mountain', 'teapot')
  or avatar ~ '^d:[0-9a-z]{7}$'
);

-- ---------------------------------------------------------------- account types
-- general (everyone), cafe_owner and wholesaler. A member cannot set their own type: only staff or the service role can
-- (the trigger below puts the old value back for anyone else). Members ask for a type with an account request; the owner approves it.
alter table public.profiles add column if not exists account_type text not null default 'general';
alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check check (account_type in ('general', 'cafe_owner', 'wholesaler'));
alter table public.profiles add column if not exists business_name text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists about text;
alter table public.profiles add column if not exists accept_dms boolean not null default true;
alter table public.profiles drop constraint if exists profiles_business_check;
alter table public.profiles add constraint profiles_business_check check (
  (business_name is null or char_length(business_name) <= 60)
  and (website is null or (char_length(website) <= 120 and website ~* '^https://[^\s]+$'))
  and (about is null or char_length(about) <= 600)
);

create or replace function public.guard_account_type() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    new.account_type := old.account_type;
  end if;
  if new.account_type = 'general' then            -- business details belong to verified owners and wholesalers only
    new.business_name := null; new.website := null; new.about := null;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_account_type on public.profiles;
create trigger profiles_guard_account_type before update on public.profiles for each row execute function public.guard_account_type();

create table if not exists public.account_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('cafe_owner', 'wholesaler')),
  business text not null check (char_length(btrim(business)) between 2 and 80),
  website text check (website is null or char_length(website) <= 160),
  cafe_id text check (cafe_id is null or cafe_id ~ '^([0-9a-f]{10}|fsq[0-9a-f]{7})$'),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined'))
);
create unique index if not exists account_requests_one_pending on public.account_requests (user_id, kind) where status = 'pending';
alter table public.account_requests enable row level security;
drop policy if exists "account_requests: read own" on public.account_requests;
create policy "account_requests: read own" on public.account_requests for select to authenticated using (user_id = auth.uid());
drop policy if exists "account_requests: add own" on public.account_requests;
create policy "account_requests: add own" on public.account_requests for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
revoke all on table public.account_requests from anon, authenticated;
grant select on table public.account_requests to authenticated;
grant insert (kind, business, website, cafe_id, note) on table public.account_requests to authenticated;

-- ---------------------------------------------------------------- café owners and their menus
-- cafe_owners rows are written by staff / the service role after a request is approved.
create table if not exists public.cafe_owners (
  cafe_id text not null check (cafe_id ~ '^([0-9a-f]{10}|fsq[0-9a-f]{7})$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cafe_id, user_id)
);
alter table public.cafe_owners enable row level security;
drop policy if exists "cafe_owners: read own" on public.cafe_owners;
create policy "cafe_owners: read own" on public.cafe_owners for select to authenticated using (user_id = auth.uid());
revoke all on table public.cafe_owners from anon, authenticated;
grant select on table public.cafe_owners to authenticated;

create table if not exists public.cafe_menu_items (
  id bigint generated always as identity primary key,
  cafe_id text not null check (cafe_id ~ '^([0-9a-f]{10}|fsq[0-9a-f]{7})$'),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  price text check (price is null or char_length(price) <= 20),
  description text check (description is null or char_length(description) <= 200),
  is_matcha boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid not null default auth.uid() references auth.users (id) on delete cascade
);
create index if not exists cafe_menu_items_cafe_idx on public.cafe_menu_items (cafe_id);
alter table public.cafe_menu_items enable row level security;
drop policy if exists "cafe_menu_items: public read" on public.cafe_menu_items;
create policy "cafe_menu_items: public read" on public.cafe_menu_items for select to anon, authenticated using (true);
drop policy if exists "cafe_menu_items: owner add" on public.cafe_menu_items;
create policy "cafe_menu_items: owner add" on public.cafe_menu_items for insert to authenticated
  with check (updated_by = auth.uid() and exists (select 1 from public.cafe_owners o where o.cafe_id = cafe_menu_items.cafe_id and o.user_id = auth.uid()));
drop policy if exists "cafe_menu_items: owner edit" on public.cafe_menu_items;
create policy "cafe_menu_items: owner edit" on public.cafe_menu_items for update to authenticated
  using (exists (select 1 from public.cafe_owners o where o.cafe_id = cafe_menu_items.cafe_id and o.user_id = auth.uid()))
  with check (exists (select 1 from public.cafe_owners o where o.cafe_id = cafe_menu_items.cafe_id and o.user_id = auth.uid()));
drop policy if exists "cafe_menu_items: owner delete" on public.cafe_menu_items;
create policy "cafe_menu_items: owner delete" on public.cafe_menu_items for delete to authenticated
  using (exists (select 1 from public.cafe_owners o where o.cafe_id = cafe_menu_items.cafe_id and o.user_id = auth.uid()));
revoke all on table public.cafe_menu_items from anon, authenticated;
grant select on table public.cafe_menu_items to anon, authenticated;
grant insert (cafe_id, name, price, description, is_matcha) on table public.cafe_menu_items to authenticated;
grant update (name, price, description, is_matcha, updated_at) on table public.cafe_menu_items to authenticated;
grant delete on table public.cafe_menu_items to authenticated;

-- Business details of a public profile (account type, business name, website, about) for the profile page.
create or replace function public.public_business(p_name text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('account_type', p.account_type, 'business_name', p.business_name, 'website', p.website, 'about', p.about, 'accept_dms', p.accept_dms)
  from public.profiles p where lower(p.display_name) = lower(p_name) and p.is_public;
$$;
revoke all on function public.public_business(text) from public;
grant execute on function public.public_business(text) to anon, authenticated;

-- ---------------------------------------------------------------- direct messages
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index if not exists messages_sender_idx on public.messages (sender_id, created_at desc);
alter table public.messages enable row level security;
drop policy if exists "messages: read mine" on public.messages;
create policy "messages: read mine" on public.messages for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
revoke all on table public.messages from anon, authenticated;
grant select on table public.messages to authenticated;

create table if not exists public.dm_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  primary key (blocker_id, blocked_id)
);
alter table public.dm_blocks enable row level security;
drop policy if exists "dm_blocks: read own" on public.dm_blocks;
create policy "dm_blocks: read own" on public.dm_blocks for select to authenticated using (blocker_id = auth.uid());
revoke all on table public.dm_blocks from anon, authenticated;
grant select on table public.dm_blocks to authenticated;

-- Send a message by username. Rules: signed in; 1-1000 characters; not to yourself; the recipient accepts messages and has not
-- blocked you; the recipient has a public profile (or follows you / already wrote to you); at most 20 messages an hour.
create or replace function public.send_message(p_to text, p_body text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); r record; b text := btrim(coalesce(p_body, ''));
begin
  if me is null then return json_build_object('ok', false, 'error', 'sign_in'); end if;
  if char_length(b) < 1 or char_length(b) > 1000 then return json_build_object('ok', false, 'error', 'length'); end if;
  select id, is_public, accept_dms into r from public.profiles where lower(display_name) = lower(btrim(coalesce(p_to, '')));
  if not found or r.id = me then return json_build_object('ok', false, 'error', 'no_such_member'); end if;
  if exists (select 1 from public.dm_blocks where (blocker_id = r.id and blocked_id = me) or (blocker_id = me and blocked_id = r.id)) then
    return json_build_object('ok', false, 'error', 'blocked');
  end if;
  if not r.accept_dms then return json_build_object('ok', false, 'error', 'closed'); end if;
  if not (r.is_public
          or exists (select 1 from public.follows f where f.follower_id = r.id and f.followee_id = me)
          or exists (select 1 from public.messages m where m.sender_id = r.id and m.recipient_id = me)) then
    return json_build_object('ok', false, 'error', 'closed');
  end if;
  if (select count(*) from public.messages where sender_id = me and created_at > now() - interval '1 hour') >= 20 then
    return json_build_object('ok', false, 'error', 'rate');
  end if;
  insert into public.messages (sender_id, recipient_id, body) values (me, r.id, b);
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.send_message(text, text) from public, anon;
grant execute on function public.send_message(text, text) to authenticated;

-- My conversations, newest first, with the other member's name and avatar, the last message and the unread count.
create or replace function public.inbox() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.at desc), '[]'::json) from (
    select p.display_name as name, p.avatar, p.avatar_path,
           max(m.created_at) as at,
           (array_agg(m.body order by m.created_at desc))[1] as last,
           count(*) filter (where m.recipient_id = auth.uid() and m.read_at is null) as unread
    from public.messages m
    join public.profiles p on p.id = case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end
    where auth.uid() is not null and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
    group by p.id, p.display_name, p.avatar, p.avatar_path
  ) x;
$$;
revoke all on function public.inbox() from public, anon;
grant execute on function public.inbox() to authenticated;

-- One conversation (the latest 200 messages, oldest first); opening it marks the other member's messages as read.
create or replace function public.thread(p_with text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); o uuid; res json;
begin
  if me is null then return '[]'::json; end if;
  select id into o from public.profiles where lower(display_name) = lower(btrim(coalesce(p_with, '')));
  if o is null then return '[]'::json; end if;
  update public.messages set read_at = now() where recipient_id = me and sender_id = o and read_at is null;
  select coalesce(json_agg(json_build_object('id', t.id, 'mine', t.sender_id = me, 'body', t.body, 'at', t.created_at) order by t.created_at), '[]'::json) into res
  from (select * from public.messages where (sender_id = me and recipient_id = o) or (sender_id = o and recipient_id = me) order by created_at desc limit 200) t;
  return res;
end;
$$;
revoke all on function public.thread(text) from public, anon;
grant execute on function public.thread(text) to authenticated;

create or replace function public.unread_messages() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.messages where recipient_id = auth.uid() and read_at is null;
$$;
revoke all on function public.unread_messages() from public, anon;
grant execute on function public.unread_messages() to authenticated;

create or replace function public.block_member(p_name text, p_block boolean) returns void
language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  if auth.uid() is null then return; end if;
  select id into o from public.profiles where lower(display_name) = lower(btrim(coalesce(p_name, '')));
  if o is null or o = auth.uid() then return; end if;
  if p_block then insert into public.dm_blocks (blocker_id, blocked_id) values (auth.uid(), o) on conflict do nothing;
  else delete from public.dm_blocks where blocker_id = auth.uid() and blocked_id = o; end if;
end;
$$;
revoke all on function public.block_member(text, boolean) from public, anon;
grant execute on function public.block_member(text, boolean) to authenticated;
