-- MatchaDB: events and event photos go live the moment a member posts them (staff can hide anything afterwards). Run once in the Supabase SQL editor (safe to re-run).
-- Needs event_submissions.sql. An event goes live when the page found its place on the map (lat, lng, continent); if it could not, it waits as "pending"
-- and shows in the admin Approvals queue. Event pictures now upload straight to the public event-media bucket, into the member's own folder.

-- Events: members may also send the place the page looked up; the trigger decides the status (members still cannot set it).
grant insert (lat, lng, continent) on table public.event_submissions to authenticated;
drop policy if exists "event_submissions: add own" on public.event_submissions;
create policy "event_submissions: add own" on public.event_submissions for insert to authenticated
  with check (user_id = auth.uid() and rights_ok and admin_note is null);
create or replace function public.event_auto_publish() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.lat is not null and new.lng is not null and new.continent is not null then
    new.status := 'approved'; new.approved_at := now();
  else
    new.status := 'pending'; new.approved_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists event_submissions_publish on public.event_submissions;
create trigger event_submissions_publish before insert on public.event_submissions for each row execute function public.event_auto_publish();

-- Event photos: live on insert, but only when the picture sits in the member's own folder.
drop policy if exists "event_photos: add own" on public.event_photos;
create policy "event_photos: add own" on public.event_photos for insert to authenticated
  with check (user_id = auth.uid() and rights_ok and admin_note is null and path like auth.uid()::text || '/%');
create or replace function public.event_photo_publish() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.status := 'approved';
  return new;
end;
$$;
drop trigger if exists event_photos_publish on public.event_photos;
create trigger event_photos_publish before insert on public.event_photos for each row execute function public.event_photo_publish();

-- Members upload event pictures straight to the public bucket, into their own folder (and may remove their own).
drop policy if exists "event media: add own" on storage.objects;
create policy "event media: add own" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "event media: remove own" on storage.objects;
create policy "event media: remove own" on storage.objects for delete to authenticated
  using (bucket_id = 'event-media' and (storage.foldername(name))[1] = auth.uid()::text);
