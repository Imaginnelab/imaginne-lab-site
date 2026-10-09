import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { MaintenanceGate } from '@/components/maintenance/MaintenanceGate';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { MobilePanel } from '@/components/site/MobilePanel';
import { FlagSprite } from '@/components/site/FlagSprite';
import { SiteEffects } from '@/components/site/SiteEffects';
import { sitePrepaint } from '@/lib/site/prepaint';

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export default async function SiteLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  return (
    <MaintenanceGate locale={locale}>
      <script dangerouslySetInnerHTML={{ __html: sitePrepaint }} />
      <link rel="preload" href="/assets/fonts/outfit-variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <link rel="preload" href="/assets/fonts/dmmono-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <link rel="preload" href="/assets/fonts/dmmono-500.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <noscript><style>{'[data-reveal]{opacity:1;transform:none}'}</style></noscript>
      <div className="page-transition" id="page-transition" aria-hidden="true"><span className="page-transition-text">{t.site.brand.name}</span></div>
      <FlagSprite />
      <Header locale={locale} anchors={t.anchors} copy={t.site.header} language={t.site.language} theme={t.site.theme} mobile={t.site.mobile} />
      <MobilePanel locale={locale} anchors={t.anchors} copy={t.site.mobilePanel} language={t.site.language} />
      <main id={t.anchors.top}>{children}</main>
      <Footer locale={locale} anchors={t.anchors} copy={t.site.footer} />
      <SiteEffects />
    </MaintenanceGate>
  );
}
