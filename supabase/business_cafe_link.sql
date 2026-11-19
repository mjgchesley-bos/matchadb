-- Lets a café owner's public profile link to their café page: public_business now also returns the café ids the account owns (read from cafe_owners, which stays private).
-- Run once in the Supabase SQL editor (safe to re-run).
create or replace function public.public_business(p_name text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'account_type', p.account_type, 'business_name', p.business_name, 'website', p.website, 'about', p.about, 'accept_dms', p.accept_dms,
    'banner_path', p.banner_path,
    'cafe_ids', coalesce((select json_agg(o.cafe_id) from public.cafe_owners o where o.user_id = p.id), '[]'::json),
    'products', coalesce((select json_agg(json_build_object('name', b.name, 'description', b.description, 'price', b.price, 'url', b.url) order by b.created_at)
                          from public.business_products b where b.user_id = p.id), '[]'::json))
  from public.profiles p where lower(p.display_name) = lower(p_name) and p.is_public;
$$;
revoke all on function public.public_business(text) from public;
grant execute on function public.public_business(text) to anon, authenticated;
