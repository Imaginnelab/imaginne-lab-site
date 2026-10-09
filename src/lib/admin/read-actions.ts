'use server';

import { getAdmin } from '@/lib/dal';
import { type AdminCoupon, type AdminPage, type AdminProduct, listCoupons, listProducts, maintenanceState, mostViewedProductId } from './queries';
import { type AdminFailure, listSchema } from './schemas';

// Reads the admin lists ask for after the first page (next pages, search, reload). They are
// Server Actions, so anyone can call them: each one asks who is calling and validates what
// arrived before reaching the queries, which check the administrator again next to the data.

type Refused = { ok: false; code: AdminFailure };
const refuse = (code: AdminFailure): Refused => ({ ok: false, code });

export async function loadAdminProducts(input: unknown): Promise<{ ok: true; page: AdminPage<AdminProduct>; mostViewedId: string | null } | Refused> {
  if (!(await getAdmin())) return refuse('unauthorized');
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return refuse('invalid');
  const [page, mostViewedId] = await Promise.all([listProducts(parsed.data), mostViewedProductId()]);
  return page ? { ok: true, page, mostViewedId } : refuse('failed');
}

export async function loadAdminCoupons(input: unknown): Promise<{ ok: true; page: AdminPage<AdminCoupon> } | Refused> {
  if (!(await getAdmin())) return refuse('unauthorized');
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return refuse('invalid');
  const page = await listCoupons(parsed.data);
  return page ? { ok: true, page } : refuse('failed');
}

export async function loadAdminMaintenance(): Promise<{ ok: true; on: boolean } | Refused> {
  if (!(await getAdmin())) return refuse('unauthorized');
  const on = await maintenanceState();
  return on === null ? refuse('failed') : { ok: true, on };
}
