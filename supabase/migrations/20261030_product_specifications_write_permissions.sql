-- The specifications migration granted SELECT only. This project restricts writes by
-- column, so authenticated administrators also need these grants to save products.
-- RLS still requires is_admin(); no table-wide or private-column access is granted.
begin;

grant insert (category_pt, category_en, category_es, material_pt, material_en, material_es,
  finish_pt, finish_en, finish_es, care_pt, care_en, care_es,
  colors_pt, colors_en, colors_es, sizes_pt, sizes_en, sizes_es,
  personalization_pt, personalization_en, personalization_es,
  width_cm, height_cm, depth_cm, weight_g, stock_quantity),
  update (category_pt, category_en, category_es, material_pt, material_en, material_es,
  finish_pt, finish_en, finish_es, care_pt, care_en, care_es,
  colors_pt, colors_en, colors_es, sizes_pt, sizes_en, sizes_es,
  personalization_pt, personalization_en, personalization_es,
  width_cm, height_cm, depth_cm, weight_g, stock_quantity)
  on public.products to authenticated;

notify pgrst, 'reload schema';
commit;
