import 'server-only';
import { getCurrentUser } from '@/lib/dal';
import { sessionIdSchema } from './schema';
import { checkoutSettings, stripeClient, CHECKOUT_SOURCE } from './stripe';
import { paymentStatus, type PaymentStatus } from './status';

export type CheckoutReceipt = { status: PaymentStatus; amountCents: number | null; taxCents: number; shippingCents: number };

// A return URL is never proof of payment. Read Stripe and check the verified cookie identity.
export async function getCheckoutReceipt(id: unknown): Promise<CheckoutReceipt | null> {
  if (!sessionIdSchema.safeParse(id).success) return null;
  try {
    const user = await getCurrentUser();
    const settings = checkoutSettings();
    if (!user || !settings) return null;
    const session = await stripeClient(settings).checkout.sessions.retrieve(id as string);
    if (session.livemode || session.mode !== 'payment' || session.client_reference_id !== user.id || session.metadata?.source !== CHECKOUT_SOURCE || session.currency !== 'cad') return null;
    return { status: paymentStatus(session), amountCents: session.amount_total,
      taxCents: session.total_details?.amount_tax ?? 0, shippingCents: session.total_details?.amount_shipping ?? 0 };
  } catch { return null; }
}
