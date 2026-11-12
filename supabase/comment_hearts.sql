-- MatchaDB: hearts (likes) on comments. Run once in the Supabase SQL editor (safe to re-run).
-- Members click a heart on someone else's comment; the page shows the heart count and sorts the most-hearted comments first.

create table if not exists public.comment_hearts (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists comment_hearts_comment_idx on public.comment_hearts (comment_id);
alter table public.comment_hearts enable row level security;

-- A member can see, add and remove only their own hearts (so the page can show which ones they have clicked).
drop policy if exists "comment hearts: read own" on public.comment_hearts;
create policy "comment hearts: read own" on public.comment_hearts for select to authenticated using (user_id = auth.uid());
drop policy if exists "comment hearts: add own" on public.comment_hearts;
create policy "comment hearts: add own" on public.comment_hearts for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "comment hearts: remove own" on public.comment_hearts;
create policy "comment hearts: remove own" on public.comment_hearts for delete to authenticated using (user_id = auth.uid());

-- Rules enforced by the database: no hearting your own comment, only visible (approved) comments, and a daily cap against scripted piling-on.
create or replace function public.check_comment_heart() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid; st text;
begin
  select user_id, status into owner, st from public.comments where id = new.comment_id;
  if owner is null or st <> 'approved' then raise exception 'That comment is not available.'; end if;
  if owner = new.user_id then raise exception 'You cannot heart your own comment.'; end if;
  if (select count(*) from public.comment_hearts where user_id = new.user_id and created_at > now() - interval '1 day') >= 300 then
    raise exception 'Too many hearts today. Try again tomorrow.';
  end if;
  return new;
end;
$$;
drop trigger if exists comment_hearts_check on public.comment_hearts;
create trigger comment_hearts_check before insert on public.comment_hearts for each row execute function public.check_comment_heart();

-- Public heart counts (just numbers per comment; nobody can see who hearted what).
create or replace view public.comment_heart_counts with (security_invoker = false) as
  select h.comment_id, count(*)::integer as hearts
  from public.comment_hearts h
  join public.comments c on c.id = h.comment_id and c.status = 'approved'
  group by h.comment_id;
grant select on public.comment_heart_counts to anon, authenticated;
