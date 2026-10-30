import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Optional standalone SQL check. Supply a temporary npm prefix containing @electric-sql/pglite.
// Uses an in-memory PostgreSQL instance only, with no Supabase connection or credentials.
if (!process.argv[2]) throw new Error('Provide the temporary npm prefix containing @electric-sql/pglite.');
const require = createRequire(import.meta.url);
const { PGlite } = require(resolve(process.argv[2], 'node_modules/@electric-sql/pglite'));
const db = new PGlite();
const id = '10000000-0000-4000-8000-000000000001';
try {
  await db.exec(`
    create role anon; create role authenticated;
    create table public.products (id uuid primary key default gen_random_uuid(), created_by uuid, is_active boolean not null default true);
    insert into public.products (id, is_active) values ('${id}', true), ('10000000-0000-4000-8000-000000000002', false);
    alter table public.products enable row level security;
    -- Synthetic admin identity for this in-memory fixture only; never used by the app.
    create function public.is_admin() returns boolean language sql stable as $$
      select coalesce(current_setting('test.is_admin', true), 'false') = 'true'
    $$;
    create policy active_products on public.products for select to anon, authenticated using (is_active or (select public.is_admin()));
    create policy admin_inserts on public.products for insert to authenticated with check ((select public.is_admin()));
    create policy admin_updates on public.products for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
    grant select (id, is_active) on public.products to anon, authenticated;
    grant insert (is_active), update (is_active) on public.products to authenticated;
  `);
  const migration = await readFile(new URL('../supabase/migrations/20261030_product_specifications.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  const rows = await db.query('select category_pt, width_cm, stock_quantity from public.products');
  assert.equal(rows.rows.length, 2);
  assert.deepEqual(rows.rows[0], { category_pt: '', width_cm: null, stock_quantity: null });
  assert.equal((await db.query("select count(*)::int as n from information_schema.columns where table_schema='public' and table_name='products'")).rows[0].n, 29);
  await db.query('update public.products set stock_quantity=0, width_cm=12.5 where id=$1', [id]);
  assert.equal((await db.query('select stock_quantity from public.products where id=$1', [id])).rows[0].stock_quantity, 0);
  for (const [column, value] of [['stock_quantity', -1], ['stock_quantity', 1_000_001], ['width_cm', 0], ['height_cm', -1],
    ['depth_cm', 10_001], ['weight_g', 10_000_001], ['category_pt', 'x'.repeat(121)], ['care_en', 'x'.repeat(1201)]]) {
    await assert.rejects(db.query('update public.products set ' + column + '=$1 where id=$2', [value, id]), { code: '23514' });
  }
  await db.exec('set role anon');
  assert.equal((await db.query('select category_pt, stock_quantity from public.products')).rows.length, 1);
  await assert.rejects(db.query('select created_by from public.products'), { code: '42501' });
  await assert.rejects(db.query('update public.products set stock_quantity=999'), { code: '42501' });
  await db.exec('reset role');
  // Reproduce the reported save error: even an admin lacks column write grants.
  await db.exec("set test.is_admin = 'true'; set role authenticated");
  await assert.rejects(db.query('update public.products set stock_quantity=12 where id=$1', [id]), { code: '42501' });
  await assert.rejects(db.query('insert into public.products (stock_quantity) values (12)'), { code: '42501' });
  await db.exec('reset role');

  const fix = await readFile(new URL('../supabase/migrations/20261030_product_specifications_write_permissions.sql', import.meta.url), 'utf8');
  await db.exec(fix);
  const permissions = await db.query(`select column_name,
    has_column_privilege('authenticated', 'public.products', column_name, 'INSERT') as can_insert,
    has_column_privilege('authenticated', 'public.products', column_name, 'UPDATE') as can_update
    from information_schema.columns where table_schema='public' and table_name='products'
      and column_name not in ('id', 'created_by', 'is_active')`);
  assert.equal(permissions.rows.length, 26);
  assert.ok(permissions.rows.every((column) => column.can_insert && column.can_update));
  await db.exec('set role authenticated');
  const colors = 'Verde (#556B2F), Branco (#FFFFFF)';
  assert.equal((await db.query('update public.products set stock_quantity=12, colors_pt=$1, colors_en=$1, colors_es=$1 where id=$2 returning id', [colors, id])).rows.length, 1);
  assert.equal((await db.query('insert into public.products (stock_quantity, colors_pt) values (3, $1) returning id', [colors])).rows.length, 1);
  await assert.rejects(db.query('update public.products set created_by=null where id=$1', [id]), { code: '42501' });
  await assert.rejects(db.query('select created_by from public.products'), { code: '42501' });
  await db.exec("reset role; set test.is_admin = 'false'; set role authenticated");
  assert.equal((await db.query('update public.products set stock_quantity=999 where id=$1 returning id', [id])).rows.length, 0);
  await assert.rejects(db.query('insert into public.products (stock_quantity) values (999)'), { code: '42501' });
  await db.exec('reset role; set role anon');
  await assert.rejects(db.query('update public.products set stock_quantity=999'), { code: '42501' });
  await assert.rejects(db.query('insert into public.products (stock_quantity) values (999)'), { code: '42501' });
  await db.exec('reset role');
  assert.equal((await db.query('select stock_quantity from public.products where id=$1', [id])).rows[0].stock_quantity, 12);
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.products'::regclass")).rows[0].relrowsecurity, true);
  console.log('Migrations passed: 26 columns and write grants, admin INSERT/UPDATE, anon and non-admin rejection, private columns protected, constraints and RLS preserved.');
} finally { await db.close(); }
