-- MatchaDB: comments for a page, ranked in the database (most hearts first, ties newest first), a page at a time.
-- Run once in the Supabase SQL editor (safe to re-run). Needs comment_hearts.sql first.
create or replace function public.ranked_comments(p_type text, p_key text, p_limit integer default 15, p_offset integer default 0)
returns setof jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(r) from (
    select a.id, a.body, a.photos, a.created_at, a.display_name, a.tier, a.public_profile, coalesce(h.hearts, 0) as hearts
    from public.approved_comments a
    left join public.comment_heart_counts h on h.comment_id = a.id
    where a.target_type = p_type and a.target_key = p_key
    order by coalesce(h.hearts, 0) desc, a.created_at desc
    limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
  ) r;
$$;
grant execute on function public.ranked_comments(text, text, integer, integer) to anon, authenticated;
