import { notFound, redirect } from 'next/navigation';
import { isLocale, localePath } from '@/i18n/config';
import { getOrderDictionary } from '@/i18n/order-dictionaries';
import { getAdminOrder } from '@/lib/orders/queries';
import { BackLink } from '@/components/navigation/BackLink';
import { CheckPaymentStatus } from '@/components/checkout/CheckPaymentStatus';
import { OrderDetails } from '@/components/orders/OrderDetails';
import { OrderStatusEditor } from '@/components/orders/OrderStatusEditor';
import '@/styles/orders.css';

type Props = { params: Promise<{ locale: string; id: string }> };
export default async function AdminOrderPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const [copy, result] = await Promise.all([getOrderDictionary(locale), getAdminOrder(id)]);
  if (!result.ok && result.error === 'notFound') notFound();
  if (!result.ok && result.error === 'signIn') redirect(localePath(locale));
  return <article className="orders-page admin-orders-page wrap">
    <BackLink href={localePath(locale, '/admin/orders')} label={copy.back} />
    <h1>{result.ok ? copy.number.replace('{number}', result.order.number) : copy.admin.title}</h1>
    <p className="orders-test-notice">{copy.testNotice}</p>
    {result.ok ? <>
      <OrderStatusEditor key={result.order.id + ':' + result.order.revision} order={result.order} copy={copy.admin} labels={copy.status} />
      <OrderDetails order={result.order} locale={locale} copy={copy} />
    </> : <section className="order-empty"><p role="alert">{copy[result.error === 'notFound' ? 'unavailable' : result.error]}</p><CheckPaymentStatus label={copy.retry} /></section>}
  </article>;
}
