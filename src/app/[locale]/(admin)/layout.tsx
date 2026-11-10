import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { Header } from '@/components/site/Header';
import { SiteEffects } from '@/components/site/SiteEffects';

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

// The dashboard and the admin orders keep the site's header (pill on scroll included) but none
// of the store around it: no sections, language, cart or footer. The account menu only leads
// back to the store or signs out.
export default async function AdminShellLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  return (
    <>
      <link rel="preload" href="/assets/fonts/outfit-variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <div className="page-transition" id="page-transition" aria-hidden="true"><span className="page-transition-text">{t.site.brand.name}</span></div>
      <div className="site-shell">
        <Header variant="admin" locale={locale} anchors={t.anchors} copy={t.site.header} language={t.site.language} theme={t.site.theme} mobile={t.site.mobile} cartLabel={t.store.cart.open} />
        <main id={t.anchors.top}>{children}</main>
      </div>
      <SiteEffects />
    </>
  );
}
