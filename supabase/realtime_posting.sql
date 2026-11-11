-- MatchaDB: members post reviews, comments and photos in real time (no approval step). Run once in the Supabase SQL
-- editor (idempotent). Moderation happens after the fact from the admin activity log (/admin): staff can hide any
-- review or comment, which removes it from the public views immediately.
-- Café suggestions are unchanged: they still go through the review step.

-- 1. Reviews start approved. (They used to start pending.)
alter table public.reviews alter column status set default 'approved';
drop policy if exists "reviews: write own" on public.reviews;
create policy "reviews: write own" on public.reviews for insert to authenticated
  with check (user_id = auth.uid() and status = 'approved');
drop policy if exists "reviews: edit own" on public.reviews;
create policy "reviews: edit own" on public.reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and status = 'approved');

-- A member can never change a review's status themselves (so editing a hidden review cannot bring it back).
-- Staff hide/show through admin_set_status(), which sets a one-transaction flag this trigger recognises.
create or replace function public.reviews_keep_status() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.admin_action', true), '') <> '1' then
    new.status := old.status;
  end if;
  return new;
end;
$$;
drop trigger if exists reviews_keep_status on public.reviews;
create trigger reviews_keep_status before update on public.reviews for each row execute function public.reviews_keep_status();

-- 2. Comments, with or without photos, are approved on insert (the rate limit and own-folder photo check stay).
create or replace function public.prepare_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare p text;
begin
  if (select count(*) from public.comments where user_id = new.user_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Too many comments today. Try again tomorrow.';
  end if;
  foreach p in array coalesce(new.photos, '{}') loop
    if p not like new.user_id::text || '/%' then
      raise exception 'Invalid photo path';
    end if;
  end loop;
  new.status := 'approved';
  return new;
end;
$$;

-- Anything already waiting is published (there is nothing pending today, this is just for completeness).
update public.reviews set status = 'approved' where status = 'pending';
update public.comments set status = 'approved' where status = 'pending';
