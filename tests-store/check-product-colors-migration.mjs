import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Full PostgreSQL checks in memory. Never connects to the real Supabase backend.
if (!process.argv[2]) throw new Error('Provide the temporary npm prefix containing @electric-sql/pglite.');
const { PGlite } = createRequire(import.meta.url)(resolve(process.argv[2], 'node_modules/@electric-sql/pglite'));
const db = new PGlite();
const readMigration = (name) => readFile(new URL('../supabase/migrations/' + name + '.sql', import.meta.url), 'utf8');
const baseFields = ['name_pt', 'name_en', 'name_es', 'description_pt', 'description_en', 'description_es', 'price_cad_cents',
  'image_path', 'extra_image_paths', 'model_path', 'model_bytes', 'is_active', 'sort_order'];
const textFields = ['category', 'material', 'finish', 'care'].flatMap((field) => ['pt', 'en', 'es'].map((lang) => field + '_' + lang));
const numericFields = ['width_cm', 'height_cm', 'depth_cm', 'weight_g', 'stock_quantity'];
const writable = [...baseFields, ...textFields, ...numericFields];
const product = {
  ...Object.fromEntries(textFields.map((key) => [key, ''])), ...Object.fromEntries(numericFields.map((key) => [key, null])),
  name_pt: 'Vaso', name_en: 'Vase', name_es: 'Florero', description_pt: 'Descrição', description_en: 'Description', description_es: 'Descripción',
  price_cad_cents: 4990, image_path: 'vase.jpg', extra_image_paths: [], model_path: null, model_bytes: null, is_active: true, sort_order: 0,
};
const activeId = '10000000-0000-4000-8000-000000000001';
const inactiveId = '10000000-0000-4000-8000-000000000002';
const colors = [{ name: 'Verde', hex: '#556B2F' }, { name: 'Branco', hex: '#FFFFFF' }];
const save = async (id, input = product, selectedColors = colors) => (await db.query(
  'select public.save_product_with_colors($1, $2::jsonb, $3::jsonb) as id', [id, JSON.stringify(input), JSON.stringify(selectedColors)],
)).rows[0].id;
const rows = async (id) => (await db.query('select name, hex, sort_order from public.cor where product_id=$1 order by sort_order', [id])).rows;
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create function public.is_admin() returns boolean language sql stable as $$
      select coalesce(current_setting('test.is_admin', true), 'false') = 'true'
    $$;
    create table public.site_settings (id boolean primary key, maintenance_mode boolean not null);
    insert into public.site_settings values (true, false);
    grant select on public.site_settings to anon, authenticated;
  `);
  const initial = await readMigration('20261007_products');
  await db.exec(initial.match(/create table if not exists public.products \([\s\S]*?\n\);/)[0]);
  await db.exec(`
    alter table public.products add column extra_image_paths text[] not null default '{}',
      add column model_path text, add column model_bytes integer, add column view_count bigint not null default 0;
    alter table public.products enable row level security;
    create policy visible_products on public.products for select to anon, authenticated
      using ((is_active and not (select maintenance_mode from public.site_settings where id)) or (select public.is_admin()));
    create policy admin_inserts on public.products for insert to authenticated with check ((select public.is_admin()));
    create policy admin_updates on public.products for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
    create policy admin_deletes on public.products for delete to authenticated using ((select public.is_admin()));
    grant select (id, ${baseFields.join(', ')}, view_count) on public.products to anon, authenticated;
    grant insert (${baseFields.join(', ')}), update (${baseFields.join(', ')}) on public.products to authenticated;
    grant delete on public.products to authenticated;
  `);
  await db.exec(await readMigration('20261030_product_specifications'));
  await db.exec(await readMigration('20261030_product_specifications_write_permissions'));
  const seed = async (id, active) => db.query(`insert into public.products (id, ${writable.join(', ')})
    select $1::uuid, ${writable.map((key) => 'r.' + key).join(', ')} from jsonb_populate_record(null::public.products, $2::jsonb) r`,
  [id, JSON.stringify({ ...product, is_active: active })]);
  await seed(activeId, true); await seed(inactiveId, false);
  await db.query('update public.products set colors_pt=$1, colors_en=$2 where id=$3',
    ['Verde (#556B2F), Branco (#FFFFFF)', 'Green (#556B2F), Azul (#0000FF)', activeId]);
  await db.query('update public.products set colors_pt=$1 where id=$2', ['Preto (#000000)', inactiveId]);
  const before = (await db.query('select id, name_pt, stock_quantity, width_cm from public.products order by id')).rows;
  await db.exec(await readMigration('20261030_product_colors_relation'));
  assert.deepEqual((await db.query('select id, name_pt, stock_quantity, width_cm from public.products order by id')).rows, before);
  assert.equal((await db.query("select count(*)::int n from information_schema.columns where table_schema='public' and table_name='products' and column_name ~ '^(colors|sizes|personalization)_(pt|en|es)$'")).rows[0].n, 0);
  assert.deepEqual(await rows(activeId), [...colors, { name: 'Azul', hex: '#0000FF' }].map((c, sort_order) => ({ ...c, sort_order })));
  assert.equal((await db.query('select count(distinct id)::int n from public.cor')).rows[0].n, 4);
  assert.equal((await db.query("select prosecdef from pg_proc where oid='public.save_product_with_colors(uuid,jsonb,jsonb)'::regprocedure")).rows[0].prosecdef, false);

  // Visitors only see colours of publicly visible products, including maintenance.
  await db.exec('set role anon');
  assert.equal((await db.query('select * from public.cor')).rows.length, 3);
  await assert.rejects(save(activeId), { code: '42501' });
  await assert.rejects(db.query('insert into public.cor (product_id,name,sort_order) values ($1,$2,3)', [activeId, 'Forbidden']), { code: '42501' });
  await db.exec('reset role; update public.site_settings set maintenance_mode=true; set role anon');
  assert.equal((await db.query('select * from public.cor')).rows.length, 0);
  await db.exec('reset role; update public.site_settings set maintenance_mode=false; set role authenticated');
  await assert.rejects(save(activeId), { code: '42501' });
  await assert.rejects(db.query('insert into public.cor (product_id,name,sort_order) values ($1,$2,3)', [activeId, 'Forbidden']), { code: '42501' });
  assert.equal((await db.query('delete from public.cor returning id')).rows.length, 0);
  assert.equal((await db.query("update public.cor set name='Forbidden' returning id")).rows.length, 0);

  // An authenticated administrator can create/update a product with many child colours.
  await db.exec("reset role; set test.is_admin='true'; set role authenticated");
  const newId = await save(null, { ...product, is_active: false });
  assert.notEqual(newId, activeId);
  assert.deepEqual(await rows(newId), colors.map((c, sort_order) => ({ ...c, sort_order })));
  await save(newId, { ...product, name_pt: 'Atualizado' }, [{ name: 'Azul', hex: '#0000ff' }]);
  assert.deepEqual(await rows(newId), [{ name: 'Azul', hex: '#0000FF', sort_order: 0 }]);
  assert.equal((await rows(activeId)).length, 3);

  // A colour failure rolls back the product UPDATE and the child DELETE/INSERT.
  await assert.rejects(save(newId, { ...product, name_pt: 'Must roll back' }, [{ name: 'Invalid', hex: 'url(evil)' }]), { code: '23514' });
  assert.equal((await db.query('select name_pt from public.products where id=$1', [newId])).rows[0].name_pt, 'Atualizado');
  assert.deepEqual(await rows(newId), [{ name: 'Azul', hex: '#0000FF', sort_order: 0 }]);
  const countBefore = (await db.query('select count(*)::int n from public.products')).rows[0].n;
  await assert.rejects(save(null, product, [{ name: 'Invalid', hex: '#FFF' }]), { code: '23514' });
  assert.equal((await db.query('select count(*)::int n from public.products')).rows[0].n, countBefore);
  await assert.rejects(save(newId, product, [{ name: 'Azul', hex: null }, { name: 'azul', hex: null }]), { code: '23505' });
  await assert.rejects(save(newId, { ...product, created_by: inactiveId }), { code: '22023' });
  await assert.rejects(save(newId, { ...product, sizes_pt: 'obsolete' }), { code: '22023' });
  await assert.rejects(save(newId, product, Array.from({ length: 21 }, (_, i) => ({ name: String(i), hex: null }))), { code: '22023' });
  await assert.rejects(save('10000000-0000-4000-8000-999999999999'), { code: 'P0002' });
  await assert.rejects(db.query('select created_by from public.products'), { code: '42501' });
  await assert.rejects(db.query('update public.products set view_count=99 where id=$1', [newId]), { code: '42501' });
  await assert.rejects(db.query('update public.cor set product_id=$1 where product_id=$2', [activeId, newId]), { code: '42501' });

  await save(newId, product, []);
  assert.equal((await rows(newId)).length, 0);
  await save(newId);
  await db.query('delete from public.products where id=$1', [newId]);
  assert.equal((await rows(newId)).length, 0);
  assert.equal((await rows(activeId)).length, 3);
  await db.exec('reset role');
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.cor'::regclass")).rows[0].relrowsecurity, true);
  const previousColors = (await db.query('select id, product_id, name, hex, sort_order from public.cor order by id')).rows;
  await db.exec(await readMigration('20261030_product_colors_locale'));
  assert.deepEqual((await db.query('select id, product_id, name, hex, sort_order from public.cor order by id')).rows, previousColors);
  assert.ok((await db.query('select locale from public.cor')).rows.every((row) => row.locale === 'pt'));
  await db.exec('set role authenticated');
  const translated = [{ name: 'Verde', hex: '#556B2F', locale: 'pt' }, { name: 'Green', hex: '#556B2F', locale: 'en' }, { name: 'Verde', hex: '#556B2F', locale: 'es' }];
  const translatedId = await save(null, { ...product, is_active: false }, translated);
  const translatedRows = async () => (await db.query('select name, hex, locale, sort_order from public.cor where product_id=$1 order by locale, sort_order', [translatedId])).rows;
  assert.deepEqual(await translatedRows(), [translated[1], translated[2], translated[0]].map((color) => ({ ...color, sort_order: 0 })));
  const twentyEach = ['pt', 'en', 'es'].flatMap((locale) => Array.from({ length: 20 }, (_, i) => ({ name: 'Colour ' + i, hex: null, locale })));
  await save(translatedId, product, twentyEach);
  assert.equal((await translatedRows()).length, 60);
  await assert.rejects(save(translatedId, product, Array.from({ length: 21 }, (_, i) => ({ name: String(i), hex: null, locale: 'pt' }))), { code: '23514' });
  assert.equal((await translatedRows()).length, 60);
  for (const invalidColor of [{ name: 'Bad', hex: null }, { name: 'Bad', hex: null, locale: 'fr' }]) {
    await assert.rejects(save(translatedId, product, [invalidColor]), { code: '22023' });
  }
  await assert.rejects(save(translatedId, product, [{ name: 'Same', hex: null, locale: 'en' }, { name: 'same', hex: null, locale: 'en' }]), { code: '23505' });
  await save(translatedId, { ...product, is_active: false }, translated);
  assert.equal((await translatedRows()).length, 3);
  await db.exec("reset role; set test.is_admin='false'; set role authenticated");
  await assert.rejects(save(translatedId, product, translated), { code: '42501' });
  assert.equal((await db.query('select * from public.cor where product_id=$1', [translatedId])).rows.length, 0);
  await db.exec('reset role; set role anon');
  assert.equal((await db.query('select * from public.cor where product_id=$1', [translatedId])).rows.length, 0);
  await assert.rejects(save(translatedId, product, translated), { code: '42501' });
  await db.exec('reset role');
  console.log('Colour migrations passed: normalized rows, nine obsolete columns removed, locale backfill preserves IDs, 20 colours per language, translated names, atomic rollback, RLS, maintenance, private-column protection and cascade deletion.');
} catch (error) {
  console.error({ code: error.code, message: error.message, detail: error.detail, position: error.position, where: error.where });
  process.exitCode = 1;
} finally { await db.close(); }
