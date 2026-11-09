import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, localePath } from '@/i18n/config';
import { getOrderDictionary } from '@/i18n/order-dictionaries';
import { getMyOrder } from '@/lib/orders/queries';
import { BackLink } from '@/components/navigation/BackLink';
import { CheckPaymentStatus } from '@/components/checkout/CheckPaymentStatus';
import { OrderDetails } from '@/components/orders/OrderDetails';
import '@/styles/orders.css';

type Props = { params: Promise<{ locale: string; id: string }> };
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function MyOrderPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const [copy, result] = await Promise.all([getOrderDictionary(locale), getMyOrder(id)]);
  if (!result.ok && result.error === 'notFound') notFound();
  return <article className="orders-page wrap">
    <BackLink href={localePath(locale, '/orders')} label={copy.back} />
    <h1>{result.ok ? copy.number.replace('{number}', result.order.number) : copy.title}</h1>
    <p className="orders-test-notice">{copy.testNotice}</p>
    {result.ok ? <OrderDetails order={result.order} locale={locale} copy={copy} /> :
      <section className="order-empty"><p role="alert">{copy[result.error === 'notFound' ? 'unavailable' : result.error]}</p>{result.error === 'unavailable' ? <CheckPaymentStatus label={copy.retry} /> : null}</section>}
  </article>;
}
