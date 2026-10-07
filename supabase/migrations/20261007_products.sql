-- Store catalogue: products managed from /admin/ and shown on the home page carousel.
-- Authorization lives here (RLS), not in the browser: the admin page only hides UI.

-- Whether the caller is an administrator. SECURITY DEFINER because visitors have no
-- privileges on public.users; it only ever answers about the caller's own row.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.is_admin is true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  -- Every product is registered in the three site languages.
  name_pt text not null check (char_length(name_pt) <= 120 and btrim(name_pt) <> ''),
  name_en text not null check (char_length(name_en) <= 120 and btrim(name_en) <> ''),
  name_es text not null check (char_length(name_es) <= 120 and btrim(name_es) <> ''),
  description_pt text not null check (char_length(description_pt) <= 600 and btrim(description_pt) <> ''),
  description_en text not null check (char_length(description_en) <= 600 and btrim(description_en) <> ''),
  description_es text not null check (char_length(description_es) <= 600 and btrim(description_es) <> ''),
  -- Single price in Canadian dollar cents (the store is Canadian); shown as CAD in every
  -- language. Null means "price on request".
  price_cad_cents integer check (price_cad_cents is null or price_cad_cents between 0 and 100000000),
  -- Object path inside the product-images bucket, never a full URL.
  image_path text not null check (image_path ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$' and image_path !~ '\.\.'),
  is_active boolean not null default true,
  sort_order integer not null default 0 check (sort_order between -100000 and 100000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_listing_idx
  on public.products (sort_order, created_at desc) where is_active;

create or replace function public.products_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.created_at := old.created_at;
  -- Authorship cannot be reassigned, but the foreign key may still clear it when the
  -- author's account is deleted.
  if new.created_by is not null then
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch
  before update on public.products
  for each row execute function public.products_touch();

alter table public.products enable row level security;

revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "products: public reads active" on public.products;
create policy "products: public reads active" on public.products
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

drop policy if exists "products: admin inserts" on public.products;
create policy "products: admin inserts" on public.products
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "products: admin updates" on public.products;
create policy "products: admin updates" on public.products
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "products: admin deletes" on public.products;
create policy "products: admin deletes" on public.products
  for delete to authenticated
  using ((select public.is_admin()));

-- Product photos: public to read, administrators only to write. The bucket itself
-- enforces size and type, so a tampered client cannot upload anything else.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product images: admin uploads" on storage.objects;
create policy "product images: admin uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "product images: admin updates" on storage.objects;
create policy "product images: admin updates" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "product images: admin deletes" on storage.objects;
create policy "product images: admin deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
