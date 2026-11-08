import { z } from 'zod';
import { localePath, type Locale } from '@/i18n/config';
import { fulfillmentStatuses, orderStatus, ORDER_TIME_ZONE } from './model';
import type Stripe from 'stripe';

export const orderFilterStatuses = ['all', 'payment_pending', ...fulfillmentStatuses] as const;
const dateFilter = z.union([z.literal(''), z.iso.date()]).default('');
export const adminOrderFiltersSchema = z.object({
  status: z.enum(orderFilterStatuses).default('all'), from: dateFilter, to: dateFilter,
}).strict().refine((value) => !value.from || !value.to || value.from <= value.to, { path: ['to'] });
export type AdminOrderFilters = z.output<typeof adminOrderFiltersSchema>;
export const defaultOrderFilters: AdminOrderFilters = { status: 'all', from: '', to: '' };

const timezoneOffset = new Intl.DateTimeFormat('en', { timeZone: ORDER_TIME_ZONE, timeZoneName: 'longOffset' });
function dayStart(utcMidnight: number): number {
  let instant = utcMidnight;
  // Resolve the timezone offset at the local boundary, including days on which
  // the offset changes. Do not assume that every calendar day lasts 24 hours.
  for (let attempt = 0; attempt < 3; attempt++) {
    const zone = timezoneOffset.formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value;
    const parts = zone?.match(/^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/);
    const offset = parts ? (parts[1] === '+' ? 1 : -1) * (Number(parts[2]) * 3600 + Number(parts[3]) * 60 + Number(parts[4] ?? 0)) * 1000 : 0;
    const next = utcMidnight - offset;
    if (next === instant) break;
    instant = next;
  }
  return instant / 1000;
}

export function orderCreatedRange(filters: AdminOrderFilters): { gte?: number; lt?: number } | undefined {
  const midnight = (day: string) => Date.parse(day + 'T00:00:00Z');
  return filters.from || filters.to ? {
    ...(filters.from ? { gte: dayStart(midnight(filters.from)) } : {}),
    ...(filters.to ? { lt: dayStart(midnight(filters.to) + 86_400_000) } : {}),
  } : undefined;
}

export function matchesOrderFilters(session: Stripe.Checkout.Session, filters: AdminOrderFilters): boolean {
  const created = orderCreatedRange(filters);
  return (filters.status === 'all' || orderStatus(session) === filters.status)
    && (created?.gte === undefined || session.created >= created.gte)
    && (created?.lt === undefined || session.created < created.lt);
}

export function orderListHref(locale: Locale, admin: boolean, filters?: AdminOrderFilters, after?: string): string {
  const query = new URLSearchParams();
  if (admin && filters) {
    if (filters.status !== 'all') query.set('status', filters.status);
    if (filters.from) query.set('from', filters.from);
    if (filters.to) query.set('to', filters.to);
  }
  if (after) query.set('after', after);
  return localePath(locale, admin ? '/admin/orders' : '/orders') + (query.size ? '?' + query.toString() : '');
}
