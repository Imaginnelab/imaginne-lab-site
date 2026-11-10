import type { Metadata } from 'next';
import { NavigationLink as Link } from '@/components/navigation/NavigationLink';
import { notFound } from 'next/navigation';
import { isLocale, localePath } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getProduct, getProductPage } from '@/lib/products/queries';
import { productIdSchema } from '@/lib/products/input';
import { ProductGallery } from '@/components/products/ProductGallery';
import { ProductPurchase } from '@/components/products/ProductPurchase';
import { ProductColorList } from '@/components/products/ProductColorList';
import { ProductLoadError } from '@/components/products/ProductLoadError';
import { BackLink } from '@/components/navigation/BackLink';
import { ProductSelection } from '@/components/products/ProductSelection';
import { Carousel } from '@/components/catalogue/Carousel';
import '@/styles/products.css';
import '@/styles/product-detail.css';


type Props = { params: Promise<{ locale: string; id: string }> };
async function readProduct(params: Props['params']) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !productIdSchema.safeParse(id).success) notFound();
  const result = await getProduct(locale, id);
  if (result.ok && !result.product) notFound();
  return { locale, product: result.ok ? result.product : null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, product } = await readProduct(params);
  if (!product) return { robots: { index: false } };
  const path = '/products/' + product.id;
  const url = 'https://www.imaginnelab.com' + localePath(locale, path);
  const title = product.name + ' · Imaginne Lab';
  return {
    title, description: product.description,
    alternates: { canonical: url, languages: {
      en: 'https://www.imaginnelab.com' + localePath('en', path),
      'pt-BR': 'https://www.imaginnelab.com' + localePath('pt', path),
      es: 'https://www.imaginnelab.com' + localePath('es', path),
      'x-default': 'https://www.imaginnelab.com' + localePath('en', path),
    } },
    openGraph: { title, description: product.description, url, images: [{ url: product.photos[0], alt: product.name }] },
    twitter: { card: 'summary_large_image', title, description: product.description, images: [product.photos[0]] },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, product } = await readProduct(params);
  const t = await getDictionary(locale);
  const copy = t.store.detail;
  if (!product) return <ProductLoadError locale={locale} copy={{ loadError: copy.loadError, retry: copy.retry, back: copy.back }} />;
  const more = await getProductPage({ locale });
  const number = new Intl.NumberFormat({ en: 'en-CA', pt: 'pt-BR', es: 'es-ES' }[locale], { maximumFractionDigits: 2 });
  const stock = product.stockQuantity === null ? copy.specifications.stockUnknown : product.stockQuantity === 0 ? copy.specifications.stockEmpty :
    copy.specifications.stockAvailable.replace('{count}', number.format(product.stockQuantity));
  const stockTone = product.stockQuantity === null ? 'unknown' : product.stockQuantity === 0 ? 'out' : 'in';
  // Width, height and depth read as one line when all three are known.
  const { widthCm: width, heightCm: height, depthCm: depth } = product;
  const sizes = width !== null && height !== null && depth !== null
    ? [[copy.dimensions, [width, height, depth].map((value) => number.format(value)).join(' × ') + ' cm']]
    : ([['widthPublic', width], ['heightPublic', height], ['depthPublic', depth]] as const)
      .flatMap(([label, value]) => value === null ? [] : [[copy.specifications[label], number.format(value) + ' cm']]);
  const { material, finish, care } = product.specifications;
  const technical = [
    ...(material ? [[copy.specifications.material, material]] : []),
    ...(finish ? [[copy.specifications.finish, finish]] : []),
    ...sizes,
    ...(product.weightGrams === null ? [] : [[copy.specifications.weightPublic, number.format(product.weightGrams) + ' g']]),
  ];
  // Each line of the description is one point of "About this item"; a single paragraph stays one.
  const points = product.description.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return <>
    <article className="product-detail wrap">
      <div className="product-topbar">
        <BackLink href={localePath(locale, '/products')} label={copy.back} />
        <nav className="product-breadcrumb" aria-label={copy.breadcrumb}>
          <Link href={localePath(locale)}>{copy.home}</Link><span aria-hidden="true">/</span>
          <Link href={localePath(locale, '/products')}>{copy.products}</Link><span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>
      </div>
      {/* A store listing: photos, what the piece is, and the buy box, side by side. */}
      <ProductSelection key={product.id + ':' + locale} colors={product.colors}>
        <div className="product-detail-grid">
          <ProductGallery key={product.id} product={product} locale={locale} copy={t.store.card} detail={{ imageError: copy.imageError, previous: copy.previous, next: copy.next }} />
          <div className="product-overview">
            <h1 className="product-detail-title">{product.name}</h1>
            <Link className="product-store-link" href={localePath(locale, '/products')}>{copy.visitStore}</Link>
            <p className="product-overview-price">{product.price ?? copy.onRequest}</p>
            <ProductColorList label={copy.colour} missing={copy.chooseColor} />
            {technical.length ? <dl className="product-glance">{technical.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : null}
            <section className="product-description" aria-labelledby="product-about">
              <h2 id="product-about">{copy.about}</h2>
              {points.length > 1 ? <ul>{points.map((point, index) => <li key={index}>{point}</li>)}</ul> : <p>{product.description}</p>}
            </section>
          </div>
          <ProductPurchase locale={locale} id={product.id} price={product.price} unavailable={product.stockQuantity === 0} stockLabel={stock} stockTone={stockTone}
            copy={{ quantity: copy.quantity, addToCart: copy.addToCart, buyNow: copy.buyNow,
            comingSoon: copy.comingSoon, onRequest: copy.onRequest, cartFull: copy.cartFull, chooseColor: copy.chooseColor, quantityInvalid: copy.quantityInvalid,
            secure: copy.secure, shipping: copy.shipping, maker: copy.maker }}
            quantityCopy={{ quantity: t.store.cart.quantity, decrease: t.store.cart.decrease, increase: t.store.cart.increase }} />
        </div>
      </ProductSelection>
      <div className="product-detail-content">
        <section className="product-information" id="product-information" aria-labelledby="product-information-title">
          <h2 id="product-information-title">{copy.information}</h2>
          <dl>
            {technical.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            <div><dt>{copy.specifications.stockPublic}</dt><dd>{stock}</dd></div>
          </dl>
        </section>
        {care ? <section className="product-care" aria-labelledby="product-care-title">
          <h2 id="product-care-title">{copy.specifications.care}</h2><p>{care}</p>
        </section> : null}
      </div>
    </article>
    {!more.ok || more.page.items.length ? <section className="section products-section product-more" aria-labelledby="product-more-title">
      <div className="wrap">
        <div className="section-head"><h2 className="heading" id="product-more-title">{copy.more}</h2></div>
        <Carousel locale={locale} initial={more} copy={{ card: t.store.card, search: t.store.search, list: t.store.list, carousel: t.store.carousel }} search={false} />
      </div>
    </section> : null}
  </>;
}
