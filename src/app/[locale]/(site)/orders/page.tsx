import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, localePath } from '@/i18n/config';
import { getOrderDictionary } from '@/i18n/order-dictionaries';
import { listMyOrders } from '@/lib/orders/queries';
import { BackLink } from '@/components/navigation/BackLink';
import { NavigationLink } from '@/components/navigation/NavigationLink';
import { OrderList } from '@/components/orders/OrderList';
import '@/styles/orders.css';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ after?: string }> };
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function MyOrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const [copy, result] = await Promise.all([getOrderDictionary(locale), listMyOrders(query.after)]);
  return <article className="orders-page wrap">
    <BackLink href={localePath(locale, '/products')} label={copy.browse} />
    <h1>{copy.title}</h1><p className="orders-intro">{copy.intro}</p><p className="orders-test-notice">{copy.testNotice}</p>
    {query.after ? <NavigationLink className="order-newest" href={localePath(locale, '/orders')}>{copy.newest}</NavigationLink> : null}
    <OrderList result={result} copy={copy} locale={locale} />
  </article>;
}
