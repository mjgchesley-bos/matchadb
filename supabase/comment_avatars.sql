-- MatchaDB: show each commenter's avatar next to their name on comments and reviews.
-- Run once in the Supabase SQL editor (safe to re-run). Columns are appended so existing queries keep working.
-- The designed avatar is always shared; a profile photo only when the member's profile is public.
create or replace view public.approved_reviews with (security_invoker = false) as
  select r.id, r.product_id, r.body, r.created_at, p.display_name, rt.score as rating,
         public.member_tier(public.member_points(r.user_id)) as tier, p.is_public as public_profile,
         p.avatar as avatar, case when p.is_public then p.avatar_path else null end as avatar_path
  from public.reviews r
  join public.profiles p on p.id = r.user_id
  left join public.ratings rt on rt.user_id = r.user_id and rt.product_id = r.product_id
  where r.status = 'approved';
grant select on public.approved_reviews to anon, authenticated;

create or replace view public.approved_comments with (security_invoker = false) as
  select c.id, c.target_type, c.target_key, c.body, c.photos, c.created_at, p.display_name,
         public.member_tier(public.member_points(c.user_id)) as tier, p.is_public as public_profile,
         p.avatar as avatar, case when p.is_public then p.avatar_path else null end as avatar_path
  from public.comments c
  join public.profiles p on p.id = c.user_id
  where c.status = 'approved';
grant select on public.approved_comments to anon, authenticated;

create or replace function public.ranked_comments(p_type text, p_key text, p_limit integer default 15, p_offset integer default 0)
returns setof jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(r) from (
    select a.id, a.body, a.photos, a.created_at, a.display_name, a.tier, a.public_profile, a.avatar, a.avatar_path, coalesce(h.hearts, 0) as hearts
    from public.approved_comments a
    left join public.comment_heart_counts h on h.comment_id = a.id
    where a.target_type = p_type and a.target_key = p_key
    order by coalesce(h.hearts, 0) desc, a.created_at desc
    limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
  ) r;
$$;
grant execute on function public.ranked_comments(text, text, integer, integer) to anon, authenticated;
