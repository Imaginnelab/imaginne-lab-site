import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { getProductPage } from '@/lib/products/queries';
import { Carousel } from '@/components/catalogue/Carousel';
import '@/styles/products.css';

type Props = {
  locale: Locale; anchors: Dictionary['anchors']; copy: Dictionary['home']['products'];
  storeCopy: Pick<Dictionary['store'], 'card' | 'search' | 'list' | 'carousel'>;
};
export async function Products({ locale, anchors, copy, storeCopy }: Props) {
  const initial = await getProductPage({ locale });
  return (
    <section className="section products-section" id={anchors.products} data-products-section="" aria-labelledby="products-title">
      <div className="wrap">
        <div className="section-head"><h2 className="heading" id="products-title">{copy.text002}</h2><p className="lede">{copy.text003}</p></div>
        <Carousel locale={locale} initial={initial} copy={storeCopy} />
      </div>
    </section>
  );
}
