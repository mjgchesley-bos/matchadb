-- Run once in the Supabase SQL editor: a member's public page now also lists their café ratings.
-- (public_profile only returned product ratings, so a member who rated cafés looked like they had rated nothing.)

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
    'cafe_ratings', coalesce((select json_agg(json_build_object('cafe_id', cafe_id, 'score', score) order by updated_at desc)
                              from (select cafe_id, score, updated_at from public.cafe_ratings where user_id = u order by updated_at desc limit 40) cr), '[]'::json),
    'cafe_rating_count', (select count(*) from public.cafe_ratings where user_id = u),
    'lists', coalesce((select json_agg(json_build_object('name', s.name, 'items', coalesce((select json_agg(i.product_id order by i.added_at desc) from public.custom_shelf_items i where i.shelf_id = s.id), '[]'::json)) order by s.created_at)
                       from public.custom_shelves s where s.user_id = u), '[]'::json),
    'reviews', coalesce((select json_agg(json_build_object('product_id', product_id, 'body', body, 'created_at', created_at) order by created_at desc)
                         from (select product_id, body, created_at from public.reviews where user_id = u and status = 'approved' order by created_at desc limit 5) rv), '[]'::json),
    'photos', coalesce((select json_agg(ph) from (select unnest(photos) as ph from (select photos from public.comments where user_id = u and status = 'approved' order by created_at desc limit 12) c) x), '[]'::json)
  );
end;
$$;
grant execute on function public.public_profile(text) to anon, authenticated;
