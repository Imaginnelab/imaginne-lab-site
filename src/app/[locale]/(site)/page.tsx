import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { siteMetadata, organizationJsonLd } from '@/lib/site/metadata';
import { Hero } from '@/components/site/hero/Hero';
import { Advantages } from '@/components/site/advantages/Advantages';
import { Products } from '@/components/site/products/Products';
import { Process } from '@/components/site/process/Process';
import { Customization } from '@/components/site/customization/Customization';
import { Contact } from '@/components/site/contact/Contact';

type Props = { params: Promise<{ locale: string }> };
export const viewport: Viewport = { themeColor: '#343D30' };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  return siteMetadata(locale, t.metadata);
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: organizationJsonLd(t.metadata) }} />
      <Hero locale={locale} anchors={t.anchors} copy={t.home.hero} />
      <Advantages copy={t.home.advantages} />
      <Products locale={locale} anchors={t.anchors} copy={t.home.products} storeCopy={{ card: t.store.card, search: t.store.search, list: t.store.list, carousel: t.store.carousel }} />
      <Process locale={locale} anchors={t.anchors} copy={t.home.process} />
      <Customization locale={locale} anchors={t.anchors} copy={t.home.customization} />
      <Contact locale={locale} anchors={t.anchors} copy={t.home.contact} />
    </>
  );
}
