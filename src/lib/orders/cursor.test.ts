import { expect, test } from 'vitest';
import { decodeOrderCursor, encodeOrderCursor } from './cursor';

test('pagination hides private IDs and remains bound to the verified user and role', () => {
  const cursor = encodeOrderCursor('cs_test_private', 'customer:owner', 'isolated-key');
  expect(cursor).not.toContain('cs_test_private');
  expect(decodeOrderCursor(cursor, 'customer:owner', 'isolated-key')).toBe('cs_test_private');
  expect(decodeOrderCursor(cursor, 'customer:other', 'isolated-key')).toBeNull();
  expect(decodeOrderCursor(cursor, 'admin:owner', 'isolated-key')).toBeNull();
  expect(decodeOrderCursor(cursor, 'customer:owner', 'rotated-key')).toBeNull();
});

test('tampered and malformed pagination tokens are rejected', () => {
  const cursor = encodeOrderCursor('cs_test_private', 'customer:owner', 'isolated-key');
  for (const value of [null, ['x'], '../orders', cursor.slice(0, 10) + 'AAAA' + cursor.slice(14), 'x'.repeat(701)]) {
    expect(decodeOrderCursor(value, 'customer:owner', 'isolated-key')).toBeNull();
  }
});
