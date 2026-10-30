-- Colours remain child rows; names and ordering now belong to a supported locale.
begin;

alter table public.cor
  add column locale text not null default 'pt' check (locale in ('pt', 'en', 'es'));
-- Existing shared rows keep their IDs and become the Portuguese fallback list.
alter table public.cor alter column locale drop default;
alter table public.cor drop constraint cor_product_id_sort_order_key;
alter table public.cor add constraint cor_product_locale_order_key unique (product_id, locale, sort_order);
drop index public.cor_product_name_idx;
create unique index cor_product_name_idx on public.cor (product_id, locale, lower(name));
grant insert (locale), update (locale) on public.cor to authenticated;

create or replace function public.save_product_with_colors(p_id uuid, p_product jsonb, p_colors jsonb)
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
  if jsonb_array_length(p_colors) > 60 then
    raise invalid_parameter_value using message = 'Too many colours';
  end if;
  for c in select value from jsonb_array_elements(p_colors) loop
    if jsonb_typeof(c) is distinct from 'object' then
      raise invalid_parameter_value using message = 'Invalid colour';
    end if;
    if jsonb_typeof(c->'name') is distinct from 'string'
      or jsonb_typeof(c->'locale') is distinct from 'string'
      or c->>'locale' not in ('pt', 'en', 'es')
      or (c ? 'hex' and jsonb_typeof(c->'hex') not in ('string', 'null'))
      or exists (select 1 from jsonb_object_keys(c) k where k not in ('name', 'hex', 'locale')) then
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
  insert into public.cor (product_id, name, hex, locale, sort_order)
    select v_id, btrim(item->>'name'), upper(item->>'hex'), item->>'locale',
      row_number() over (partition by item->>'locale' order by position)::integer - 1
    from jsonb_array_elements(p_colors) with ordinality as items(item, position);
  return v_id;
end;
$$;
revoke all on function public.save_product_with_colors(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_product_with_colors(uuid, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
