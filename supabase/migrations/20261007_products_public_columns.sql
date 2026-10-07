-- Who registered a product is not public information: the catalogue is read with a column
-- list that leaves created_by out (audit finding SEC-006). Row access is unchanged (RLS).
revoke select on public.products from anon, authenticated;
grant select (id, name_pt, name_en, name_es, description_pt, description_en, description_es,
  price_cad_cents, image_path, extra_image_paths, model_path, model_bytes, is_active, sort_order,
  view_count, created_at, updated_at)
  on public.products to anon, authenticated;
