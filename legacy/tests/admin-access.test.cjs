const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../server/admin-dashboard.cjs'), 'utf8');
async function request({ token, method = 'GET', userStatus = 200, rows = [], throws = false } = {}) {
  const calls = [];
  const context = { module: { exports: {} }, process: { env: {} }, URLSearchParams, AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (throws) throw new Error('network');
      const auth = url.endsWith('/auth/v1/user');
      return { ok: auth ? userStatus === 200 : true, status: auth ? userStatus : 200,
        json: async () => auth ? { id: 'verified-id', email: 'admin@example.com' } : rows };
    },
  };
  vm.runInNewContext(source, context);
  const headers = {};
  const res = { setHeader: (key, value) => { headers[key] = value; }, end: body => { res.body = JSON.parse(body); } };
  await context.module.exports({ method, headers: { authorization: token } }, res);
  return { res, calls, headers };
}
test('missing token is denied without querying Supabase', async () => {
  const { res, calls } = await request();
  assert.equal(res.statusCode, 401); assert.equal(calls.length, 0);
});
test('forged or expired token is denied before reading the profile', async () => {
  const { res, calls } = await request({ token: 'Bearer forged', userStatus: 401 });
  assert.equal(res.statusCode, 401); assert.equal(calls.length, 1);
});
test('only the boolean true authorizes access', async () => {
  for (const value of [false, null, undefined, 'true', 1]) {
    const { res } = await request({ token: 'Bearer valid', rows: [{ isadmin: value }] });
    assert.equal(res.statusCode, 403);
  }
  const { res } = await request({ token: 'Bearer valid' });
  assert.equal(res.statusCode, 403);
});
test('admin response uses the verified user ID and is never cached', async () => {
  const { res, calls, headers } = await request({ token: 'Bearer valid', rows: [{ isadmin: true, full_name: 'Guilherme Farinela' }] });
  assert.equal(res.statusCode, 200);
  assert.equal(new URL(calls[1].url).searchParams.get('id'), 'eq.verified-id');
  assert.equal(new URL(calls[1].url).searchParams.get('select'), 'full_name,isadmin:is_admin');
  assert.equal(res.body.profile.full_name, 'Guilherme Farinela');
  assert.equal(headers['Cache-Control'], 'private, no-store');
});
test('network failure fails closed; unsupported methods are denied', async () => {
  assert.equal((await request({ token: 'Bearer valid', throws: true })).res.statusCode, 503);
  assert.equal((await request({ token: 'Bearer valid', method: 'POST' })).res.statusCode, 405);
});
test('initials handle full names, single names, accents, and whitespace', async () => {
  const code = fs.readFileSync(path.join(__dirname, '../public/assets/js/account-profile.js'), 'utf8');
  const { initials, fullName } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  for (const [name, expected] of [['Guilherme Farinela', 'GF'], ['Guilherme', 'GU'], ['  Ana Maria Silva  ', 'AS'], ['Érica', 'ÉR'], ['A', 'A'], ['', '?']]) {
    assert.equal(initials(name), expected);
  }
  assert.equal(fullName({ full_name: 'Nome completo' }, { user_metadata: { name: 'Outro' } }), 'Nome completo');
});
