'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/dal';
import { catalogueAllowed, getProductPage } from './queries';
import { productIdSchema } from './input';
import type { PageResult } from './types';

export async function loadProductPage(input: unknown): Promise<PageResult> {
  return getProductPage(input);
}

export async function recordProductView(input: unknown): Promise<void> {
  const parsed = productIdSchema.safeParse(input);
  if (!parsed.success) return;
  try {
    // Anonymous visits are deliberately allowed by this RPC. Resolve the cookie identity,
    // never replace an expired user's rejected request with an anonymous retry.
    const user = await getCurrentUser();
    if (user?.isAdmin || !(await catalogueAllowed())) return;
    const supabase = await createClient();
    await supabase.rpc('track_product_view', { product_id: parsed.data }).abortSignal(AbortSignal.timeout(12_000));
  } catch { /* Approximate statistics never interrupt browsing. */ }
}
