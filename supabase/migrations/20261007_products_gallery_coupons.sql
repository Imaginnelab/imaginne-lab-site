-- Store, second step: several photos and an optional 3D model per product, and discount
-- coupons managed from /admin/.
-- Authorization lives here (RLS and grants), not in the browser.

-- Extra photos of a product, in display order. image_path stays the cover, so a product
-- always has at least one photo; together they allow up to six.
alter table public.products
  add column if not exists extra_image_paths text[] not null default '{}';

-- Each element is checked on its own: joining the array into one string would let a path
-- containing the separator pass as two valid ones.
create or replace function public.products_valid_extra_paths(paths text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_ndims(paths), 1) = 1
    and cardinality(paths) <= 5
    and not exists (
      select 1 from unnest(paths) as p
      -- Same rule as image_path: an object path, never a URL.
      where p is null or p !~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$' or p ~ '\.\.'
    );
$$;

alter table public.products drop constraint if exists products_extra_image_paths_check;
alter table public.products add constraint products_extra_image_paths_check
  check (public.products_valid_extra_paths(extra_image_paths));

-- Optional 3D model (GLB) shown first on the product card. Object path inside the
-- product-models bucket; the cover photo stays mandatory and doubles as its poster.
alter table public.products add column if not exists model_path text;

alter table public.products drop constraint if exists products_model_path_check;
alter table public.products add constraint products_model_path_check check (
  model_path is null
  or (model_path ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,195}\.glb$' and model_path !~ '\.\.')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-models', 'product-models', true, 15728640, array['model/gltf-binary'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product models: admin uploads" on storage.objects;
create policy "product models: admin uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-models' and (select public.is_admin()));

drop policy if exists "product models: admin updates" on storage.objects;
create policy "product models: admin updates" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-models' and (select public.is_admin()))
  with check (bucket_id = 'product-models' and (select public.is_admin()));

drop policy if exists "product models: admin deletes" on storage.objects;
create policy "product models: admin deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-models' and (select public.is_admin()));

-- Removing a file through the storage API reads the object row first, so administrators
-- also need to see the objects of both buckets. Public downloads do not go through RLS.
drop policy if exists "product files: admin reads" on storage.objects;
create policy "product files: admin reads" on storage.objects
  for select to authenticated
  using (bucket_id in ('product-images', 'product-models') and (select public.is_admin()));

-- Discount coupons. Nothing redeems them yet (there is no checkout); they are private to
-- administrators so codes cannot be listed or guessed through the public API.
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'),
  discount_type text not null check (discount_type in ('percent', 'amount')),
  percent_off integer,
  -- Canadian dollar cents, like products.price_cad_cents.
  amount_off_cad_cents integer,
  starts_at timestamptz,
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses between 1 and 1000000),
  -- Written only by the future checkout, never from the admin page (see grants below).
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_discount_check check (
    (discount_type = 'percent' and percent_off is not null and percent_off between 1 and 100 and amount_off_cad_cents is null)
    or (discount_type = 'amount' and amount_off_cad_cents is not null and amount_off_cad_cents between 1 and 100000000 and percent_off is null)
  ),
  constraint coupons_period_check check (starts_at is null or expires_at is null or expires_at > starts_at)
);

create or replace function public.coupons_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists coupons_touch on public.coupons;
create trigger coupons_touch
  before update on public.coupons
  for each row execute function public.coupons_touch();

alter table public.coupons enable row level security;

revoke all on public.coupons from anon, authenticated;
grant select, delete on public.coupons to authenticated;
grant insert (code, discount_type, percent_off, amount_off_cad_cents, starts_at, expires_at, max_uses, is_active)
  on public.coupons to authenticated;
grant update (code, discount_type, percent_off, amount_off_cad_cents, starts_at, expires_at, max_uses, is_active)
  on public.coupons to authenticated;

drop policy if exists "coupons: admin reads" on public.coupons;
create policy "coupons: admin reads" on public.coupons
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "coupons: admin inserts" on public.coupons;
create policy "coupons: admin inserts" on public.coupons
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "coupons: admin updates" on public.coupons;
create policy "coupons: admin updates" on public.coupons
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "coupons: admin deletes" on public.coupons;
create policy "coupons: admin deletes" on public.coupons
  for delete to authenticated
  using ((select public.is_admin()));
