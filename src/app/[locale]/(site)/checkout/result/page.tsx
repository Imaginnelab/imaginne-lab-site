import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, localePath } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getOrderDictionary } from '@/i18n/order-dictionaries';
import { getCheckoutReceipt } from '@/lib/checkout/queries';
import { formatPrice } from '@/lib/products/format';
import { NavigationLink } from '@/components/navigation/NavigationLink';
import { BackLink } from '@/components/navigation/BackLink';
import { CheckPaymentStatus } from '@/components/checkout/CheckPaymentStatus';
import '@/styles/checkout.css';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ session_id?: string }> };
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CheckoutResultPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [t, query, ordersCopy] = await Promise.all([getDictionary(locale), searchParams, getOrderDictionary(locale)]);
  const receipt = await getCheckoutReceipt(query.session_id);
  const copy = t.store.checkout;
  const status = receipt?.status ?? 'unknown';
  return <article className="checkout-page checkout-result wrap">
    <BackLink href={localePath(locale, '/checkout')} label={copy.backToCheckout} />
    <p className="checkout-test-notice">{copy.testNotice}</p>
    <section className="checkout-summary">
      <p className="eyebrow">Imaginne Lab</p><h1>{copy.result[status]}</h1>
      <p>{status === 'paid' ? copy.result.paidDescription : status === 'pending' ? copy.result.pendingDescription : copy.result.unknownDescription}</p>
      {receipt ? <dl><div className="checkout-total"><dt>{copy.total}</dt><dd>{formatPrice(receipt.amountCents, locale)}</dd></div>
        <div><dt>{copy.shipping}</dt><dd>{formatPrice(receipt.shippingCents, locale)}</dd></div>
        <div><dt>{copy.tax}</dt><dd>{formatPrice(receipt.taxCents, locale)}</dd></div></dl> : null}
      {status === 'pending' ? <CheckPaymentStatus label={copy.checkStatus} /> : null}
      {receipt ? <NavigationLink className="btn btn-primary" href={localePath(locale, '/orders/' + query.session_id)}>{ordersCopy.details}</NavigationLink> : null}
      <NavigationLink className="btn btn-ghost" href={localePath(locale, '/orders')}>{ordersCopy.title}</NavigationLink>
      <NavigationLink className="btn btn-ghost" href={localePath(locale, '/products')}>{t.store.cart.continueShopping}</NavigationLink>
    </section>
  </article>;
}
