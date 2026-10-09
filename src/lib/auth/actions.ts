'use server';

import { refresh } from 'next/cache';
import { headers } from 'next/headers';
import { isLocale, localePath } from '@/i18n/config';
import { createClient } from '@/lib/supabase/server';
import {
  type AccountState, isExistingAccount, signInFailure, signInSchema, signUpFailure, signUpProblem, signUpSchema,
} from './rules';

// Account actions. Each one validates what arrives, talks to the auth server as the visitor
// (publishable key, cookies) and answers with a message key only: no error text, code or
// account detail from the auth server ever reaches the browser.

const text = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
};

export async function signIn(form: FormData): Promise<AccountState> {
  const email = text(form, 'email').trim();
  const parsed = signInSchema.safeParse({ email, password: text(form, 'password') });
  // A malformed address gets the same answer as a wrong password.
  if (!parsed.success) return { ok: false, message: 'credentials', email };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { ok: false, message: signInFailure(error.code), email };
  } catch {
    return { ok: false, message: 'unavailable', email };
  }
  // The header and anything else that depends on who is signed in is rendered again.
  refresh();
  return { ok: true };
}

export async function signUp(form: FormData): Promise<AccountState> {
  const email = text(form, 'email').trim();
  const parsed = signUpSchema.safeParse({
    name: text(form, 'name'), email, password: text(form, 'password'), confirm: text(form, 'confirm'),
  });
  if (!parsed.success) return { ok: false, message: signUpProblem(parsed.error.issues), email };
  // Whether the project asks new accounts to confirm their e-mail is a Supabase setting. The
  // answer tells the truth for either case and never says whether the address already had an
  // account (audit SEC-003): with confirmation off both "created" and "already registered" lead
  // to "sign in"; with it on both lead to "check your inbox".
  let confirmsByEmail = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { name: parsed.data.name }, emailRedirectTo: await confirmationUrl(text(form, 'locale')) },
    });
    if (error && !isExistingAccount(error.code)) return { ok: false, message: signUpFailure(error.code), email };
    confirmsByEmail = !error && !data.session;
    // Registration always ends at the sign-in form, even when no confirmation e-mail is needed.
    if (data.session) await supabase.auth.signOut({ scope: 'local' });
  } catch {
    return { ok: false, message: 'unavailable', email };
  }
  return { ok: true, message: confirmsByEmail ? 'checkEmail' : 'signedUp', email: parsed.data.email };
}
export async function signOut(): Promise<AccountState> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) return { ok: false, message: 'generic' };
  } catch {
    return { ok: false, message: 'unavailable' };
  }
  refresh();
  return { ok: true };
}

// Where the confirmation e-mail sends the person back to: this site, in their language.
// Built from the request's own host; the auth server still checks it against its allow-list.
async function confirmationUrl(locale: string): Promise<string | undefined> {
  const list = await headers();
  const host = list.get('x-forwarded-host') ?? list.get('host');
  if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return undefined;
  const protocol = list.get('x-forwarded-proto') === 'http' || /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https';
  return `${protocol}://${host}${localePath(isLocale(locale) ? locale : 'en')}`;
}
