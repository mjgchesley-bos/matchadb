-- MatchaDB business profiles: approved café-owner and wholesaler accounts can add a banner photo, product listings (name, explanation, price, link)
-- and a bio to their public profile. Run once in the Supabase SQL editor (safe to re-run). Needs tiers_menus_dms.sql first.

alter table public.profiles add column if not exists banner_path text;
alter table public.profiles drop constraint if exists profiles_banner_path_check;
alter table public.profiles add constraint profiles_banner_path_check check (banner_path is null or banner_path like id::text || '/%');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-banners', 'business-banners', true, 2097152, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];
drop policy if exists "business banners: upload own" on storage.objects;
create policy "business banners: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'business-banners' and (storage.foldername(name))[1] = auth.uid()::text
              and exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type <> 'general'));
drop policy if exists "business banners: remove own" on storage.objects;
create policy "business banners: remove own" on storage.objects for delete to authenticated
  using (bucket_id = 'business-banners' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.business_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  description text not null default '' check (char_length(description) <= 800),
  price text not null default '' check (char_length(price) <= 40),
  url text check (url is null or url ~ '^https://\S+$'),
  created_at timestamptz not null default now()
);
create index if not exists business_products_user_idx on public.business_products (user_id, created_at);
alter table public.business_products enable row level security;
drop policy if exists "business products: read own" on public.business_products;
create policy "business products: read own" on public.business_products for select to authenticated using (user_id = auth.uid());
drop policy if exists "business products: add own" on public.business_products;
create policy "business products: add own" on public.business_products for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type <> 'general')
              and (select count(*) from public.business_products x where x.user_id = auth.uid()) < 60);
drop policy if exists "business products: change own" on public.business_products;
create policy "business products: change own" on public.business_products for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "business products: remove own" on public.business_products;
create policy "business products: remove own" on public.business_products for delete to authenticated using (user_id = auth.uid());

-- The public profile reads a business's details, banner and listings through one function (only for public profiles).
create or replace function public.public_business(p_name text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'account_type', p.account_type, 'business_name', p.business_name, 'website', p.website, 'about', p.about, 'accept_dms', p.accept_dms,
    'banner_path', p.banner_path,
    'products', coalesce((select json_agg(json_build_object('name', b.name, 'description', b.description, 'price', b.price, 'url', b.url) order by b.created_at)
                          from public.business_products b where b.user_id = p.id), '[]'::json))
  from public.profiles p where lower(p.display_name) = lower(p_name) and p.is_public;
$$;
revoke all on function public.public_business(text) from public;
grant execute on function public.public_business(text) to anon, authenticated;
