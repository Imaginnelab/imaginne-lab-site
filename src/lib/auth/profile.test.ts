import assert from 'node:assert/strict';
import { test } from 'vitest';
import { accountView, initials } from './profile';

test('initials handle full names, single names, accents, and whitespace', () => {
  for (const [name, expected] of [['Guilherme Farinela', 'GF'], ['Guilherme', 'GU'], ['  Ana Maria Silva  ', 'AS'], ['Érica', 'ÉR'], ['A', 'A'], ['', '?']]) {
    assert.equal(initials(name), expected);
  }
});

test('accountView exposes only what the dialog shows', () => {
  assert.equal(accountView(null), null);
  assert.deepEqual(accountView({ email: 'a@b.co', fullName: '  Nome Completo ', isAdmin: false }), { name: 'Nome Completo', email: 'a@b.co', initials: 'NC', isAdmin: false });
  assert.deepEqual(accountView({ email: null, fullName: null, isAdmin: true }), { name: '', email: '', initials: '?', isAdmin: true });
  // Nothing else from the user object travels along.
  const view = accountView({ email: 'a@b.co', fullName: 'A', isAdmin: false, id: 'secret' } as never);
  assert.deepEqual(Object.keys(view ?? {}).sort(), ['email', 'initials', 'isAdmin', 'name']);
});
