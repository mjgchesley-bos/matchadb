-- Run once in the Supabase SQL editor: a comment can now carry up to 5 photos (it was 3).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.comments'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%array_length(photos%'
  loop
    execute format('alter table public.comments drop constraint %I', c.conname);
  end loop;
  alter table public.comments add constraint comments_photos_max5 check (coalesce(array_length(photos, 1), 0) <= 5);
end $$;
