-- MatchaDB feedback and feature requests: a signed-in member sends a short message to the owner from a profile page.
-- Run once in the Supabase SQL editor (idempotent: safe to run again).
-- Members can add a row for themselves and nothing else (no select/update/delete). Staff read them in the /admin activity log.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 3 and 2000),
  page text check (page is null or char_length(page) <= 200),
  locale text check (locale is null or char_length(locale) <= 8),
  status text not null default 'new' check (status in ('new', 'read', 'done'))
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;

drop policy if exists "feedback: members can add" on public.feedback;
create policy "feedback: members can add" on public.feedback
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'new');
revoke all on table public.feedback from anon, authenticated;
grant insert (message, page, locale) on table public.feedback to authenticated;

-- At most 5 messages per member per hour (blocks spam and double-submits).
create or replace function public.feedback_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.feedback where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'too many messages, try again later';
  end if;
  return new;
end;
$$;
drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit before insert on public.feedback for each row execute function public.feedback_rate_limit();

-- The staff activity log now includes feedback (same functions as admin_activity.sql, with one more source / kind).
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
    union all select m.day::timestamptz, 'visit', m.user_id, null, null, null, null, 0, null from public.member_days m
  ) z
  where z.at >= p_from and z.at < p_to;
$$;
revoke all on function public.admin_events(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_events(timestamptz, timestamptz) to service_role;

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
  elsif p_kind = 'feedback' then
    select json_build_object('kind', 'feedback', 'id', f.id, 'at', f.created_at, 'member', p.display_name, 'body', f.message, 'status', f.status, 'page', f.page)
    into r from public.feedback f left join public.profiles p on p.id = f.user_id where f.id = p_ref::uuid;
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
