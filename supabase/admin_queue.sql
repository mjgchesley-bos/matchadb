-- MatchaDB admin approvals queue (staff only). Run once in the Supabase SQL editor (safe to re-run). Needs admin_activity.sql, tiers_menus_dms.sql and event_submissions.sql.
-- admin_queue(): everything waiting for a decision, with the facts the automatic pre-review needs (the requester's sign-in email and name, which only staff can see).
-- admin_decide_request(): approve or decline a café-owner / wholesaler request (approving sets the account type, business name and website, and links the café).

create or replace function public.admin_queue() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'created_at', r.created_at, 'kind', r.kind, 'business', r.business, 'website', r.website, 'cafe_id', r.cafe_id, 'note', r.note,
        'user_id', r.user_id, 'member', p.display_name, 'member_since', p.created_at,
        'email', u.email, 'provider', u.raw_app_meta_data ->> 'provider', 'full_name', u.raw_user_meta_data ->> 'full_name',
        'ratings', (select count(*) from public.ratings x where x.user_id = r.user_id) + (select count(*) from public.cafe_ratings y where y.user_id = r.user_id),
        'comments', (select count(*) from public.comments c where c.user_id = r.user_id),
        'cafe_has_owner', case when r.cafe_id is null then false else exists (select 1 from public.cafe_owners o where o.cafe_id = r.cafe_id) end
      ) order by r.created_at)
      from public.account_requests r join public.profiles p on p.id = r.user_id left join auth.users u on u.id = r.user_id
      where r.status = 'pending'), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'created_at', c.created_at, 'member', p.display_name, 'target_type', c.target_type, 'target_key', c.target_key, 'body', c.body, 'photos', c.photos) order by c.created_at)
      from public.comments c join public.profiles p on p.id = c.user_id where c.status = 'pending'), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'created_at', r.created_at, 'member', p.display_name, 'product_id', r.product_id, 'body', r.body) order by r.created_at)
      from public.reviews r join public.profiles p on p.id = r.user_id where r.status = 'pending'), '[]'::jsonb),
    'events', (select count(*) from public.event_submissions where status = 'pending'),
    'event_photos', (select count(*) from public.event_photos where status = 'pending')
  );
end;
$$;

create or replace function public.admin_decide_request(p_id uuid, p_approve boolean, p_cafe_id text default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare r public.account_requests%rowtype; cid text;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  select * into r from public.account_requests where id = p_id and status = 'pending';
  if not found then return false; end if;
  if not p_approve then
    update public.account_requests set status = 'declined' where id = p_id;
    return true;
  end if;
  perform set_config('app.admin_action', '1', true);
  update public.profiles set account_type = r.kind, business_name = r.business, website = nullif(btrim(coalesce(r.website, '')), '') where id = r.user_id;
  cid := coalesce(nullif(btrim(coalesce(p_cafe_id, '')), ''), r.cafe_id);
  if r.kind = 'cafe_owner' and cid is not null and cid ~ '^([0-9a-f]{10}|fsq[0-9a-f]{7})$' then
    insert into public.cafe_owners (cafe_id, user_id) values (cid, r.user_id) on conflict do nothing;
  end if;
  update public.account_requests set status = 'approved' where id = p_id;
  return true;
end;
$$;

revoke all on function public.admin_queue(), public.admin_decide_request(uuid, boolean, text) from public, anon;
grant execute on function public.admin_queue(), public.admin_decide_request(uuid, boolean, text) to authenticated;
