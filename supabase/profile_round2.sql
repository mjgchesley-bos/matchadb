-- MatchaDB profile round 2. Run once in the Supabase SQL editor (safe to re-run).
-- 1. Café ratings count as ratings: they earn the "First rating" / "Taster" ribbons and member points (before, only product ratings did).
-- 2. Messages and "find me by my Google name/email" are on by default (and switched on for existing members).

create or replace function public.member_points(p_uid uuid) returns integer
language sql stable security definer set search_path = public as $$
  select (
    least((select count(*) from public.ratings where user_id = p_uid) + (select count(*) from public.cafe_ratings where user_id = p_uid), 50) * 2
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
    'cafe_ratings', (select count(*) from public.cafe_ratings where user_id = u),
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

alter table public.profiles alter column accept_dms set default true;
alter table public.profiles alter column find_by_contact set default true;
update public.profiles set accept_dms = true where accept_dms is not true;
update public.profiles set find_by_contact = true where find_by_contact is not true;
