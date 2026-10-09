import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, localePath } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getProductPage } from '@/lib/products/queries';
import { searchTerm } from '@/lib/search';
import { organizationJsonLd, siteMetadata } from '@/lib/site/metadata';
import { CatalogueGrid } from '@/components/catalogue/CatalogueGrid';
import '@/styles/catalogue.css';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};
export const viewport: Viewport = { themeColor: '#343D30' };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  return siteMetadata(locale, t.metadata, 'products');
}
export default async function ProductsPage({ params, searchParams }: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const term = searchTerm(Array.isArray(query.q) ? query.q[0] : query.q);
  const [t, initial] = await Promise.all([getDictionary(locale), getProductPage({ locale, term })]);
  return (
    <div className="catalogue-main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: organizationJsonLd(t.metadata) }} />
      <section className="wrap" id="catalogue" data-catalogue="" aria-labelledby="catalogue-title">
        <CatalogueGrid key={locale + ':' + term} locale={locale} initial={initial} initialTerm={term}
          copy={{ card: t.store.card, search: t.store.search, list: t.store.list, page: { lede: t.store.page.lede, region: t.store.page.region } }}
          heading={<>
            <a className="btn btn-ghost btn-sm catalogue-back" href={localePath(locale)} data-transition="">{t.store.page.back}</a>
            <h1 className="heading" id="catalogue-title">{t.store.page.heading}</h1>
          </>} />
      </section>
    </div>
  );
}
