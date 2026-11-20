-- Shows the products a café owner lists (tins, whisks, gift boxes...) on that café's public page. Reads from business_products via cafe_owners, both of which stay
-- private; only this function's output (name, description, price, link) is public. Run once in the Supabase SQL editor (safe to re-run).
create or replace function public.cafe_products(p_cafe_id text) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', b.id, 'name', b.name, 'description', b.description, 'price', b.price, 'url', b.url) order by b.created_at), '[]'::json)
  from public.cafe_owners o join public.business_products b on b.user_id = o.user_id
  where o.cafe_id = p_cafe_id;
$$;
revoke all on function public.cafe_products(text) from public;
grant execute on function public.cafe_products(text) to anon, authenticated;
