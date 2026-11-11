-- MatchaDB admin activity log (staff only). Run once in the Supabase SQL editor (idempotent).
-- Every function that returns member data checks public.staff, the private staff list (the owner is on it).
-- Nothing here is readable by anyone else: visitors and ordinary members get "not allowed".

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

-- One stream of everything members do. Internal: not callable by the browser, only by the staff functions below
-- and by the daily report script (service role).
create or replace function public.admin_events(p_from timestamptz, p_to timestamptz)
returns table (at timestamptz, kind text, uid uuid, ref text, txt text, target_type text, target_key text, photos integer, status text)
language sql stable security definer set search_path = public, auth as $$
  select * from (
    select u.created_at as at, 'account'::text as kind, u.id as uid, null::text as ref, null::text as txt, null::text as target_type, null::text as target_key, 0 as photos, null::text as status from auth.users u
    union all select r.created_at, 'review', r.user_id, r.id::text, r.body, 'product', r.product_id::text, 0, r.status from public.reviews r
    union all select c.created_at, 'comment', c.user_id, c.id::text, c.body, c.target_type, c.target_key, coalesce(array_length(c.photos, 1), 0), c.status from public.comments c
    union all select x.created_at, 'rating', x.user_id, null, x.score::text, 'product', x.product_id::text, 0, null from public.ratings x
    union all select x.created_at, 'cafe_rating', x.user_id, null, x.score::text, 'cafe', x.cafe_id, 0, null from public.cafe_ratings x
    union all select x.created_at, 'save', x.user_id, null, 'product', 'product', x.product_id::text, 0, null from public.favorites x
    union all select x.created_at, 'save', x.user_id, null, 'brand', 'brand', x.brand, 0, null from public.favorite_brands x
    union all select x.created_at, 'save', x.user_id, null, 'cafe', 'cafe', x.cafe_id, 0, null from public.favorite_cafes x
    union all select x.updated_at, 'shelf', x.user_id, null, x.status, 'product', x.product_id::text, 0, null from public.shelf x
    union all select x.added_at, 'list', x.user_id, null, s.name, 'product', x.product_id::text, 0, null from public.custom_shelf_items x join public.custom_shelves s on s.id = x.shelf_id
    union all select x.created_at, 'follow', x.follower_id, null, p.display_name, 'member', p.display_name, 0, null from public.follows x join public.profiles p on p.id = x.followee_id
    union all select x.created_at, 'bookmark', x.user_id, null, null, 'study', x.study_id::text, 0, null from public.research_bookmarks x
    union all select x.created_at, 'report', x.reporter_id, x.id::text, x.reason, 'review', x.review_id::text, 0, null from public.review_reports x
    union all select x.created_at, 'report', x.reporter_id, x.id::text, x.reason, 'comment', x.comment_id::text, 0, null from public.comment_reports x
    union all select x.created_at, 'report', x.reporter_id, x.id::text, x.reason, 'profile', x.profile_name, 0, null from public.profile_reports x
    union all select x.created_at, 'suggestion', x.user_id, x.id::text, x.name || ' | ' || x.address, 'suggestion', x.id::text, 0, x.status from public.cafe_suggestions x
    union all select m.day::timestamptz, 'visit', m.user_id, null, null, null, null, 0, null from public.member_days m
  ) z
  where z.at >= p_from and z.at < p_to;
$$;
revoke all on function public.admin_events(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_events(timestamptz, timestamptz) to service_role;

-- The newest events, optionally limited to some kinds or one member.
create or replace function public.admin_feed(p_from timestamptz, p_to timestamptz, p_kinds text[] default null, p_limit integer default 200, p_user text default null)
returns json language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  return coalesce((
    select json_agg(x) from (
      select e.at, e.kind, coalesce(p.display_name, 'Member') as member, e.ref, left(e.txt, 400) as txt, e.target_type, e.target_key, e.photos, e.status
      from public.admin_events(p_from, p_to) e
      left join public.profiles p on p.id = e.uid
      where (p_kinds is null or e.kind = any (p_kinds)) and (p_user is null or lower(p.display_name) = lower(p_user))
      order by e.at desc
      limit least(greatest(p_limit, 1), 500)
    ) x), '[]'::json);
end;
$$;

-- Counts per kind for the range, how many different members were active, and the same counts per day (Central time).
create or replace function public.admin_summary(p_from timestamptz, p_to timestamptz, p_tz text default 'America/Chicago')
returns json language plpgsql stable security definer set search_path = public, auth as $$
declare r json;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  with e as (select * from public.admin_events(p_from, p_to)),
  totals as (select coalesce(json_object_agg(kind, n), '{}'::json) j from (select kind, count(*) n from e group by kind) t),
  photos as (select coalesce(sum(photos), 0) n from e where kind = 'comment'),
  active as (select count(distinct uid) n from e where kind <> 'account'),
  perday as (
    select coalesce(json_agg(json_build_object('day', d, 'counts', c) order by d desc), '[]'::json) j from (
      select d, json_object_agg(kind, n) c from (
        select to_char(at at time zone p_tz, 'YYYY-MM-DD') d, kind, count(*) n from e group by 1, 2
        union all
        select to_char(at at time zone p_tz, 'YYYY-MM-DD'), 'photos', sum(photos) from e where kind = 'comment' group by 1 having sum(photos) > 0
      ) g group by d) pd)
  select json_build_object('totals', (select j from totals), 'photos', (select n from photos), 'active_members', (select n from active), 'by_day', (select j from perday)) into r;
  return r;
end;
$$;

-- Every member with their counts.
create or replace function public.admin_members(p_q text default null, p_limit integer default 100, p_offset integer default 0)
returns json language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  return coalesce((
    select json_agg(x) from (
      select p.display_name as name, u.email, u.created_at as joined, u.last_sign_in_at as last_sign_in, p.is_public as public,
             (select count(*) from public.ratings r where r.user_id = u.id) + (select count(*) from public.cafe_ratings r where r.user_id = u.id) as ratings,
             (select count(*) from public.reviews r where r.user_id = u.id) as reviews,
             (select count(*) from public.comments c where c.user_id = u.id) as comments,
             (select coalesce(sum(coalesce(array_length(c.photos, 1), 0)), 0) from public.comments c where c.user_id = u.id) as photos,
             (select count(*) from public.favorites f where f.user_id = u.id) + (select count(*) from public.favorite_brands f where f.user_id = u.id) + (select count(*) from public.favorite_cafes f where f.user_id = u.id) as saves,
             (select count(*) from public.follows f where f.follower_id = u.id) as following,
             (select count(*) from public.follows f where f.followee_id = u.id) as followers,
             (select count(*) from public.member_days m where m.user_id = u.id) as days
      from auth.users u join public.profiles p on p.id = u.id
      where p_q is null or p.display_name ilike '%' || p_q || '%' or u.email ilike '%' || p_q || '%'
      order by u.created_at desc
      limit least(greatest(p_limit, 1), 500) offset greatest(p_offset, 0)
    ) x), '[]'::json);
end;
$$;

-- One member: profile (with email, visible to staff only) and their latest activity.
create or replace function public.admin_member(p_name text)
returns json language plpgsql stable security definer set search_path = public, auth as $$
declare v_uid uuid; r json;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  select id into v_uid from public.profiles where lower(display_name) = lower(p_name);
  if v_uid is null then return null; end if;
  select json_build_object(
    'name', p.display_name, 'email', u.email, 'joined', u.created_at, 'last_sign_in', u.last_sign_in_at, 'public', p.is_public,
    'findable', p.find_by_contact, 'bio', p.bio, 'provider', u.raw_app_meta_data ->> 'provider',
    'events', coalesce((select json_agg(x) from (
        select e.at, e.kind, e.ref, left(e.txt, 400) as txt, e.target_type, e.target_key, e.photos, e.status
        from public.admin_events('2000-01-01', '2100-01-01') e where e.uid = v_uid and e.kind <> 'visit' order by e.at desc limit 150) x), '[]'::json))
  into r from public.profiles p join auth.users u on u.id = p.id where p.id = v_uid;
  return r;
end;
$$;

-- The full text, photos and reports of one item. Kinds: comment, review, suggestion, report-comment, report-review, report-profile.
create or replace function public.admin_item(p_kind text, p_ref text)
returns json language plpgsql stable security definer set search_path = public, auth as $$
declare r json;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  if p_kind = 'comment' then
    select json_build_object('kind', 'comment', 'id', c.id, 'at', c.created_at, 'member', p.display_name, 'target_type', c.target_type, 'target_key', c.target_key,
      'body', c.body, 'photos', c.photos, 'status', c.status,
      'reports', (select coalesce(json_agg(json_build_object('reason', x.reason, 'by', pp.display_name, 'at', x.created_at) order by x.created_at), '[]'::json)
                  from public.comment_reports x join public.profiles pp on pp.id = x.reporter_id where x.comment_id = c.id))
    into r from public.comments c join public.profiles p on p.id = c.user_id where c.id = p_ref::uuid;
  elsif p_kind = 'review' then
    select json_build_object('kind', 'review', 'id', c.id, 'at', c.created_at, 'member', p.display_name, 'target_type', 'product', 'target_key', c.product_id::text,
      'body', c.body, 'photos', '[]'::json, 'status', c.status,
      'reports', (select coalesce(json_agg(json_build_object('reason', x.reason, 'by', pp.display_name, 'at', x.created_at) order by x.created_at), '[]'::json)
                  from public.review_reports x join public.profiles pp on pp.id = x.reporter_id where x.review_id = c.id))
    into r from public.reviews c join public.profiles p on p.id = c.user_id where c.id = p_ref::uuid;
  elsif p_kind = 'suggestion' then
    select json_build_object('kind', 'suggestion', 'id', s.id, 'at', s.created_at, 'member', p.display_name, 'name', s.name, 'address', s.address, 'link', s.link,
      'status', s.status, 'note', s.reviewer_note)
    into r from public.cafe_suggestions s left join public.profiles p on p.id = s.user_id where s.id = p_ref::uuid;
  elsif p_kind = 'report-comment' then
    select (public.admin_item('comment', x.comment_id::text)::jsonb || jsonb_build_object('report_reason', x.reason, 'report_by', pp.display_name, 'report_at', x.created_at))::json into r
    from public.comment_reports x join public.profiles pp on pp.id = x.reporter_id where x.id = p_ref::uuid;
  elsif p_kind = 'report-review' then
    select (public.admin_item('review', x.review_id::text)::jsonb || jsonb_build_object('report_reason', x.reason, 'report_by', pp.display_name, 'report_at', x.created_at))::json into r
    from public.review_reports x join public.profiles pp on pp.id = x.reporter_id where x.id = p_ref::uuid;
  elsif p_kind = 'report-profile' then
    select json_build_object('kind', 'report-profile', 'id', x.id, 'at', x.created_at, 'profile', x.profile_name, 'report_reason', x.reason, 'report_by', pp.display_name)
    into r from public.profile_reports x join public.profiles pp on pp.id = x.reporter_id where x.id = p_ref::uuid;
  end if;
  return r;
end;
$$;

-- Hide or show a comment or review (staff only). Hidden items disappear from the public pages at once.
create or replace function public.admin_set_status(p_kind text, p_ref text, p_status text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  if p_status not in ('approved', 'hidden') then return false; end if;
  perform set_config('app.admin_action', '1', true);
  if p_kind = 'comment' then update public.comments set status = p_status where id = p_ref::uuid;
  elsif p_kind = 'review' then update public.reviews set status = p_status, updated_at = now() where id = p_ref::uuid;
  else return false;
  end if;
  return found;
end;
$$;

revoke all on function public.is_staff(), public.admin_feed(timestamptz, timestamptz, text[], integer, text), public.admin_summary(timestamptz, timestamptz, text),
  public.admin_members(text, integer, integer), public.admin_member(text), public.admin_item(text, text), public.admin_set_status(text, text, text) from public, anon;
grant execute on function public.is_staff(), public.admin_feed(timestamptz, timestamptz, text[], integer, text), public.admin_summary(timestamptz, timestamptz, text),
  public.admin_members(text, integer, integer), public.admin_member(text), public.admin_item(text, text), public.admin_set_status(text, text, text) to authenticated;
