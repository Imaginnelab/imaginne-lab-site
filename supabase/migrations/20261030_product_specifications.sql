-- Additive migration: existing products remain valid. Measurements use cm and g.
-- No RLS policy changes and no access to authorship or other private columns.
begin;

alter table public.products
  add column category_pt text not null default '' check (char_length(category_pt) <= 120),
  add column category_en text not null default '' check (char_length(category_en) <= 120),
  add column category_es text not null default '' check (char_length(category_es) <= 120),
  add column material_pt text not null default '' check (char_length(material_pt) <= 200),
  add column material_en text not null default '' check (char_length(material_en) <= 200),
  add column material_es text not null default '' check (char_length(material_es) <= 200),
  add column finish_pt text not null default '' check (char_length(finish_pt) <= 200),
  add column finish_en text not null default '' check (char_length(finish_en) <= 200),
  add column finish_es text not null default '' check (char_length(finish_es) <= 200),
  add column care_pt text not null default '' check (char_length(care_pt) <= 1200),
  add column care_en text not null default '' check (char_length(care_en) <= 1200),
  add column care_es text not null default '' check (char_length(care_es) <= 1200),
  add column colors_pt text not null default '' check (char_length(colors_pt) <= 300),
  add column colors_en text not null default '' check (char_length(colors_en) <= 300),
  add column colors_es text not null default '' check (char_length(colors_es) <= 300),
  add column sizes_pt text not null default '' check (char_length(sizes_pt) <= 300),
  add column sizes_en text not null default '' check (char_length(sizes_en) <= 300),
  add column sizes_es text not null default '' check (char_length(sizes_es) <= 300),
  add column personalization_pt text not null default '' check (char_length(personalization_pt) <= 1200),
  add column personalization_en text not null default '' check (char_length(personalization_en) <= 1200),
  add column personalization_es text not null default '' check (char_length(personalization_es) <= 1200),
  add column width_cm numeric(10,2) check (width_cm is null or width_cm between 0.01 and 10000),
  add column height_cm numeric(10,2) check (height_cm is null or height_cm between 0.01 and 10000),
  add column depth_cm numeric(10,2) check (depth_cm is null or depth_cm between 0.01 and 10000),
  add column weight_g numeric(10,2) check (weight_g is null or weight_g between 0.01 and 10000000),
  add column stock_quantity integer check (stock_quantity is null or stock_quantity between 0 and 1000000);

grant select (category_pt, category_en, category_es, material_pt, material_en, material_es, finish_pt, finish_en, finish_es, care_pt, care_en, care_es, colors_pt, colors_en, colors_es, sizes_pt, sizes_en, sizes_es, personalization_pt, personalization_en, personalization_es, width_cm, height_cm, depth_cm, weight_g, stock_quantity)
  on public.products to anon, authenticated;

notify pgrst, 'reload schema';
commit;
