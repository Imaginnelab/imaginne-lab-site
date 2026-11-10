import { notFound, redirect } from 'next/navigation';
import { isLocale, localePath } from '@/i18n/config';
import { getOrderDictionary } from '@/i18n/order-dictionaries';
import { listAdminOrders } from '@/lib/orders/queries';
import { BackLink } from '@/components/navigation/BackLink';
import { NavigationLink } from '@/components/navigation/NavigationLink';
import { OrderList } from '@/components/orders/OrderList';
import { AdminOrderFilters } from '@/components/orders/AdminOrderFilters';
import { adminOrderFiltersSchema, defaultOrderFilters, orderListHref } from '@/lib/orders/filters';
import '@/styles/orders.css';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ after?: string | string[]; status?: string | string[]; from?: string | string[]; to?: string | string[] }> };
export default async function AdminOrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const input = { status: query.status, from: query.from, to: query.to };
  const parsed = adminOrderFiltersSchema.safeParse(input);
  const values = parsed.success ? parsed.data : {
    ...defaultOrderFilters,
    from: typeof query.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? query.from : '',
    to: typeof query.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? query.to : '',
  };
  const [copy, result] = await Promise.all([getOrderDictionary(locale), listAdminOrders(query.after, input)]);
  if (!result.ok && result.error === 'signIn') redirect(localePath(locale));
  return <article className="orders-page admin-orders-page wrap">
    <BackLink href={localePath(locale, '/admin')} label={copy.admin.back} />
    <h1>{copy.admin.title}</h1><p className="orders-intro">{copy.admin.intro}</p>
    <p className="orders-test-notice">{copy.testNotice}</p>
    <AdminOrderFilters key={JSON.stringify(values)} locale={locale} values={values} copy={copy.admin.filters} labels={copy.status} />
    {query.after ? <NavigationLink className="order-newest" href={orderListHref(locale, true, values)}>{copy.newest}</NavigationLink> : null}
    <OrderList result={result} copy={copy} locale={locale} admin filters={values} />
  </article>;
}
