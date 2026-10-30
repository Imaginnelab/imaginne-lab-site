'use client';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { AdminDictionary } from '@/i18n/admin-dictionaries';
import { localePath, type Locale } from '@/i18n/config';
import { NavigationLink } from '@/components/navigation/NavigationLink';
import type { AdminPage, AdminProduct } from '@/lib/admin/queries';
import { deleteProduct, setProductActive } from '@/lib/admin/actions';
import { readProducts } from '@/lib/admin/client/read-actions';
import { failureMessage, fill } from '@/lib/admin/client/text';
import { SUPABASE_URL } from '@/lib/env';
import { formatPrice, imagePaths, imageUrl, localized, viewCount } from '@/lib/products/format';
import { SearchBox } from '@/components/catalogue/SearchBox';
import { ConfirmDialog } from './ConfirmDialog';
import { ListFeedback } from './ListFeedback';
import { useAdminList } from './useAdminList';
import { usePanel } from './panel-context';
const ProductDialog = dynamic(() => import('./ProductDialog').then((module) => module.ProductDialog));
export function ProductsPanel({ locale, copy, initial, mostViewedId }: {
  locale: Locale; copy: AdminDictionary['products']; initial: AdminPage<AdminProduct> | null;
  mostViewedId: string | null;
}) {
  const { active, onCount } = usePanel('products');
  const [star, setStar] = useState(mostViewedId);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setStar(mostViewedId));
    return () => cancelAnimationFrame(frame);
  }, [mostViewedId]);
  const reader = useCallback(async (input: Parameters<typeof readProducts>[0]) => {
    const result = await readProducts(input);
    if (result.ok) { if (!input.search) onCount(result.page.total); if ('mostViewedId' in result) setStar(result.mostViewedId ?? null); }
    return result;
  }, [onCount]);
  const list = useAdminList(initial, reader);
  const [editing, setEditing] = useState<{ row: AdminProduct | null; duplicate: boolean } | null>(null);
  const [deleting, setDeleting] = useState<AdminProduct | null>(null);
  const [notice, setNotice] = useState({ text: '', error: false });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const locked = useRef(false);
  const router = useRouter();
  function saved(message: string) { setEditing(null); setNotice({ text: message, error: false }); router.refresh(); void list.reload(); }
  return <>
    <div className="products-head"><div><h2 id="products-title">{copy.title}</h2><p className="products-sub">{copy.subtitle}</p></div>
      <div className="products-tools" id="products-tools">
        <SearchBox copy={{ open: copy.searchOpen, field: copy.searchField, clear: copy.searchClear, searching: copy.searching, noResults: copy.noResults }} onSearch={list.search} />
        <button className="btn btn-primary btn-sm" id="product-new" type="button" disabled={pending} onClick={() => setEditing({ row: null, duplicate: false })}>{copy.add}</button>
      </div></div>
    <p className={'products-notice' + (notice.error ? ' is-error' : '')} role="status" aria-live="polite">{notice.text}</p>
    <ListFeedback active={active} size={list.rows.length} term={list.term} loading={list.loading} failed={list.failed} hasMore={list.hasMore} more={list.more} retry={list.retry} copy={copy}>
      <ul className="products-list" id="products-list" tabIndex={-1} aria-busy={list.loading ? 'true' : undefined}>
        {list.rows.map((row) => {
          const name = localized(row, 'name', locale), count = viewCount(row), photos = imagePaths(row).length, waiting = pending && busyId === row.id;
          return <li className={'product-row' + (!row.is_active ? ' is-inactive' : '')} key={row.id}>
            <NavigationLink href={localePath(locale, '/products/' + row.id)} className="product-thumb-link" aria-label={fill(copy.photoAlt, { name })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="product-thumb" src={imageUrl(SUPABASE_URL, row.image_path)} alt="" loading="lazy" decoding="async" width={64} height={64} />
            </NavigationLink>
            <div className="product-info"><p className="product-name"><span className="product-name-text">{name}</span>
              {row.is_active && row.id === star ? <span className="product-star" role="img" aria-label={copy.mostViewed}><svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 2.6 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5L2.5 9.5l6.6-.9z" /></svg></span> : null}</p>
              <p className="product-price">{row.price_cad_cents === null ? copy.onRequest : formatPrice(row.price_cad_cents, locale)}</p>
              <p className="product-photos-count">{photos > 1 ? fill(copy.photoCount, { n: photos }) : ''}</p>
              <p className="product-views">{count === 1 ? copy.viewsOne : fill(copy.viewsMany, { n: new Intl.NumberFormat(locale).format(count) })}</p>
            </div>
            <p className="product-status"><span className="product-badge">{row.is_active ? copy.active : copy.inactive}</span>
              {row.model_path ? <span className="product-3d" aria-label={copy.has3d}>{copy.badge3d}</span> : null}<span className="product-order">{fill(copy.orderShort, { n: row.sort_order })}</span></p>
            <div className="product-actions">
              <button className="btn btn-ghost btn-sm" type="button" disabled={pending} aria-label={fill(copy.editLabel, { name })} onClick={() => setEditing({ row, duplicate: false })}>{copy.edit}</button>
              <button className="btn btn-ghost btn-sm" type="button" disabled={pending} aria-label={fill(copy.duplicateLabel, { name })} onClick={() => setEditing({ row, duplicate: true })}>{copy.duplicate}</button>
              <button className="btn btn-ghost btn-sm" type="button" disabled={pending} aria-label={fill(row.is_active ? copy.deactivateLabel : copy.activateLabel, { name })}
                aria-busy={waiting ? 'true' : undefined} onClick={() => {
                  if (locked.current) return; locked.current = true; setBusyId(row.id);
                  start(async () => {
                    try {
                      const result = await setProductActive(row.id, !row.is_active);
                      if (result.ok) { list.replaceRow({ ...row, is_active: !row.is_active }); setNotice({ text: row.is_active ? copy.deactivated : copy.activated, error: false }); router.refresh(); void list.reload(); }
                      else setNotice({ text: failureMessage(result.code, copy, copy.toggleError), error: true });
                    } catch { setNotice({ text: copy.toggleError, error: true }); }
                    finally { locked.current = false; setBusyId(null); }
                  });
                }}>{row.is_active ? copy.deactivate : copy.activate}</button>
              <button className="btn btn-ghost btn-sm product-delete-btn" type="button" disabled={pending} aria-label={fill(copy.deleteLabel, { name })} onClick={() => setDeleting(row)}>{copy.delete}</button>
            </div>
          </li>;
        })}
      </ul>
    </ListFeedback>
    {editing ? <ProductDialog source={editing.row} duplicate={editing.duplicate} locale={locale} copy={copy} close={() => setEditing(null)} done={saved} /> : null}
    {deleting ? <ConfirmDialog id="product-delete" title={copy.deleteTitle} text={fill(copy.deleteText, { name: localized(deleting, 'name', locale) })} cancel={copy.cancel} confirm={copy.delete} waiting={copy.deleting}
      action={() => deleteProduct(deleting.id)} message={(result) => failureMessage(result.code, copy, copy.deleteError)} close={() => setDeleting(null)}
      done={() => { list.remove(deleting.id); if (!list.term) onCount(Math.max(0, list.total - 1)); setDeleting(null); setNotice({ text: copy.deleted, error: false }); router.refresh(); void list.reload(); }} /> : null}
  </>;
}
