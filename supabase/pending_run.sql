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

-- MatchaDB: notifications. Run once in the Supabase SQL editor (safe to re-run). Needs comment_hearts.sql first.
-- A member is notified when (1) someone hearts their comment, (2) someone comments on, rates or reviews a café/product/brand
-- the member has also commented on or rated. Rows are written by database triggers only; members can read and mark their own.

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,        -- who is notified
  kind text not null check (kind in ('heart', 'comment', 'rating')),
  actor_name text not null,                                                    -- the other member's display name
  target_type text not null check (target_type in ('product', 'brand', 'cafe')),
  target_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own" on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "notifications: mark own" on public.notifications;
create policy "notifications: mark own" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications: delete own" on public.notifications;
create policy "notifications: delete own" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- Everyone who has already commented on or rated this thing (except the person who just acted).
create or replace function public.notify_engaged(p_actor uuid, p_kind text, p_type text, p_key text) returns void
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  select display_name into nm from public.profiles where id = p_actor;
  insert into public.notifications (user_id, kind, actor_name, target_type, target_key)
  select u, p_kind, coalesce(nm, 'A member'), p_type, p_key
  from (
    select c.user_id as u from public.comments c where c.target_type = p_type and c.target_key = p_key and c.status = 'approved'
    union select r.user_id from public.cafe_ratings r where p_type = 'cafe' and r.cafe_id = p_key
    union select r.user_id from public.ratings r where p_type = 'product' and r.product_id::text = p_key
  ) x
  where u <> p_actor
    and not exists (select 1 from public.notifications n where n.user_id = x.u and n.kind = p_kind and n.actor_name = coalesce(nm, 'A member')
                    and n.target_type = p_type and n.target_key = p_key and n.created_at > now() - interval '1 day')
  limit 50;
end;
$$;

create or replace function public.notify_on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' then perform public.notify_engaged(new.user_id, 'comment', new.target_type, new.target_key); end if;
  return null;
end;
$$;
drop trigger if exists comments_notify on public.comments;
create trigger comments_notify after insert on public.comments for each row execute function public.notify_on_comment();

create or replace function public.notify_on_cafe_rating() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_engaged(new.user_id, 'rating', 'cafe', new.cafe_id);
  return null;
end;
$$;
drop trigger if exists cafe_ratings_notify on public.cafe_ratings;
create trigger cafe_ratings_notify after insert on public.cafe_ratings for each row execute function public.notify_on_cafe_rating();

create or replace function public.notify_on_product_rating() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_engaged(new.user_id, 'rating', 'product', new.product_id::text);
  return null;
end;
$$;
drop trigger if exists ratings_notify on public.ratings;
create trigger ratings_notify after insert on public.ratings for each row execute function public.notify_on_product_rating();

-- A heart on your comment.
create or replace function public.notify_on_heart() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid; tt text; tk text; nm text;
begin
  select user_id, target_type, target_key into o, tt, tk from public.comments where id = new.comment_id;
  if o is null or o = new.user_id then return null; end if;
  select display_name into nm from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, kind, actor_name, target_type, target_key)
  select o, 'heart', coalesce(nm, 'A member'), tt, tk
  where not exists (select 1 from public.notifications n where n.user_id = o and n.kind = 'heart' and n.actor_name = coalesce(nm, 'A member')
                    and n.target_type = tt and n.target_key = tk and n.created_at > now() - interval '1 day');
  return null;
end;
$$;
drop trigger if exists comment_hearts_notify on public.comment_hearts;
create trigger comment_hearts_notify after insert on public.comment_hearts for each row execute function public.notify_on_heart();
