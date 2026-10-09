// The lists read through authenticated, validated Server Actions: queries.ts is server-only
// and cannot be called from the browser.
import type { AdminPage, AdminProduct, AdminCoupon } from '@/lib/admin/queries';
import { loadAdminCoupons, loadAdminMaintenance, loadAdminProducts } from '@/lib/admin/read-actions';
import type { AdminFailure, ListInput } from '@/lib/admin/schemas';
export type ReadResult<Row> = { ok: true; page: AdminPage<Row> } | { ok: false; code: AdminFailure };
export type ProductRead = { ok: true; page: AdminPage<AdminProduct>; mostViewedId: string | null } | { ok: false; code: AdminFailure };
export const readProducts = (input: ListInput): Promise<ProductRead> => loadAdminProducts(input);
export const readCoupons = (input: ListInput): Promise<ReadResult<AdminCoupon>> => loadAdminCoupons(input);
export const readMaintenance = (): Promise<{ ok: true; on: boolean } | { ok: false; code: AdminFailure }> => loadAdminMaintenance();
