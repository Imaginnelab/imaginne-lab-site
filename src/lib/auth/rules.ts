import { z } from 'zod';

// Shared by the Server Actions (the real check) and by their tests. No server-only import here.

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  // Any length is accepted on sign-in: rejecting by length would describe the stored password.
  password: z.string().min(1).max(1024),
});

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    password: z.string().min(8).max(1024),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, { path: ['confirm'] });

// Keys of messages/account/*.json that an action may answer with.
export type AccountMessage =
  | 'credentials' | 'checkEmail' | 'signedUp' | 'weak' | 'rate' | 'emailRate' | 'signupDisabled' | 'invalidEmail'
  | 'serverError' | 'unavailable' | 'generic' | 'mismatch' | 'nameRequired';

export type AccountState = { ok: boolean; message?: AccountMessage; email?: string };

// Which field of the sign-up form is wrong, as a message key.
export function signUpProblem(issues: readonly { path: PropertyKey[] }[]): AccountMessage {
  const fields = new Set(issues.map((issue) => issue.path[0]));
  if (fields.has('name')) return 'nameRequired';
  if (fields.has('email')) return 'invalidEmail';
  if (fields.has('password')) return 'weak';
  if (fields.has('confirm')) return 'mismatch';
  return 'generic';
}

// Answer to a failed sign-in. Whatever the reason (wrong password, unknown e-mail, e-mail not
// confirmed yet), the visitor reads the same sentence, so the form never tells whether an
// address has an account (audit SEC-003). Only throttling and outages are told apart.
export function signInFailure(code: string | undefined): AccountMessage {
  if (code === 'over_request_rate_limit') return 'rate';
  if (code === 'invalid_credentials' || code === 'email_not_confirmed' || code === 'user_banned' || code === 'user_not_found') return 'credentials';
  return code ? 'credentials' : 'unavailable';
}

// Answer to a sign-up attempt that the auth server refused. "Already registered" is not in the
// list on purpose: it is answered exactly like a successful registration (see signUpOutcome).
export function signUpFailure(code: string | undefined): AccountMessage {
  switch (code) {
    case 'weak_password': return 'weak';
    case 'over_request_rate_limit': return 'rate';
    case 'over_email_send_rate_limit': return 'emailRate';
    case 'signup_disabled': return 'signupDisabled';
    case 'email_address_invalid': case 'validation_failed': return 'invalidEmail';
    case 'unexpected_failure': return 'serverError';
    default: return code ? 'generic' : 'unavailable';
  }
}

// Whether a sign-up error means "this e-mail already has an account".
export const isExistingAccount = (code: string | undefined): boolean => code === 'user_already_exists' || code === 'email_exists';
