-- MatchaDB: following / friends. Run once in the Supabase SQL editor (idempotent).
-- One-way follow, no approval; two members who follow each other are shown as "Friends".
--  * Search by username: members with a PUBLIC profile, prefix match.
--  * Search by Google name or email: only members who switched on profiles.find_by_contact, and only an EXACT match
--    (the searcher has to know the full name or address), so nobody can probe which emails have accounts.
--  * The email and Google name are never returned to anyone.
--  * A private profile that has not opted in cannot be found or followed.

alter table public.profiles add column if not exists find_by_contact boolean not null default false;

create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);
alter table public.follows enable row level security;

-- A member sees only the rows they are part of; writes go through follow_member / unfollow_member below.
drop policy if exists "follows: read mine" on public.follows;
create policy "follows: read mine" on public.follows for select to authenticated using (follower_id = auth.uid() or followee_id = auth.uid());
revoke all on table public.follows from anon, authenticated;
grant select on table public.follows to authenticated;

create or replace function public.search_members(p_q text) returns json
language plpgsql stable security definer set search_path = public, auth as $$
declare q text := btrim(coalesce(p_q, '')); pat text;
begin
  if auth.uid() is null or char_length(q) < 2 then return '[]'::json; end if;
  pat := replace(replace(replace(lower(q), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return coalesce((
    select json_agg(x) from (
      select p.display_name as name, p.avatar, p.avatar_path, p.is_public as public,
             public.member_tier(public.member_points(p.id)) as tier,
             exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = p.id) as following
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.id <> auth.uid() and (
        (p.is_public and lower(p.display_name) like pat)
        or (p.find_by_contact and (
              lower(u.email) = lower(q)
              or lower(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')) = lower(q)))
      )
      order by (lower(p.display_name) = lower(q)) desc, p.display_name
      limit 20
    ) x
  ), '[]'::json);
end;
$$;

create or replace function public.follow_member(p_name text) returns boolean
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if auth.uid() is null then return false; end if;
  select id into t from public.profiles where lower(display_name) = lower(p_name) and id <> auth.uid() and (is_public or find_by_contact);
  if t is null then return false; end if;
  if (select count(*) from public.follows where follower_id = auth.uid()) >= 1000 then return false; end if;
  insert into public.follows (follower_id, followee_id) values (auth.uid(), t) on conflict do nothing;
  return true;
end;
$$;

create or replace function public.unfollow_member(p_name text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  delete from public.follows where follower_id = auth.uid()
    and followee_id = (select id from public.profiles where lower(display_name) = lower(p_name));
  return true;
end;
$$;

-- Everyone I follow, and everyone who follows me (usernames and avatars only).
create or replace function public.my_network() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'following', coalesce((
      select json_agg(json_build_object('name', p.display_name, 'avatar', p.avatar, 'avatar_path', p.avatar_path, 'public', p.is_public,
               'friend', exists (select 1 from public.follows b where b.follower_id = f.followee_id and b.followee_id = f.follower_id)) order by f.created_at desc)
      from public.follows f join public.profiles p on p.id = f.followee_id where f.follower_id = auth.uid()), '[]'::json),
    'followers', coalesce((
      select json_agg(json_build_object('name', p.display_name, 'avatar', p.avatar, 'avatar_path', p.avatar_path, 'public', p.is_public,
               'friend', exists (select 1 from public.follows b where b.follower_id = f.followee_id and b.followee_id = f.follower_id)) order by f.created_at desc)
      from public.follows f join public.profiles p on p.id = f.follower_id where f.followee_id = auth.uid()), '[]'::json)
  );
$$;

-- Counts and my relationship to a PUBLIC profile (works signed out, for the counts).
create or replace function public.follow_info(p_name text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'followers', (select count(*) from public.follows where followee_id = p.id),
    'following', (select count(*) from public.follows where follower_id = p.id),
    'i_follow', auth.uid() is not null and exists (select 1 from public.follows where follower_id = auth.uid() and followee_id = p.id),
    'follows_me', auth.uid() is not null and exists (select 1 from public.follows where follower_id = p.id and followee_id = auth.uid()))
  from (select id from public.profiles where lower(display_name) = lower(p_name) and is_public limit 1) p;
$$;

revoke all on function public.search_members(text), public.follow_member(text), public.unfollow_member(text), public.my_network() from public, anon;
grant execute on function public.search_members(text), public.follow_member(text), public.unfollow_member(text), public.my_network() to authenticated;
revoke all on function public.follow_info(text) from public;
grant execute on function public.follow_info(text) to anon, authenticated;
