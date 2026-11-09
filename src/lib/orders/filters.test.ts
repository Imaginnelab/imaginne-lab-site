import { expect, test } from 'vitest';
import type Stripe from 'stripe';
import { adminOrderFiltersSchema, matchesOrderFilters, orderCreatedRange, orderListHref } from './filters';

const session = (time: string, status = 'confirmed') => ({ created: Date.parse(time) / 1000, status: 'complete', payment_status: 'paid', metadata: { order_status: status } } as unknown as Stripe.Checkout.Session);

test('empty filters include every status and do not constrain creation date', () => {
  const filters = adminOrderFiltersSchema.parse({});
  expect(filters).toEqual({ status: 'all', from: '', to: '' });
  expect(orderCreatedRange(filters)).toBeUndefined();
  expect(matchesOrderFilters(session('2026-11-08T12:00:00Z', 'delivered'), filters)).toBe(true);
});

test('single-day filters include midnight through the final second in the list timezone', () => {
  const filters = adminOrderFiltersSchema.parse({ status: 'shipped', from: '2026-11-08', to: '2026-11-08' });
  expect(matchesOrderFilters(session('2026-11-08T02:59:59Z', 'shipped'), filters)).toBe(false);
  expect(matchesOrderFilters(session('2026-11-08T03:00:00Z', 'shipped'), filters)).toBe(true);
  expect(matchesOrderFilters(session('2026-11-09T02:59:59Z', 'shipped'), filters)).toBe(true);
  expect(matchesOrderFilters(session('2026-11-09T03:00:00Z', 'shipped'), filters)).toBe(false);
  expect(matchesOrderFilters(session('2026-11-08T12:00:00Z', 'packing'), filters)).toBe(false);
});

test('one-sided date ranges are supported', () => {
  expect(orderCreatedRange(adminOrderFiltersSchema.parse({ from: '2026-11-08' }))).toEqual({ gte: Date.parse('2026-11-08T03:00:00Z') / 1000 });
  expect(orderCreatedRange(adminOrderFiltersSchema.parse({ to: '2026-11-08' }))).toEqual({ lt: Date.parse('2026-11-09T03:00:00Z') / 1000 });
});

test('calendar-day boundaries follow the configured timezone even across historical offset changes', () => {
  const range = orderCreatedRange(adminOrderFiltersSchema.parse({ from: '2018-11-04', to: '2018-11-04' }));
  expect(range).toEqual({ gte: Date.parse('2018-11-04T03:00:00Z') / 1000, lt: Date.parse('2018-11-05T02:00:00Z') / 1000 });
});

test('invalid statuses, repeated query fields, impossible dates and reversed ranges are rejected', () => {
  for (const value of [{ status: 'refunded' }, { status: ['shipped', 'confirmed'] }, { from: '2026-02-30' }, { from: '2026-11-09', to: '2026-11-08' }, { to: 'yesterday' }, { user_id: 'other' }]) {
    expect(adminOrderFiltersSchema.safeParse(value).success).toBe(false);
  }
});

test('pagination and newest-order URLs preserve active filters in every locale', () => {
  const filters = adminOrderFiltersSchema.parse({ status: 'shipped', from: '2026-11-01', to: '2026-11-08' });
  expect(orderListHref('pt', true, filters, 'cursor')).toBe('/pt/admin/orders/?status=shipped&from=2026-11-01&to=2026-11-08&after=cursor');
  expect(orderListHref('en', true, filters)).toBe('/admin/orders/?status=shipped&from=2026-11-01&to=2026-11-08');
  expect(orderListHref('es', false, filters, 'cursor')).toBe('/es/orders/?after=cursor');
});
