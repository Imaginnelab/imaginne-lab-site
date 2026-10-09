import assert from 'node:assert/strict';
import { test } from 'vitest';
import { isExistingAccount, signInFailure, signInSchema, signUpFailure, signUpProblem, signUpSchema } from './rules';

test('sign-in accepts an e-mail and any non-empty password', () => {
  assert.deepEqual(signInSchema.parse({ email: '  Ana@Example.com ', password: 'x' }), { email: 'ana@example.com', password: 'x' });
  for (const bad of [{ email: 'ana', password: 'x' }, { email: 'ana@example.com', password: '' }, { email: '', password: 'x' }, { password: 'x' }, { email: 5, password: 'x' }]) {
    assert.equal(signInSchema.safeParse(bad).success, false, JSON.stringify(bad));
  }
});

test('sign-up needs a name, an e-mail, eight characters and a matching confirmation', () => {
  const ok = { name: ' Ana ', email: 'ana@example.com', password: '12345678', confirm: '12345678' };
  assert.deepEqual(signUpSchema.parse(ok), { name: 'Ana', email: 'ana@example.com', password: '12345678', confirm: '12345678' });
  const problem = (change: object) => {
    const result = signUpSchema.safeParse({ ...ok, ...change });
    return result.success ? null : signUpProblem(result.error.issues);
  };
  assert.equal(problem({ name: '   ' }), 'nameRequired');
  assert.equal(problem({ name: 'x'.repeat(101) }), 'nameRequired');
  assert.equal(problem({ email: 'ana' }), 'invalidEmail');
  assert.equal(problem({ password: '1234567', confirm: '1234567' }), 'weak');
  assert.equal(problem({ confirm: 'different' }), 'mismatch');
  assert.equal(problem({}), null);
});

test('a failed sign-in reads the same whatever the reason (SEC-003)', () => {
  for (const code of ['invalid_credentials', 'email_not_confirmed', 'user_not_found', 'user_banned', 'anything_else']) {
    assert.equal(signInFailure(code), 'credentials', code);
  }
  assert.equal(signInFailure('over_request_rate_limit'), 'rate');
  assert.equal(signInFailure(undefined), 'unavailable');
});

test('a refused sign-up never says that the e-mail is already registered (SEC-003)', () => {
  assert.equal(isExistingAccount('user_already_exists'), true);
  assert.equal(isExistingAccount('email_exists'), true);
  assert.equal(isExistingAccount('weak_password'), false);
  assert.equal(isExistingAccount(undefined), false);
  assert.equal(signUpFailure('weak_password'), 'weak');
  assert.equal(signUpFailure('over_request_rate_limit'), 'rate');
  assert.equal(signUpFailure('over_email_send_rate_limit'), 'emailRate');
  assert.equal(signUpFailure('signup_disabled'), 'signupDisabled');
  assert.equal(signUpFailure('email_address_invalid'), 'invalidEmail');
  assert.equal(signUpFailure('unexpected_failure'), 'serverError');
  assert.equal(signUpFailure('something_new'), 'generic');
  assert.equal(signUpFailure(undefined), 'unavailable');
  // Even if it were asked, the answer is the generic one, not "already registered".
  assert.equal(signUpFailure('user_already_exists'), 'generic');
});
