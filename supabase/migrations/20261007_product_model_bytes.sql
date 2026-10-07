-- Size of a product's 3D model in bytes, so pages can decide how to load it without asking
-- the storage for every file. Null when there is no model or the size was never recorded.
alter table public.products
  add column if not exists model_bytes integer check (model_bytes is null or model_bytes between 1 and 15728640);

grant insert (model_bytes), update (model_bytes) on public.products to authenticated;
