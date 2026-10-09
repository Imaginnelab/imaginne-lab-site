// TODO Dev1: replace these typed stubs with imports of authenticated, validated
// Server Actions. queries.ts is server-only and cannot be called from the browser.
import type { AdminPage, AdminProduct, AdminCoupon } from '@/lib/admin/queries';
import type { AdminFailure, ListInput } from '@/lib/admin/schemas';
export type ReadResult<Row> = { ok: true; page: AdminPage<Row> } | { ok: false; code: AdminFailure };
export type ProductRead = ReadResult<AdminProduct> & { mostViewedId?: string | null };
export async function readProducts(input: ListInput): Promise<ProductRead> {
  void input; // TODO: loadAdminProducts(input) + mostViewedProductId(), including auth checks.
  return { ok: false, code: 'failed' };
}
export async function readCoupons(input: ListInput): Promise<ReadResult<AdminCoupon>> {
  void input; // TODO: loadAdminCoupons(input), including auth checks.
  return { ok: false, code: 'failed' };
}
export async function readMaintenance(): Promise<{ ok: true; on: boolean } | { ok: false; code: AdminFailure }> {
  // TODO: loadAdminMaintenance(), including auth checks.
  return { ok: false, code: 'failed' };
}

