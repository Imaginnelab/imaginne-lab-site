import { NavigationLink } from '@/components/navigation/NavigationLink';
import { CheckPaymentStatus } from '@/components/checkout/CheckPaymentStatus';
import { localePath, type Locale } from '@/i18n/config';
import type { OrderDictionary } from '@/i18n/order-dictionaries';
import type { OrderListResult } from '@/lib/orders/model';
import { ORDER_TIME_ZONE } from '@/lib/orders/model';
import { formatPrice } from '@/lib/products/format';
import { OrderImage } from './OrderImage';
import { orderListHref, type AdminOrderFilters } from '@/lib/orders/filters';

export function orderDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat({ en: 'en-CA', pt: 'pt-BR', es: 'es-ES' }[locale], { dateStyle: 'medium', timeZone: ORDER_TIME_ZONE }).format(new Date(value.length === 10 ? value + 'T12:00:00Z' : value));
}

export function OrderList({ result, copy, locale, admin = false, filters }: { result: OrderListResult; copy: OrderDictionary; locale: Locale; admin?: boolean; filters?: AdminOrderFilters }) {
  const path = admin ? '/admin/orders' : '/orders';
  if (!result.ok) return <section className="order-empty"><p role="alert">{result.error === 'filters' ? copy.admin.filters.invalid : copy[result.error === 'notFound' ? 'unavailable' : result.error]}</p>
    {result.error === 'unavailable' ? <CheckPaymentStatus label={copy.retry} /> : null}</section>;
  if (!result.orders.length && result.next) return <section className="order-empty"><p>{copy.moreResults}</p>
    <NavigationLink className="btn btn-ghost" href={orderListHref(locale, admin, filters, result.next)}>{copy.older}</NavigationLink></section>;
  const filtered = admin && filters && (filters.status !== 'all' || filters.from || filters.to);
  if (!result.orders.length) return <section className="order-empty"><h2>{filtered ? copy.admin.filters.empty : copy.empty}</h2><p>{filtered ? copy.admin.filters.emptyHelp : copy.emptyHelp}</p>
    {!admin ? <NavigationLink className="btn btn-primary" href={localePath(locale, '/products')}>{copy.browse}</NavigationLink> : null}</section>;
  return <><ul className="orders-list">{result.orders.map((order) => <li className="order-card" key={order.id}>
    <header className="order-card-head"><div><span>{copy.placedOn}</span><strong>{orderDate(order.createdAt, locale)}</strong></div>
      <div><span>{copy.total}</span><strong>{formatPrice(order.amountCents, locale)}</strong></div>
      <p>{copy.number.replace('{number}', order.number)}</p></header>
    <div className="order-card-body"><OrderImage src={order.image} />
      <div className="order-card-content"><h2 className={'order-status order-status-' + order.status}>{copy.status[order.status]}</h2>
        {order.estimatedDelivery && !['delivered', 'canceled'].includes(order.status) ? <p>{copy.estimatedDelivery.replace('{date}', orderDate(order.estimatedDelivery, locale))}</p> : null}
        <p>{order.preview || copy.items}{order.quantity ? <span className="order-item-count"> · {copy.quantity}: {order.quantity}</span> : null}</p>
      </div>
      <NavigationLink className="btn btn-ghost" href={localePath(locale, path + '/' + order.id)}>{admin ? copy.admin.edit : copy.details}</NavigationLink>
    </div>
  </li>)}</ul>
    {result.next ? <NavigationLink className="btn btn-ghost" href={orderListHref(locale, admin, filters, result.next)}>{copy.older}</NavigationLink> : null}
  </>;
}
