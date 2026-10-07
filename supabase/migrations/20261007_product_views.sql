-- Product views: how many times visitors showed interest in a product. The most viewed
-- product gets a star and comes first in the carousel and in the catalogue page.

alter table public.products
  add column if not exists view_count bigint not null default 0 check (view_count >= 0);

create index if not exists products_most_viewed_idx
  on public.products (view_count desc) where is_active;

-- Counting a view must not look like an edit: keep updated_at when nothing else changed.
create or replace function public.products_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'view_count') is distinct from (to_jsonb(old) - 'view_count') then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  new.created_at := old.created_at;
  -- Authorship cannot be reassigned, but the foreign key may still clear it when the
  -- author's account is deleted.
  if new.created_by is not null then
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

-- The administration page edits everything about a product except its counter.
revoke update on public.products from authenticated;
grant update (name_pt, name_en, name_es, description_pt, description_en, description_es,
  price_cad_cents, image_path, extra_image_paths, model_path, is_active, sort_order)
  on public.products to authenticated;
revoke insert on public.products from authenticated;
grant insert (name_pt, name_en, name_es, description_pt, description_en, description_es,
  price_cad_cents, image_path, extra_image_paths, model_path, is_active, sort_order)
  on public.products to authenticated;

-- Visitors cannot update products, so the counter goes up through this function only: one
-- step at a time, for a product they could see anyway. Administrators' own visits do not count.
create or replace function public.track_product_view(product_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.products p
    set view_count = p.view_count + 1
    where p.id = product_id
      and p.is_active
      and not (select s.maintenance_mode from public.site_settings s where s.id)
      and not (select public.is_admin());
$$;

revoke all on function public.track_product_view(uuid) from public;
grant execute on function public.track_product_view(uuid) to anon, authenticated;
