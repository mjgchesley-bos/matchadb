-- MatchaDB: full-body avatars. A designed avatar is "d:" + 7 base-36 characters for the face (background, skin, hair style, hair colour, eyes,
-- mouth, extra), optionally followed by 2 more (outfit style, outfit colour). Run once in the Supabase SQL editor; safe to run again.
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (
  avatar is null
  or avatar in ('cup', 'whisk', 'leaf', 'tin', 'kettle', 'sprout', 'bowl', 'spoon', 'bamboo', 'blossom', 'mountain', 'teapot')
  or avatar ~ '^d:[0-9a-z]{7}([0-9a-z]{2}|[0-9a-z]{4})?$'
);
