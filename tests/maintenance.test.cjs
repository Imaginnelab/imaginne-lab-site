const test = require('node:test');
const assert = require('node:assert/strict');
const { decide, initialView, langFromPath, parseState, readSession, WAIT_MS } = require('../public/assets/js/maintenance.js');

const storage = (items) => {
  const keys = Object.keys(items);
  return { length: keys.length, key: (i) => keys[i], getItem: (key) => (key in items ? items[key] : null) };
};

test('the site shows whenever maintenance is off, whoever is visiting', () => {
  for (const admin of [true, false, 'unknown']) {
    for (const timedOut of [true, false]) assert.equal(decide({ state: 'off', admin, timedOut }), 'site');
  }
});

test('a failed settings request never takes the site down', () => {
  for (const admin of [true, false, 'unknown']) {
    for (const timedOut of [true, false]) assert.equal(decide({ state: 'failed', admin, timedOut }), 'site');
  }
});

test('while the state is unknown the page waits, and opens when the wait runs out', () => {
  assert.equal(decide({ state: 'unknown', admin: 'unknown', timedOut: false }), 'pending');
  assert.equal(decide({ state: 'unknown', admin: false, timedOut: false }), 'pending');
  assert.equal(decide({ state: 'unknown', admin: true, timedOut: false }), 'pending');
  assert.equal(decide({ state: 'unknown', admin: 'unknown', timedOut: true }), 'site');
  assert.equal(decide({ state: 'unknown', admin: false, timedOut: true }), 'site');
  assert.equal(WAIT_MS, 1500);
});

test('under maintenance only a confirmed administrator sees the site', () => {
  assert.equal(decide({ state: 'on', admin: true, timedOut: false }), 'admin');
  assert.equal(decide({ state: 'on', admin: true, timedOut: true }), 'admin');
  assert.equal(decide({ state: 'on', admin: false, timedOut: false }), 'curtain');
  assert.equal(decide({ state: 'on', admin: false, timedOut: true }), 'curtain');
  // Still checking who the visitor is: wait, then fall back to the curtain, never to the site.
  assert.equal(decide({ state: 'on', admin: 'unknown', timedOut: false }), 'pending');
  assert.equal(decide({ state: 'on', admin: 'unknown', timedOut: true }), 'curtain');
  // Only the boolean true counts as an administrator.
  for (const admin of ['true', 1, {}, null, undefined]) assert.notEqual(decide({ state: 'on', admin, timedOut: true }), 'admin');
});

test('only a remembered "off" shows the site before the answer arrives', () => {
  assert.equal(initialView('off'), 'site');
  assert.equal(initialView('on'), 'pending');
  assert.equal(initialView(null), 'pending');
  assert.equal(initialView('true'), 'pending');
  // Nothing remembered can open the admin view or raise the curtain by itself.
  for (const cached of ['off', 'on', null, 'admin', 'site']) assert.ok(['site', 'pending'].includes(initialView(cached)));
});

test('parseState accepts exactly one row with a boolean', () => {
  assert.equal(parseState(true, [{ maintenance_mode: true }]), 'on');
  assert.equal(parseState(true, [{ maintenance_mode: false }]), 'off');
  assert.equal(parseState(false, [{ maintenance_mode: true }]), 'failed');
  for (const body of [[], [{}], [{ maintenance_mode: 'true' }], [{ maintenance_mode: 1 }], [{ maintenance_mode: null }], { maintenance_mode: true }, null, 'on',
    [{ maintenance_mode: true }, { maintenance_mode: false }]]) {
    assert.equal(parseState(true, body), 'failed', JSON.stringify(body));
  }
});

test('readSession finds a usable stored session and ignores everything else', () => {
  const now = 1000;
  const token = (value) => JSON.stringify(value);
  assert.deepEqual(readSession(storage({ 'sb-abc-auth-token': token({ access_token: 'aaa', expires_at: 2000 }) }), now), { token: 'aaa' });
  assert.deepEqual(readSession(storage({ 'sb-abc-auth-token': token({ access_token: 'aaa' }) }), now), { token: 'aaa' });
  assert.equal(readSession(storage({ 'sb-abc-auth-token': token({ access_token: 'aaa', expires_at: 999 }) }), now), null);
  assert.equal(readSession(storage({ 'sb-abc-auth-token': token({ access_token: 'aaa', expires_at: 1000 }) }), now), null);
  assert.equal(readSession(storage({ 'sb-abc-auth-token': 'not json' }), now), null);
  assert.equal(readSession(storage({ 'sb-abc-auth-token': token({ access_token: '' }) }), now), null);
  assert.equal(readSession(storage({ 'sb-abc-auth-token': token({ refresh_token: 'r' }) }), now), null);
  assert.equal(readSession(storage({ 'sb-abc-auth-token': 'null' }), now), null);
  assert.equal(readSession(storage({ 'imaginne-theme': 'dark', 'sb-abc-auth-token-code-verifier': token({ access_token: 'x' }) }), now), null);
  assert.equal(readSession(storage({}), now), null);
  // A second, valid key is still found after a broken one.
  assert.deepEqual(readSession(storage({ 'sb-a-auth-token': token({ access_token: 'old', expires_at: 1 }), 'sb-b-auth-token': token({ access_token: 'bbb', expires_at: 5000 }) }), now), { token: 'bbb' });
  assert.equal(readSession({ get length() { throw new Error('blocked'); } }, now), null);
});

test('langFromPath follows the first path segment', () => {
  assert.equal(langFromPath('/'), 'en');
  assert.equal(langFromPath('/pt/'), 'pt');
  assert.equal(langFromPath('/pt'), 'pt');
  assert.equal(langFromPath('/es/qualquer-coisa'), 'es');
  assert.equal(langFromPath('/portfolio'), 'en');
  assert.equal(langFromPath('/espanol'), 'en');
  assert.equal(langFromPath('/404.html'), 'en');
});
