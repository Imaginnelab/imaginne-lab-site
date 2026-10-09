import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import '@/styles/products.css';

type Props = { locale: Locale; anchors: Dictionary['anchors']; copy: Dictionary['home']['products'] };
export function Products({ locale, anchors, copy }: Props) {
  return (
    <section className="section products-section" id={anchors.products} data-products-section="" aria-labelledby="products-title">
      <div className="wrap">
        <div className="section-head"><span className="eyebrow">{copy.text001}</span><h2 className="heading" id="products-title">{copy.text002}</h2><p className="lede">{copy.text003}</p></div>
        <div className="products-carousel" role="region" aria-label={copy.ariaLabel001}>
          <div className="products-controls"><a className="btn btn-ghost btn-sm products-all-link" href={localePath(locale, '/products')} data-transition="">{copy.text004}</a></div>
          <p className="products-empty" role="status">{copy.empty}</p>
        </div>
      </div>
    </section>
  );
}
