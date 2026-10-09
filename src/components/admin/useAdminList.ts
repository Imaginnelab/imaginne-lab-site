'use client';
import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { freshRows } from '@/lib/products/format';
import { searchTerm } from '@/lib/search';
import type { AdminPage } from '@/lib/admin/queries';
import type { ListInput } from '@/lib/admin/schemas';
import type { ReadResult } from '@/lib/admin/client/read-actions';
export function useAdminList<Row extends { id: string }>(initial: AdminPage<Row> | null, reader: (input: ListInput) => Promise<ReadResult<Row>>) {
  const [state, setState] = useState(() => ({
    rows: initial?.rows ?? [], total: initial?.total ?? 0, offset: initial?.rows.length ?? 0,
    term: '', loading: false, failed: initial === null, hasMore: !!initial && initial.rows.length < initial.total,
  }));
  const latest = useRef(state);
  const version = useRef(0);
  const flight = useRef<Promise<void> | null>(null);
  const alive = useRef(true);
  const lastInitial = useRef(initial);
  useEffect(() => { alive.current = true; return () => { alive.current = false; version.current++; flight.current = null; }; }, []);
  const update = useCallback((next: typeof state) => { latest.current = next; if (alive.current) setState(next); }, []);
  useEffect(() => {
    if (lastInitial.current === initial) return;
    lastInitial.current = initial;
    // Server refreshes after a mutation can update the first page without the missing
    // paging Action. Longer/search lists require the authenticated reload reader.
    const frame = requestAnimationFrame(() => {
      if (initial && !latest.current.term && latest.current.rows.length <= 12) {
        version.current++; flight.current = null;
        update({ ...latest.current, rows: initial.rows, total: initial.total, offset: initial.rows.length,
          hasMore: initial.rows.length < initial.total, loading: false, failed: false });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [initial, update]);
  const load = useCallback((replace = false, explicit = false): Promise<void> => {
    if (flight.current) return flight.current;
    const before = latest.current;
    if (!replace && (!before.hasMore || before.failed && !explicit)) return Promise.resolve();
    const stamp = version.current;
    update({ ...before, loading: true, failed: false });
    const pending = new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          // Reload all the previously visible rows in batches allowed by the schema.
          const wanted = replace ? Math.max(12, Math.ceil(before.rows.length / 12) * 12) : 12;
          let offset = replace ? 0 : before.offset, total = before.total;
          let incoming: Row[] = [];
          let exhausted = false;
          do {
            const limit = Math.min(120, wanted - incoming.length);
            const result = await reader({ offset, limit, search: before.term });
            if (stamp !== version.current || !alive.current) return;
            if (!result.ok) { update({ ...latest.current, loading: false, failed: true }); return; }
            incoming = [...incoming, ...result.page.rows];
            offset += result.page.rows.length; total = result.page.total;
            exhausted = result.page.rows.length < limit || offset >= total;
          } while (replace && incoming.length < wanted && !exhausted);
          const added = freshRows<Row>(replace ? [] : latest.current.rows, incoming);
          update({ ...latest.current, rows: replace ? added : [...latest.current.rows, ...added],
            total, offset, hasMore: !exhausted,
            loading: false, failed: false });
        } catch { if (stamp === version.current && alive.current) update({ ...latest.current, loading: false, failed: true }); }
        finally { resolve(); }
      });
    }).finally(() => { if (stamp === version.current) flight.current = null; });
    flight.current = pending;
    return pending;
  }, [reader, update]);
  const search = useCallback((term: string) => {
    version.current++; flight.current = null;
    update({ ...latest.current, rows: [], offset: 0, term: searchTerm(term), hasMore: true, failed: false, loading: false });
    return load(true, true);
  }, [load, update]);
  const reload = useCallback(() => load(true, true), [load]);
  const more = useCallback(() => load(false), [load]);
  const retry = useCallback(() => load(latest.current.rows.length === 0, true), [load]);
  const remove = useCallback((id: string) => update({ ...latest.current, rows: latest.current.rows.filter((row) => row.id !== id), total: Math.max(0, latest.current.total - 1) }), [update]);
  const replaceRow = useCallback((row: Row) => update({ ...latest.current, rows: latest.current.rows.map((item) => item.id === row.id ? row : item) }), [update]);
  return { ...state, search, reload, more, retry, remove, replaceRow };
}
