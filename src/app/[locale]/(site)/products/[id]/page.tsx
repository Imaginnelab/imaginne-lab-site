import type { Metadata } from 'next';
import { NavigationLink as Link } from '@/components/navigation/NavigationLink';
import { notFound } from 'next/navigation';
import { isLocale, localePath } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getProduct } from '@/lib/products/queries';
import { productIdSchema } from '@/lib/products/input';
import { ProductPhotoGrid } from '@/components/products/ProductPhotoGrid';
import { ProductPurchase } from '@/components/products/ProductPurchase';
import { ProductLoadError } from '@/components/products/ProductLoadError';
import { BackLink } from '@/components/navigation/BackLink';
import { ProductSelection } from '@/components/products/ProductSelection';
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

// Line icons for the features strip, one per fact the piece has.
const featureIcons = {
  material: <path d="M8 4h8v16H8zM8 8h8M8 12h8M8 16h8M16 6c2.5 0 4 1.2 4 3" />,
  finish: <path d="M4 20c4-1 6-3 7-6l3 3c-3 1-5 3-6 6M14 4l6 6-6 3-3-3z" />,
  size: <path d="M3 15 15 3l6 6L9 21zM7 11l2 2M10 8l2 2M13 5l2 2" />,
  weight: <path d="M6 9h12l2 11H4zM9 9a3 3 0 0 1 6 0" />,
  made: <path d="M12 3.5a5.5 5.5 0 0 0-3.2 10c.7.5 1.2 1.3 1.2 2.2v.8h4v-.8c0-.9.5-1.7 1.2-2.2A5.5 5.5 0 0 0 12 3.5ZM10 19.5h4" />,
};

export default async function ProductDetailPage({ params }: Props) {
  const { locale, product } = await readProduct(params);
  const t = await getDictionary(locale);
  const copy = t.store.detail;
  if (!product) return <ProductLoadError locale={locale} copy={{ loadError: copy.loadError, retry: copy.retry, back: copy.back }} />;
  const number = new Intl.NumberFormat({ en: 'en-CA', pt: 'pt-BR', es: 'es-ES' }[locale], { maximumFractionDigits: 2 });
  const stock = product.stockQuantity === null ? copy.specifications.stockUnknown : product.stockQuantity === 0 ? copy.specifications.stockEmpty :
    copy.specifications.stockAvailable.replace('{count}', number.format(product.stockQuantity));
  const stockTone = product.stockQuantity === null ? 'unknown' : product.stockQuantity === 0 ? 'out' : 'in';
  // Width, height and depth read as one line when all three are known.
  const { widthCm: width, heightCm: height, depthCm: depth } = product;
  const dimensions = width !== null && height !== null && depth !== null ? [width, height, depth].map((value) => number.format(value)).join(' × ') + ' cm' : null;
  const sizes = dimensions ? [[copy.dimensions, dimensions]]
    : ([['widthPublic', width], ['heightPublic', height], ['depthPublic', depth]] as const)
      .flatMap(([label, value]) => value === null ? [] : [[copy.specifications[label], number.format(value) + ' cm']]);
  const weight = product.weightGrams === null ? null : number.format(product.weightGrams) + ' g';
  const { material, finish, care } = product.specifications;
  const technical = [
    ...(material ? [[copy.specifications.material, material]] : []),
    ...(finish ? [[copy.specifications.finish, finish]] : []),
    ...sizes,
    ...(weight ? [[copy.specifications.weightPublic, weight]] : []),
  ];
  // The features strip: the facts a buyer scans for, each with its icon.
  const features = ([
    ['material', material], ['finish', finish], ['size', dimensions], ['weight', weight], ['made', copy.madeToOrder],
  ] as const).filter((entry): entry is [keyof typeof featureIcons, string] => Boolean(entry[1]));
  const points = product.description.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return <article className="product-detail wrap">
    <div className="product-topbar">
      <BackLink href={localePath(locale, '/products')} label={copy.back} />
      <nav className="product-breadcrumb" aria-label={copy.breadcrumb}>
        <Link href={localePath(locale)}>{copy.home}</Link><span aria-hidden="true">/</span>
        <Link href={localePath(locale, '/products')}>{copy.products}</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>
    </div>
    <ProductSelection key={product.id + ':' + locale} colors={product.colors}>
      <div className="product-detail-grid">
        <ProductPhotoGrid key={product.id} product={product} locale={locale} copy={t.store.card} imageError={copy.imageError} />
        <ProductPurchase locale={locale} id={product.id} name={product.name} price={product.price} unavailable={product.stockQuantity === 0} stockLabel={stock} stockTone={stockTone}
          copy={{ quantity: copy.quantity, addToCart: copy.addToCart, buyNow: copy.buyNow,
          comingSoon: copy.comingSoon, onRequest: copy.onRequest, cartFull: copy.cartFull, chooseColor: copy.chooseColor, quantityInvalid: copy.quantityInvalid, colorLabel: copy.colour,
          secure: copy.secure, shipping: copy.shipping, maker: copy.maker }}
          quantityCopy={{ quantity: t.store.cart.quantity, decrease: t.store.cart.decrease, increase: t.store.cart.increase }} />
      </div>
    </ProductSelection>
    {features.length ? <section className="product-features" aria-labelledby="product-features-title">
      <h2 id="product-features-title">{copy.features}</h2>
      <ul>{features.map(([kind, text]) => <li key={kind}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{featureIcons[kind]}</svg><span>{text}</span>
      </li>)}</ul>
    </section> : null}
    <div className="product-detail-content">
      <details className="product-description" open>
        <summary><h2 id="product-about">{copy.about}</h2></summary>
        {points.length > 1 ? <ul>{points.map((point, index) => <li key={index}>{point}</li>)}</ul> : <p>{product.description}</p>}
      </details>
      {technical.length ? <details className="product-information" id="product-information">
        <summary><h2 id="product-information-title">{copy.information}</h2></summary>
        <dl>{technical.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </details> : null}
      {care ? <details className="product-care">
        <summary><h2 id="product-care-title">{copy.specifications.care}</h2></summary>
        <p>{care}</p>
      </details> : null}
    </div>
  </article>;
}
