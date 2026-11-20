-- MatchaDB: lets the café page know whether an account already owns the café, so it can drop the "claim this café" prompt.
-- Run once in the Supabase SQL editor (safe to run again). Returns only true or false, never who the owner is.
create or replace function public.cafe_has_owner(p_cafe_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cafe_owners where cafe_id = p_cafe_id);
$$;
revoke all on function public.cafe_has_owner(text) from public;
grant execute on function public.cafe_has_owner(text) to anon, authenticated;
