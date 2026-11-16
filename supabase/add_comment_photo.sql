-- Run once in the Supabase SQL editor (safe to re-run): a member can add photos to one of their own comments after posting it.
-- Members have no update policy on comments, so this goes through a function that checks the comment is theirs, the photo is in their
-- own storage folder, and the comment stays within 5 photos.
create or replace function public.add_comment_photo(p_comment uuid, p_path text) returns void
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select id, photos into c from public.comments where id = p_comment and user_id = auth.uid();
  if not found then raise exception 'not your comment'; end if;
  if p_path is null or position((auth.uid()::text || '/') in p_path) <> 1 or p_path like '%..%' or p_path !~ '\.(jpg|jpeg|png|webp)$' then raise exception 'bad photo path'; end if;
  if coalesce(array_length(c.photos, 1), 0) >= 5 then raise exception 'Too many photos on this comment'; end if;
  update public.comments set photos = array_append(photos, p_path) where id = p_comment;
end;
$$;
revoke all on function public.add_comment_photo(uuid, text) from public, anon;
grant execute on function public.add_comment_photo(uuid, text) to authenticated;
