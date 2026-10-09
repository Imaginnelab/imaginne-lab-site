'use client';

import { startTransition } from 'react';
import { recordProductView } from '@/lib/products/actions';

const seen = new Set<string>();
export function trackView(id: string) {
  if (seen.has(id)) return;
  const key = 'imaginne-product-view:' + id;
  try { if (sessionStorage.getItem(key)) { seen.add(id); return; } } catch { /* In-memory fallback. */ }
  seen.add(id);
  try { sessionStorage.setItem(key, '1'); } catch { /* In-memory fallback. */ }
  startTransition(async () => {
    try { await recordProductView(id); } catch { /* A failed statistics request must not interrupt browsing. */ }
  });
}
