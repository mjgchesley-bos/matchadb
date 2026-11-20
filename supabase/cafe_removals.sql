-- MatchaDB café removal reports: a signed-in member says a café on the map does not serve matcha (the "Report: no matcha here" button on a café page).
-- Run once in the Supabase SQL editor (idempotent). Needs admin_activity.sql, feedback.sql and admin_queue.sql.
-- These used to be dropped into the general feedback box. Now they are their own thing: they show in the staff activity feed as "Café removal" and
-- in the "Needs you" queue, where staff choose "Remove from map" or "Keep on map".

create table if not exists public.cafe_removal_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cafe_id text not null check (char_length(cafe_id) between 3 and 40),
  cafe_name text check (cafe_name is null or char_length(cafe_name) <= 160),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'removed', 'kept')),
  decided_at timestamptz
);
create index if not exists cafe_removal_reports_status_idx on public.cafe_removal_reports (status, created_at desc);
create unique index if not exists cafe_removal_reports_one_pending on public.cafe_removal_reports (user_id, cafe_id) where status = 'pending';
alter table public.cafe_removal_reports enable row level security;
drop policy if exists "cafe_removal_reports: members can add" on public.cafe_removal_reports;
create policy "cafe_removal_reports: members can add" on public.cafe_removal_reports
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
revoke all on table public.cafe_removal_reports from anon, authenticated;
grant insert (cafe_id, cafe_name, note) on table public.cafe_removal_reports to authenticated;

create or replace function public.cafe_removal_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.cafe_removal_reports where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too many reports, try again later';
  end if;
  return new;
end;
$$;
drop trigger if exists cafe_removal_rate_limit on public.cafe_removal_reports;
create trigger cafe_removal_rate_limit before insert on public.cafe_removal_reports for each row execute function public.cafe_removal_rate_limit();

-- Staff decision: remove (confirmed, to be taken off the map) or keep. Every pending report for the same café is settled together.
create or replace function public.admin_resolve_removal(p_id uuid, p_remove boolean) returns boolean
language plpgsql security definer set search_path = public as $$
declare cid text;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  select cafe_id into cid from public.cafe_removal_reports where id = p_id and status = 'pending';
  if cid is null then return false; end if;
  update public.cafe_removal_reports set status = case when p_remove then 'removed' else 'kept' end, decided_at = now() where cafe_id = cid and status = 'pending';
  return true;
end;
$$;
revoke all on function public.admin_resolve_removal(uuid, boolean) from public, anon;
grant execute on function public.admin_resolve_removal(uuid, boolean) to authenticated;

-- The activity feed gets the new "removal" kind.
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
    union all select x.created_at, 'feedback', x.user_id, x.id::text, x.message, 'feedback', x.id::text, 0, x.status from public.feedback x
    union all select x.created_at, 'removal', x.user_id, x.id::text, coalesce(x.cafe_name, '') || case when x.note is null then '' else ': ' || x.note end, 'cafe', x.cafe_id, 0, x.status from public.cafe_removal_reports x
    union all select m.day::timestamptz, 'visit', m.user_id, null, null, null, null, 0, null from public.member_days m
  ) z
  where z.at >= p_from and z.at < p_to;
$$;
revoke all on function public.admin_events(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_events(timestamptz, timestamptz) to service_role;
revoke all on function public.admin_events(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_events(timestamptz, timestamptz) to service_role;

-- The queue gets the pending removals (same function as admin_queue.sql).
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
    'done', coalesce((
      select jsonb_agg(q.x order by q.sort_at desc) from (
        select jsonb_build_object('id', r.id, 'decided_at', coalesce(r.decided_at, r.created_at), 'kind', r.kind, 'business', r.business, 'status', r.status, 'member', p.display_name,
          'cafe_id', coalesce(r.cafe_id, (select o.cafe_id from public.cafe_owners o where o.user_id = r.user_id limit 1))) as x, coalesce(r.decided_at, r.created_at) as sort_at
        from public.account_requests r join public.profiles p on p.id = r.user_id
        where r.status <> 'pending' and coalesce(r.decided_at, r.created_at) > now() - interval '30 days'
        order by coalesce(r.decided_at, r.created_at) desc limit 30) q), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'created_at', c.created_at, 'member', p.display_name, 'target_type', c.target_type, 'target_key', c.target_key, 'body', c.body, 'photos', c.photos) order by c.created_at)
      from public.comments c join public.profiles p on p.id = c.user_id where c.status = 'pending'), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'created_at', r.created_at, 'member', p.display_name, 'product_id', r.product_id, 'body', r.body) order by r.created_at)
      from public.reviews r join public.profiles p on p.id = r.user_id where r.status = 'pending'), '[]'::jsonb),
    'removals', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'created_at', r.created_at, 'cafe_id', r.cafe_id, 'cafe_name', r.cafe_name, 'note', r.note, 'member', p.display_name,
        'reports', (select count(*) from public.cafe_removal_reports z where z.cafe_id = r.cafe_id and z.status = 'pending')) order by r.created_at)
      from public.cafe_removal_reports r left join public.profiles p on p.id = r.user_id where r.status = 'pending'), '[]'::jsonb),
    'events', (select count(*) from public.event_submissions where status = 'pending'),
    'event_photos', (select count(*) from public.event_photos where status = 'pending')
  );
end;
$$;
revoke all on function public.admin_queue() from public, anon;
grant execute on function public.admin_queue() to authenticated;
