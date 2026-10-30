-- Normalize product colours: one product has many rows in public.cor, without locale.
-- Product and colour writes share one invoker transaction; existing RLS stays authoritative.
begin;

-- Removed UI fields must be empty before dropping; never silently erase legacy content.
do $$
begin
  if exists (select 1 from public.products where
    btrim(sizes_pt || sizes_en || sizes_es || personalization_pt || personalization_en || personalization_es) <> '') then
    raise check_violation using message = 'Removed optional fields contain data; migrate before dropping';
  end if;
end;
$$;

create table public.cor (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120 and name = btrim(name) and name !~ '[[:cntrl:]]'),
  hex text check (hex is null or hex ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null check (sort_order between 0 and 19),
  unique (product_id, sort_order)
);
create unique index cor_product_name_idx on public.cor (product_id, lower(name));

alter table public.cor enable row level security;
revoke all on public.cor from public, anon, authenticated;
grant select on public.cor to anon, authenticated;
grant insert (product_id, name, hex, sort_order), update (name, hex, sort_order)
  on public.cor to authenticated;
grant delete on public.cor to authenticated;

-- Parent RLS also hides colours of inactive products and during maintenance.
create policy "cor: visible product" on public.cor for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy "cor: admin inserts" on public.cor for insert to authenticated
  with check ((select public.is_admin()) and exists (select 1 from public.products p where p.id = product_id));
create policy "cor: admin updates" on public.cor for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()) and exists (select 1 from public.products p where p.id = product_id));
create policy "cor: admin deletes" on public.cor for delete to authenticated
  using ((select public.is_admin()));

-- Preserve legacy lists before removing columns. Repeated HEX/name entries are folded;
-- malformed or oversized legacy data aborts the transaction instead of being truncated.
with legacy as (
  select p.id as product_id, l.lang_order, btrim(s.item) as item, s.position
  from public.products p
  cross join lateral (values (0, p.colors_pt), (1, p.colors_en), (2, p.colors_es)) l(lang_order, colors)
  cross join lateral regexp_split_to_table(l.colors, E'[,;\\n]') with ordinality s(item, position)
  where btrim(s.item) <> ''
), parsed as (
  select product_id, lang_order, position,
    btrim(regexp_replace(item, '\s*\(#[0-9a-fA-F]{6}\)$', '')) as name,
    upper((regexp_match(item, '\s*\((#[0-9a-fA-F]{6})\)$'))[1]) as hex
  from legacy
), unique_tones as (
  select distinct on (product_id, coalesce('hex:' || hex, 'name:' || lower(name))) *
  from parsed order by product_id, coalesce('hex:' || hex, 'name:' || lower(name)), lang_order, position
), unique_names as (
  select distinct on (product_id, lower(name)) *
  from unique_tones order by product_id, lower(name), lang_order, position
)
insert into public.cor (product_id, name, hex, sort_order)
  select product_id, name, hex, row_number() over (partition by product_id order by lang_order, position)::integer - 1
  from unique_names;

create function public.save_product_with_colors(p_id uuid, p_product jsonb, p_colors jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v public.products;
  v_id uuid;
  c jsonb;
begin
  if not coalesce((select public.is_admin()), false) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  if jsonb_typeof(p_product) is distinct from 'object' then
    raise invalid_parameter_value using message = 'Invalid product';
  end if;
  if exists (select 1 from jsonb_object_keys(p_product) k
    where not (k = any (array['name_pt', 'name_en', 'name_es', 'description_pt', 'description_en', 'description_es', 'price_cad_cents', 'image_path', 'extra_image_paths', 'model_path', 'model_bytes', 'is_active', 'sort_order', 'category_pt', 'category_en', 'category_es', 'material_pt', 'material_en', 'material_es', 'finish_pt', 'finish_en', 'finish_es', 'care_pt', 'care_en', 'care_es', 'width_cm', 'height_cm', 'depth_cm', 'weight_g', 'stock_quantity']))) then
    raise invalid_parameter_value using message = 'Unsupported product column';
  end if;
  if jsonb_typeof(p_colors) is distinct from 'array' then
    raise invalid_parameter_value using message = 'Invalid colours';
  end if;
  if jsonb_array_length(p_colors) > 20 then
    raise invalid_parameter_value using message = 'Too many colours';
  end if;
  for c in select value from jsonb_array_elements(p_colors) loop
    if jsonb_typeof(c) is distinct from 'object' then
      raise invalid_parameter_value using message = 'Invalid colour';
    end if;
    if jsonb_typeof(c->'name') is distinct from 'string'
      or (c ? 'hex' and jsonb_typeof(c->'hex') not in ('string', 'null'))
      or exists (select 1 from jsonb_object_keys(c) k where k not in ('name', 'hex')) then
      raise invalid_parameter_value using message = 'Invalid colour fields';
    end if;
  end loop;
  v := jsonb_populate_record(null::public.products, p_product);
  if p_id is null then
    insert into public.products (name_pt, name_en, name_es, description_pt, description_en, description_es, price_cad_cents, image_path, extra_image_paths, model_path, model_bytes, is_active, sort_order, category_pt, category_en, category_es, material_pt, material_en, material_es, finish_pt, finish_en, finish_es, care_pt, care_en, care_es, width_cm, height_cm, depth_cm, weight_g, stock_quantity)
      values (v.name_pt, v.name_en, v.name_es, v.description_pt, v.description_en, v.description_es, v.price_cad_cents, v.image_path, v.extra_image_paths, v.model_path, v.model_bytes, v.is_active, v.sort_order, v.category_pt, v.category_en, v.category_es, v.material_pt, v.material_en, v.material_es, v.finish_pt, v.finish_en, v.finish_es, v.care_pt, v.care_en, v.care_es, v.width_cm, v.height_cm, v.depth_cm, v.weight_g, v.stock_quantity) returning id into v_id;
  else
    -- This row lock serializes concurrent saves of the same product and its colours.
    update public.products set
      name_pt = v.name_pt,
      name_en = v.name_en,
      name_es = v.name_es,
      description_pt = v.description_pt,
      description_en = v.description_en,
      description_es = v.description_es,
      price_cad_cents = v.price_cad_cents,
      image_path = v.image_path,
      extra_image_paths = v.extra_image_paths,
      model_path = v.model_path,
      model_bytes = v.model_bytes,
      is_active = v.is_active,
      sort_order = v.sort_order,
      category_pt = v.category_pt,
      category_en = v.category_en,
      category_es = v.category_es,
      material_pt = v.material_pt,
      material_en = v.material_en,
      material_es = v.material_es,
      finish_pt = v.finish_pt,
      finish_en = v.finish_en,
      finish_es = v.finish_es,
      care_pt = v.care_pt,
      care_en = v.care_en,
      care_es = v.care_es,
      width_cm = v.width_cm,
      height_cm = v.height_cm,
      depth_cm = v.depth_cm,
      weight_g = v.weight_g,
      stock_quantity = v.stock_quantity
      where id = p_id returning id into v_id;
    if v_id is null then
      raise no_data_found using message = 'Product not found';
    end if;
  end if;

  delete from public.cor where product_id = v_id;
  insert into public.cor (product_id, name, hex, sort_order)
    select v_id, btrim(item->>'name'), upper(item->>'hex'), position::integer - 1
    from jsonb_array_elements(p_colors) with ordinality as items(item, position);
  return v_id;
end;
$$;
revoke all on function public.save_product_with_colors(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_product_with_colors(uuid, jsonb, jsonb) to authenticated;

alter table public.products
  drop column colors_pt, drop column colors_en, drop column colors_es,
  drop column sizes_pt, drop column sizes_en, drop column sizes_es,
  drop column personalization_pt, drop column personalization_en, drop column personalization_es;

notify pgrst, 'reload schema';
commit;

