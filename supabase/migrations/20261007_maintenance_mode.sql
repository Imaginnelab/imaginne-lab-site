-- Maintenance mode: while it is on, only administrators use the site. The pages show a
-- maintenance screen to everyone else (a curtain drawn in the browser), and the rule below
-- keeps the catalogue itself out of the public API, which the browser cannot bypass.

-- One row of site-wide settings. The boolean primary key pinned to true keeps it a single row.
create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  maintenance_mode boolean not null default false,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (true) on conflict (id) do nothing;

create or replace function public.site_settings_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  -- Only a real switch records its author, so the foreign key can still clear the column
  -- when that account is deleted.
  if new.maintenance_mode is distinct from old.maintenance_mode then
    new.updated_by := (select auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch
  before update on public.site_settings
  for each row execute function public.site_settings_touch();

alter table public.site_settings enable row level security;

-- Everyone may know whether the site is under maintenance; only that column is readable
-- and writable through the API, and only administrators may change it.
revoke all on public.site_settings from anon, authenticated;
grant select (id, maintenance_mode) on public.site_settings to anon, authenticated;
grant update (maintenance_mode) on public.site_settings to authenticated;

drop policy if exists "site settings: public reads" on public.site_settings;
create policy "site settings: public reads" on public.site_settings
  for select to anon, authenticated
  using (true);

drop policy if exists "site settings: admin updates" on public.site_settings;
create policy "site settings: admin updates" on public.site_settings
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Under maintenance, visitors get no products at all; administrators still see everything.
drop policy if exists "products: public reads active" on public.products;
create policy "products: public reads active" on public.products
  for select to anon, authenticated
  using (
    (is_active and not (select s.maintenance_mode from public.site_settings s where s.id))
    or (select public.is_admin())
  );
