import type Stripe from 'stripe';

export type PaymentStatus = 'paid' | 'pending' | 'expired' | 'failed';

export function paymentStatus(session: Pick<Stripe.Checkout.Session, 'status' | 'payment_status'>): PaymentStatus {
  if (session.status === 'expired') return 'expired';
  if (session.status === 'complete' && (session.payment_status === 'paid' || session.payment_status === 'no_payment_required')) return 'paid';
  return 'pending';
}
