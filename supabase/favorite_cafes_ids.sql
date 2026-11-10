-- Saving a café to favorites rejected every Foursquare-sourced café (ids like fsq539e090) because the check only allowed
-- 10 hex characters. About 1 café in 6 has an id of that shape. Run once in the Supabase SQL editor (safe to run again).
alter table public.favorite_cafes drop constraint if exists favorite_cafes_cafe_id_check;
alter table public.favorite_cafes add constraint favorite_cafes_cafe_id_check check (cafe_id ~ '^([0-9a-f]{10}|fsq[0-9a-f]{7})$');
