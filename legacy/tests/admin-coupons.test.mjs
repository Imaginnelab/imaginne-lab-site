import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CODE_PATTERN, couponStatus, isoToLocal, localToIso, normalizeCode, readCoupon,
} from '../public/assets/js/admin-coupons.js';

const base = { code: 'verao10', type: 'percent', value: '10', max: '', start: '', end: '', active: true };

test('codes are stored in capitals and follow the database pattern', () => {
  assert.equal(normalizeCode('  verao10 '), 'VERAO10');
  assert.equal(normalizeCode(null), '');
  for (const code of ['ABC', 'VERAO10', 'A1_B-2', '9LIVES', 'A'.repeat(32)]) assert.ok(CODE_PATTERN.test(code), code);
  for (const code of ['AB', '-ABC', '_ABC', 'abc', 'AB C', 'AÇÃO', 'A'.repeat(33), 'AB%', '']) assert.ok(!CODE_PATTERN.test(code), code);
});

test('readCoupon builds a percent coupon with only writable columns', () => {
  const { values, errors } = readCoupon(base);
  assert.deepEqual(errors, {});
  assert.deepEqual(values, {
    code: 'VERAO10', discount_type: 'percent', percent_off: 10, amount_off_cad_cents: null,
    starts_at: null, expires_at: null, max_uses: null, is_active: true,
  });
  assert.ok(!('used_count' in values) && !('id' in values));
  assert.equal(readCoupon({ ...base, value: '15 %' }).values.percent_off, 15);
});

test('readCoupon builds a fixed amount coupon in CAD cents', () => {
  const { values, errors } = readCoupon({ ...base, type: 'amount', value: '12,50', max: '100', active: false });
  assert.deepEqual(errors, {});
  assert.equal(values.discount_type, 'amount');
  assert.equal(values.amount_off_cad_cents, 1250);
  assert.equal(values.percent_off, null);
  assert.equal(values.max_uses, 100);
  assert.equal(values.is_active, false);
});

test('readCoupon rejects bad codes, values and limits', () => {
  const keys = (raw) => readCoupon({ ...base, ...raw }).errors;
  assert.equal(keys({ code: '' }).code, 'required');
  assert.equal(keys({ code: 'ab' }).code, 'codeInvalid');
  assert.equal(keys({ code: '-abc' }).code, 'codeInvalid');
  assert.equal(keys({ code: 'promo 10' }).code, 'codeInvalid');
  assert.equal(keys({ value: '' }).value, 'required');
  for (const value of ['0', '101', '10,5', '-5', 'abc', '1000']) assert.equal(keys({ value }).value, 'percentInvalid', value);
  for (const value of ['0', '0,00', 'abc', '-5']) assert.equal(keys({ type: 'amount', value }).value, 'amountInvalid', value);
  assert.equal(keys({ type: 'amount', value: '1000000,01' }).value, 'amountTooHigh');
  for (const max of ['0', '-1', '1.5', 'abc', '1000001']) assert.equal(keys({ max }).max, 'maxInvalid', max);
  assert.equal(keys({ max: '1000000' }).max, undefined);
});

test('readCoupon requires the end to come after the start', () => {
  const ok = readCoupon({ ...base, start: '2026-11-01T09:00', end: '2026-11-30T23:59' });
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.values.starts_at, new Date('2026-11-01T09:00').toISOString());
  assert.equal(ok.values.expires_at, new Date('2026-11-30T23:59').toISOString());
  assert.equal(readCoupon({ ...base, start: '2026-11-30T10:00', end: '2026-11-01T10:00' }).errors.end, 'endBeforeStart');
  assert.equal(readCoupon({ ...base, start: '2026-11-01T10:00', end: '2026-11-01T10:00' }).errors.end, 'endBeforeStart');
  assert.equal(readCoupon({ ...base, start: 'x' }).errors.start, 'dateInvalid');
  assert.equal(readCoupon({ ...base, end: '2026-13-45T10:00' }).errors.end, 'dateInvalid');
  assert.deepEqual(readCoupon({ ...base, end: '2026-11-01T10:00' }).errors, {});
});

test('local date fields round-trip through ISO instants', () => {
  assert.equal(localToIso(''), null);
  assert.equal(localToIso(null), null);
  assert.ok(Number.isNaN(localToIso('tomorrow')));
  assert.ok(Number.isNaN(localToIso('2026-11-01')));
  const iso = localToIso('2026-11-01T09:30');
  assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(isoToLocal(iso), '2026-11-01T09:30');
  assert.equal(isoToLocal(null), '');
  assert.equal(isoToLocal('not a date'), '');
});

test('couponStatus tells what a coupon would do right now', () => {
  const now = new Date('2026-10-07T12:00:00Z');
  const coupon = { is_active: true, starts_at: null, expires_at: null, max_uses: null, used_count: 0 };
  assert.equal(couponStatus(coupon, now), 'active');
  assert.equal(couponStatus({ ...coupon, is_active: false }, now), 'inactive');
  assert.equal(couponStatus({ ...coupon, starts_at: '2026-10-08T00:00:00Z' }, now), 'scheduled');
  assert.equal(couponStatus({ ...coupon, expires_at: '2026-10-07T11:59:59Z' }, now), 'expired');
  assert.equal(couponStatus({ ...coupon, expires_at: '2026-10-07T12:00:01Z' }, now), 'active');
  assert.equal(couponStatus({ ...coupon, max_uses: 5, used_count: 5 }, now), 'exhausted');
  assert.equal(couponStatus({ ...coupon, max_uses: 5, used_count: 4 }, now), 'active');
  assert.equal(couponStatus({ ...coupon, is_active: false, expires_at: '2020-01-01T00:00:00Z' }, now), 'inactive');
  assert.equal(couponStatus(null, now), 'inactive');
});
