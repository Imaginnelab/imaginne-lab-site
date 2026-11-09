import { checkoutSettings, stripeClient, CHECKOUT_SOURCE } from '@/lib/checkout/stripe';
import { paymentStatus } from '@/lib/checkout/status';
import type Stripe from 'stripe';

export const runtime = 'nodejs';
const MAX_EVENT_BYTES = 256_000;

export async function POST(request: Request): Promise<Response> {
  const settings = checkoutSettings();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!settings || !secret?.startsWith('whsec_')) return new Response('Test webhook not configured', { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature || !request.body) return new Response('Invalid event', { status: 400 });
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_EVENT_BYTES) { await reader.cancel(); return new Response('Event too large', { status: 413 }); }
    chunks.push(value);
  }
  let event: Stripe.Event;
  try { event = stripeClient(settings).webhooks.constructEvent(Buffer.concat(chunks), signature, secret); }
  catch { return new Response('Invalid event', { status: 400 }); }
  if (event.livemode) return new Response('Only test events are accepted', { status: 400 });
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired'].includes(event.type)) {
    return Response.json({ received: true });
  }
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.livemode || !session.id.startsWith('cs_test_') || session.mode !== 'payment' || session.metadata?.source !== CHECKOUT_SOURCE) {
    return Response.json({ received: true });
  }
  const status = event.type === 'checkout.session.async_payment_failed' ? 'failed' : paymentStatus(session);
  // Test checkout has no shipping/inventory side effects. Replayed events are harmless.
  // Before launch, replace this acknowledgment with durable, idempotent order processing.
  return Response.json({ received: true, testOnly: true, status });
}
