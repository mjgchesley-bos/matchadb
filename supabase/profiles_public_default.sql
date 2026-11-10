-- New accounts get a public profile page by default (members can switch it off in My matcha).
-- Only the default changes: every existing profile keeps the choice its owner made.
alter table public.profiles alter column is_public set default true;
