'use client';
import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Locale } from '@/i18n/config';
import type { AdminDictionary } from '@/i18n/admin-dictionaries';
import type { AdminPage, AdminCoupon } from '@/lib/admin/queries';
import { deleteCoupon, setCouponActive } from '@/lib/admin/actions';
import { readCoupons } from '@/lib/admin/client/read-actions';
import { failureMessage, fill } from '@/lib/admin/client/text';
import { formatPrice } from '@/lib/products/format';
import { SearchBox } from '@/components/catalogue/SearchBox';
import { ConfirmDialog } from './ConfirmDialog';
import { ListFeedback } from './ListFeedback';
import { useAdminList } from './useAdminList';
import { usePanel } from './panel-context';
import { useCouponClock } from './useCouponClock';
const CouponDialog = dynamic(() => import('./CouponDialog').then((module) => module.CouponDialog));
export function CouponsPanel({ locale, copy, initial, initialNow }: {
  locale: Locale; copy: AdminDictionary['coupons']; initial: AdminPage<AdminCoupon> | null; initialNow: number;
}) {
  const { active, onCount } = usePanel('coupons');
  const reader = useCallback(async (input: Parameters<typeof readCoupons>[0]) => {
    const result = await readCoupons(input); if (result.ok && !input.search) onCount(result.page.total); return result;
  }, [onCount]);
  const list = useAdminList(initial, reader);
  const [editing, setEditing] = useState<{ row: AdminCoupon | null } | null>(null);
  const [deleting, setDeleting] = useState<AdminCoupon | null>(null);
  const [notice, setNotice] = useState({ text: '', error: false });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const locked = useRef(false), router = useRouter();
  const { now, timeZone } = useCouponClock(initialNow);
  const dates = (iso: string) => new Intl.DateTimeFormat({ en: 'en-CA', pt: 'pt-BR', es: 'es-ES' }[locale], { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(iso));
  return <>
    <div className="products-head"><div><h2 id="coupons-title">{copy.title}</h2><p className="products-sub">{copy.subtitle}</p></div>
      <div className="products-tools" id="coupons-tools">
        <SearchBox copy={{ open: copy.searchOpen, field: copy.searchField, clear: copy.searchClear, searching: copy.searching, noResults: copy.noResults }} onSearch={list.search} />
        <button className="btn btn-primary btn-sm" id="coupon-new" type="button" disabled={pending} onClick={() => setEditing({ row: null })}>{copy.add}</button>
      </div></div>
    <p className={'products-notice' + (notice.error ? ' is-error' : '')} role="status" aria-live="polite">{notice.text}</p>
    <ListFeedback active={active} size={list.rows.length} term={list.term} loading={list.loading} failed={list.failed} hasMore={list.hasMore} more={list.more} retry={list.retry} copy={copy}>
      <ul className="products-list" id="coupons-list" aria-busy={list.loading ? 'true' : undefined}>
        {list.rows.map((row) => {
          const period = row.starts_at && row.expires_at ? fill(copy.periodBoth, { start: dates(row.starts_at), end: dates(row.expires_at) }) :
            row.starts_at ? fill(copy.periodFrom, { start: dates(row.starts_at) }) : row.expires_at ? fill(copy.periodUntil, { end: dates(row.expires_at) }) : copy.periodNone;
          const status = !row.is_active ? 'inactive' : row.expires_at && Date.parse(row.expires_at) <= now ? 'expired' :
            row.max_uses !== null && row.used_count >= row.max_uses ? 'exhausted' : row.starts_at && Date.parse(row.starts_at) > now ? 'scheduled' : 'active';
          const waiting = pending && busyId === row.id;
          return <li className={'product-row coupon-row' + (status !== 'active' && status !== 'scheduled' ? ' is-inactive' : '')} key={row.id}>
            <div className="product-info"><p className="product-name coupon-code">{row.code}</p>
              <p className="product-price coupon-discount">{row.discount_type === 'percent' ? fill(copy.percentOff, { n: row.percent_off ?? 0 }) : fill(copy.amountOff, { amount: formatPrice(row.amount_off_cad_cents, locale) })}</p></div>
            <div className="coupon-facts"><p className="coupon-period">{period}</p><p className="coupon-uses">{row.max_uses === null ? fill(copy.uses, { used: row.used_count }) : fill(copy.usesOf, { used: row.used_count, max: row.max_uses })}</p></div>
            <p className="product-status"><span className="product-badge">{copy[status]}</span></p>
            <div className="product-actions">
              <button className="btn btn-ghost btn-sm" type="button" disabled={pending} aria-label={fill(copy.editLabel, { code: row.code })} onClick={() => setEditing({ row })}>{copy.edit}</button>
              <button className="btn btn-ghost btn-sm" type="button" disabled={pending} aria-label={fill(row.is_active ? copy.deactivateLabel : copy.activateLabel, { code: row.code })} aria-busy={waiting ? 'true' : undefined}
                onClick={() => { if (locked.current) return; locked.current = true; setBusyId(row.id); start(async () => {
                  try { const result = await setCouponActive(row.id, !row.is_active);
                    if (result.ok) { list.replaceRow({ ...row, is_active: !row.is_active }); setNotice({ text: row.is_active ? copy.deactivated : copy.activated, error: false }); router.refresh(); void list.reload(); }
                    else setNotice({ text: failureMessage(result.code, copy, copy.toggleError), error: true });
                  } catch { setNotice({ text: copy.toggleError, error: true }); }
                  finally { locked.current = false; setBusyId(null); }
                }); }}>{row.is_active ? copy.deactivate : copy.activate}</button>
              <button className="btn btn-ghost btn-sm product-delete-btn" type="button" disabled={pending} aria-label={fill(copy.deleteLabel, { code: row.code })} onClick={() => setDeleting(row)}>{copy.delete}</button>
            </div>
          </li>;
        })}
      </ul>
    </ListFeedback>
    {editing ? <CouponDialog source={editing.row} copy={copy} close={() => setEditing(null)} done={(message) => { setEditing(null); setNotice({ text: message, error: false }); router.refresh(); void list.reload(); }} /> : null}
    {deleting ? <ConfirmDialog id="coupon-delete" title={copy.deleteTitle} text={fill(copy.deleteText, { code: deleting.code })} cancel={copy.cancel} confirm={copy.delete} waiting={copy.deleting}
      action={() => deleteCoupon(deleting.id)} message={(result) => failureMessage(result.code, copy, copy.deleteError)} close={() => setDeleting(null)}
      done={() => { list.remove(deleting.id); onCount(Math.max(0, list.total - 1)); setDeleting(null); setNotice({ text: copy.deleted, error: false }); router.refresh(); void list.reload(); }} /> : null}
  </>;
}
