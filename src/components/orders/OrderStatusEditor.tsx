'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderDictionary } from '@/i18n/order-dictionaries';
import { fulfillmentStatuses, canTransition, type FulfillmentStatus, type OrderDetail } from '@/lib/orders/model';
import { updateOrderStatus } from '@/lib/orders/actions';

export function OrderStatusEditor({ order, copy, labels }: { order: Pick<OrderDetail, 'id' | 'status' | 'revision' | 'trackingNumber' | 'estimatedDelivery'>; copy: OrderDictionary['admin']; labels: OrderDictionary['status'] }) {
  const router = useRouter();
  const [status, setStatus] = useState<FulfillmentStatus>(order.status === 'payment_pending' ? 'confirmed' : order.status);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber);
  const [estimatedDelivery, setEstimatedDelivery] = useState(order.estimatedDelivery ?? '');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setMessage('');
    startTransition(async () => {
      try {
        const result = await updateOrderStatus({ id: order.id, revision: order.revision, status,
          trackingNumber: ['shipped', 'delivered'].includes(status) ? trackingNumber : '', estimatedDelivery: status === 'canceled' ? '' : estimatedDelivery });
        if (!result.ok) { setMessage(copy[result.error]); return; }
        setMessage(copy.saved); router.refresh();
      } catch { setMessage(copy.unavailable); }
    });
  }
  if (order.status === 'payment_pending') return null;
  return <section className="order-section order-editor"><h2>{copy.edit}</h2><form onSubmit={submit}>
    <fieldset disabled={pending}><label>{copy.status}<select value={status} onChange={(event) => { setStatus(event.target.value as FulfillmentStatus); setMessage(''); }}>
      {fulfillmentStatuses.filter((value) => canTransition(order.status, value)).map((value) => <option key={value} value={value}>{labels[value]}</option>)}
    </select></label>
    <label>{copy.tracking}<input value={trackingNumber} maxLength={50} disabled={!['shipped', 'delivered'].includes(status)} autoComplete="off" onChange={(event) => setTrackingNumber(event.target.value)} /></label>
    <label>{copy.estimate}<input type="date" value={estimatedDelivery} onChange={(event) => setEstimatedDelivery(event.target.value)} /></label>
    <button className="btn btn-primary" type="submit">{pending ? copy.saving : copy.save}</button></fieldset>
    <p role="status">{message}</p><p className="order-help">{copy.note}</p>
    <button className="btn btn-ghost btn-sm" type="button" disabled={pending} onClick={() => router.refresh()}>{copy.refresh}</button>
  </form></section>;
}
