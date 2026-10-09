import { notFound, redirect } from 'next/navigation';
import { getAdminDictionary } from '@/i18n/admin-dictionaries';
import { isLocale, localePath } from '@/i18n/config';
import { getAdmin } from '@/lib/dal';
import { listCoupons, listProducts, maintenanceState, mostViewedProductId } from '@/lib/admin/queries';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { ProductsPanel } from '@/components/admin/ProductsPanel';
import { CouponsPanel } from '@/components/admin/CouponsPanel';
import { MaintenanceCard } from '@/components/admin/MaintenanceCard';
import { AdminSessionRefresh } from '@/components/admin/AdminSessionRefresh';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ lang?: string | string[] }> };

// The instant of this request, read as data: the coupon states of the first paint are computed
// from it on both sides, so server and browser agree.
const requestTime = async () => Date.now();

export default async function AdminPage({ params, searchParams }: Props) {
  const [{ locale }, { lang }] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  // Links of the previous site: /admin/?lang=pt is now /pt/admin/.
  if (typeof lang === 'string' && isLocale(lang) && lang !== locale) redirect(localePath(lang, '/admin'));
  // The layout already refuses visitors; a page must not depend on that alone.
  const user = await getAdmin();
  if (!user) redirect(localePath(locale));
  const [t, products, coupons, maintenance, star, now] = await Promise.all([
    getAdminDictionary(locale), listProducts().catch(() => null), listCoupons().catch(() => null),
    maintenanceState().catch(() => null), mostViewedProductId().catch(() => null), requestTime(),
  ]);
  const m = t.interface;
  return (
    <>
      <AdminSessionRefresh />
      <header className="nav"><div className="wrap">
        <a className="brand" data-home="" href={localePath(locale)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/img/logo-icon.svg" alt={t.brand} /><span>{t.brand}<small>{t.pageHeading}</small></span>
        </a>
        <a className="btn btn-ghost btn-sm" data-home="" data-back="" href={localePath(locale)}>{m.back}</a>
      </div></header>
      <main className="wrap admin-main" data-admin-root>
        <p id="admin-status" role="status" aria-live="polite" />
        <section id="admin-content" aria-labelledby="admin-title">
          <p className="eyebrow">{t.brand}</p><h1 className="heading" id="admin-title">{t.pageHeading}</h1>
          <p id="admin-welcome" className="lede">{m.welcome}</p>
          <div className="admin-grid">
            <article className="admin-card"><h2 id="profile-heading">{m.profile}</h2><p id="admin-name">{user.fullName}</p><p id="admin-email">{user.email}</p></article>
            <article className="admin-card"><h2 id="access-heading">{m.access}</h2><p id="admin-role">{m.role}</p></article>
            <MaintenanceCard initial={maintenance} copy={{
              maintenance: m.maintenance, maintenanceHelp: m.maintenanceHelp, maintenanceOn: m.maintenanceOn, maintenanceOff: m.maintenanceOff,
              maintenanceChecking: m.maintenanceChecking, maintenanceSaving: m.maintenanceSaving, maintenanceLoadError: m.maintenanceLoadError,
              maintenanceSaveError: m.maintenanceSaveError, maintenanceForbidden: m.maintenanceForbidden, maintenanceRetry: m.maintenanceRetry,
              maintenanceConfirmTitle: m.maintenanceConfirmTitle, maintenanceConfirmText: m.maintenanceConfirmText, maintenanceConfirmYes: m.maintenanceConfirmYes, maintenanceCancel: m.maintenanceCancel,
            }} />
          </div>
          <AdminTabs locale={locale} copy={{ tabs: m.tabs, tabProducts: m.tabProducts, tabCoupons: m.tabCoupons, tabCount: m.tabCount }}
            initialCounts={{ products: products?.total ?? null, coupons: coupons?.total ?? null }}
            products={<ProductsPanel locale={locale} copy={t.products} initial={products} mostViewedId={star} />}
            coupons={<CouponsPanel locale={locale} copy={t.coupons} initial={coupons} initialNow={now} />} />
        </section>
      </main>
    </>
  );
}
