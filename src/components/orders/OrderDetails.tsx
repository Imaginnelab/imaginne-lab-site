import { NavigationLink } from '@/components/navigation/NavigationLink';
import type { OrderDetail } from '@/lib/orders/model';
import type { Locale } from '@/i18n/config';
import { localePath } from '@/i18n/config';
import type { OrderDictionary } from '@/i18n/order-dictionaries';
import { formatPrice } from '@/lib/products/format';
import { OrderImage } from './OrderImage';
import { orderDate } from './OrderList';

const steps = ['confirmed', 'in_production', 'packing', 'shipped', 'delivered'] as const;
export function OrderDetails({ order, locale, copy }: { order: OrderDetail; locale: Locale; copy: OrderDictionary }) {
  const current = steps.findIndex((step) => step === order.status);
  return <>
    <p className="order-date">{copy.placedOn}: {orderDate(order.createdAt, locale)}</p>
    <section className="order-progress" aria-labelledby="order-progress-title">
      <h2 id="order-progress-title">{copy.status[order.status]}</h2>
      {order.status !== 'canceled' ? <ol className="order-timeline" aria-label={copy.progress}>{steps.map((step, index) =>
        <li key={step} className={index <= current ? 'is-complete' : ''} aria-current={index === current ? 'step' : undefined}>
          <span className="order-step-dot" aria-hidden="true">{index <= current ? '✓' : index + 1}</span><span>{copy.status[step]}</span>
          {order.timeline[step] ? <small>{orderDate(order.timeline[step]!, locale)}</small> : null}
        </li>)}</ol> : null}
      {order.estimatedDelivery && !['delivered', 'canceled'].includes(order.status) ? <p>{copy.estimatedDelivery.replace('{date}', orderDate(order.estimatedDelivery, locale))}</p> :
        !['delivered', 'canceled', 'payment_pending'].includes(order.status) ? <p>{copy.estimatePending}</p> : null}
      {order.trackingNumber ? <div className="order-tracking"><p>{copy.tracking}: <strong>{order.trackingNumber}</strong></p>
        {order.trackingUrl ? <a className="btn btn-ghost btn-sm" href={order.trackingUrl} target="_blank" rel="noopener noreferrer">{copy.track}</a> : null}</div> :
        order.status === 'shipped' ? <p>{copy.trackingPending}</p> : null}
      <p className="order-help">{copy.manualUpdates}</p>
    </section>
    <div className="order-detail-grid"><section className="order-section"><h2>{copy.items}</h2>
      <ul className="order-items">{order.items.map((item, index) => <li key={index}>
        <OrderImage src={item.image} /><div>{item.productId ? <NavigationLink href={localePath(locale, '/products/' + item.productId)}>{item.name}</NavigationLink> : <p>{item.name}</p>}
          <p className="order-help">{copy.quantity}: {item.quantity}</p><strong>{formatPrice(item.amountCents, locale)}</strong></div>
      </li>)}</ul>
      <div className="order-address"><h2>{copy.shippingAddress}</h2>{order.recipient ? <address>{order.recipient.name}<br />{order.recipient.line1}<br />
        {order.recipient.line2 ? <>{order.recipient.line2}<br /></> : null}{order.recipient.city}, {order.recipient.province} {order.recipient.postalCode}<br />{order.recipient.country}</address> : <p>{copy.addressUnavailable}</p>}</div>
    </section>
    <aside className="order-section order-summary"><h2>{copy.summary}</h2><dl>
      {([[copy.subtotal, order.subtotalCents], [copy.shipping, order.shippingCents], [copy.tax, order.taxCents], [copy.total, order.amountCents]] as const)
        .map(([label, amount], index) => <div key={label} className={index === 3 ? 'order-total' : undefined}><dt>{label}</dt><dd>{formatPrice(amount, locale)}</dd></div>)}
    </dl></aside></div>
  </>;
}
