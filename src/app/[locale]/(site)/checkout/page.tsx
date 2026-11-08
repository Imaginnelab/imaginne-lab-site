import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, localePath } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import { getCurrentUser } from '@/lib/dal';
import { checkoutSettings } from '@/lib/checkout/stripe';
import { BackLink } from '@/components/navigation/BackLink';
import { CheckoutReview } from '@/components/checkout/CheckoutReview';
import '@/styles/checkout.css';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ canceled?: string }> };
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [t, user, query] = await Promise.all([getDictionary(locale), getCurrentUser(), searchParams]);
  const settings = checkoutSettings();
  return <article className="checkout-page wrap">
    <BackLink href={localePath(locale, '/products')} label={t.store.detail.back} />
    <div className="checkout-heading"><p className="eyebrow">Imaginne Lab</p><h1>{t.store.checkout.title}</h1><p>{t.store.checkout.description}</p></div>
    <p className="checkout-test-notice" role="note">{t.store.checkout.testNotice}</p>
    <CheckoutReview locale={locale} copy={t.store.checkout} cartCopy={t.store.cart} signedIn={!!user} configured={!!settings}
      shippingCents={settings?.shippingCents ?? 0} taxEnabled={settings?.taxEnabled ?? false} canceled={query.canceled === '1'} />
  </article>;
}
