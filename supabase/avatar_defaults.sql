-- MatchaDB: every member has an avatar. Run once in the Supabase SQL editor (safe to run again). Needs tiers_menus_dms.sql / avatar_outfits.sql.
-- 1. The avatar check now accepts shoes: "d:" + 7 face characters, then optionally 2 (outfit style, colour) or 4 (plus shoe style, colour).
-- 2. random_avatar() builds a complete random avatar the same way the site does (option counts must match src/lib/avatar-design.ts).
-- 3. Every new profile gets one automatically; every existing profile with neither a designed avatar nor a photo gets one now.

alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (
  avatar is null
  or avatar in ('cup', 'whisk', 'leaf', 'tin', 'kettle', 'sprout', 'bowl', 'spoon', 'bamboo', 'blossom', 'mountain', 'teapot')
  or avatar ~ '^d:[0-9a-z]{7}([0-9a-z]{2}|[0-9a-z]{4})?$'
);

create or replace function public.random_avatar() returns text language plpgsql volatile as $$
declare
  b36 constant text := '0123456789abcdefghijklmnopqrstuvwxyz';
  extras constant int[] := array[0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; -- 1 (the retired matcha cup) is never handed out
  d int[] := array[
    (floor(random() * 8))::int, (floor(random() * 8))::int, (floor(random() * 25))::int, (floor(random() * 12))::int, (floor(random() * 12))::int, (floor(random() * 9))::int,
    extras[1 + (floor(random() * 15))::int],
    (floor(random() * 15))::int, (floor(random() * 12))::int, (floor(random() * 8))::int, (floor(random() * 8))::int];
  s text := 'd:';
  i int;
begin
  for i in 1 .. 11 loop s := s || substr(b36, d[i] + 1, 1); end loop;
  return s;
end;
$$;

create or replace function public.profiles_default_avatar() returns trigger language plpgsql as $$
begin
  if new.avatar is null and new.avatar_path is null then new.avatar := public.random_avatar(); end if;
  return new;
end;
$$;
drop trigger if exists profiles_default_avatar on public.profiles;
create trigger profiles_default_avatar before insert on public.profiles for each row execute function public.profiles_default_avatar();

update public.profiles set avatar = public.random_avatar() where avatar is null and avatar_path is null;
