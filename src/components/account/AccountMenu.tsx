'use client';

import { type FormEvent, useEffect, useRef, useState, useTransition } from 'react';
import type { AccountDictionary } from '@/i18n/account-dictionaries';
import type { Locale } from '@/i18n/config';
import { signIn, signOut, signUp } from '@/lib/auth/actions';
import type { AccountView } from '@/lib/auth/profile';

type Props = {
  // Who is signed in, as decided on the server: the first paint is already right (no avatar flash).
  user: AccountView | null;
  t: AccountDictionary['account'];
  locale: Locale;
  adminHref: string;
  // "nav": the header button (sign in / avatar). "maintenance": the plain button of the maintenance screen.
  variant?: 'nav' | 'maintenance';
  label?: string;
};

type Mode = 'login' | 'signup';

// The account button and its dialog: sign in, sign up, "My account" and sign out.
// Markup and classes are the ones of the previous site, so the existing CSS applies unchanged.
export function AccountMenu({ user, t, locale, adminHref, variant = 'nav', label }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState('');
  const [pending, startTransition] = useTransition();
  const [leaving, startLeaving] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const logout = useRef<HTMLButtonElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wasSignedIn = useRef(!!user);

  const busy = pending || leaving;
  const registration = mode === 'signup';
  const field = (name: string) => form.current?.elements.namedItem(name) as HTMLInputElement | null;

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // After signing out with the dialog open, the form comes back with the e-mail field ready.
  useEffect(() => {
    if (wasSignedIn.current && !user && dialog.current?.open) field('email')?.focus();
    wasSignedIn.current = !!user;
  }, [user]);

  function dismissToast() {
    clearTimeout(toastTimer.current);
    setToast('');
  }
  function showToast(text: string) {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(''), 5000);
  }

  function open() {
    document.body.classList.remove('nav-open');
    dialog.current?.showModal();
    (user ? logout.current : field(registration ? 'name' : 'email'))?.focus();
  }

  function closed() {
    dismissToast();
    const password = field('password');
    const confirm = field('confirm');
    if (password) password.value = '';
    if (confirm) confirm.value = '';
    if (!busy) { setMessage(''); setMode('login'); }
    trigger.current?.focus();
  }

  function switchMode() {
    dismissToast();
    setMessage('');
    const password = field('password');
    const confirm = field('confirm');
    if (password) password.value = '';
    if (confirm) { confirm.value = ''; confirm.setCustomValidity(''); }
    const next: Mode = registration ? 'login' : 'signup';
    setMode(next);
    // The name field is enabled by the render that follows.
    requestAnimationFrame(() => field(next === 'signup' ? 'name' : 'email')?.focus());
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const target = event.currentTarget;
    const name = field('name');
    const confirm = field('confirm');
    if (registration && name && !name.value.trim()) {
      name.setCustomValidity(t.nameRequired);
      target.reportValidity();
      return;
    }
    if (registration && confirm && field('password')?.value !== confirm.value) {
      confirm.setCustomValidity(t.mismatch);
      target.reportValidity();
      return;
    }
    // Read before the fields are disabled for the wait.
    const data = new FormData(target);
    dismissToast();
    setMessage('');
    startTransition(async () => {
      const result = await (registration ? signUp(data) : signIn(data));
      if (!result.ok) {
        setMessage(t[result.message ?? 'generic']);
        return;
      }
      target.reset();
      if (registration) {
        setMode('login');
        const email = field('email');
        if (email) email.value = result.email ?? '';
        showToast(t[result.message ?? 'checkEmail']);
        field('password')?.focus();
      } else {
        dialog.current?.close();
      }
    });
  }

  function leave() {
    if (busy) return;
    setMessage('');
    startLeaving(async () => {
      const result = await signOut();
      if (!result.ok) setMessage(t[result.message ?? 'generic']);
      else setMode('login');
    });
  }

  const accountLabel = user ? `${t.account}${user.name ? `: ${user.name}` : ''}` : t.login;

  return (
    <>
      {variant === 'maintenance' ? (
        <button ref={trigger} className="maintenance-login" type="button" aria-haspopup="dialog" aria-controls="auth-dialog" onClick={open}>
          {label}
        </button>
      ) : (
        <button
          ref={trigger}
          className={`auth-trigger btn btn-ghost btn-sm${user ? ' is-authenticated' : ''}`}
          type="button"
          data-auth-open
          aria-haspopup="dialog"
          aria-controls="auth-dialog"
          aria-label={accountLabel}
          title={user ? user.name || t.account : t.login}
          onClick={open}
        >
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-8a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM3 22v-3a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v3h-2v-3a5 5 0 0 0-5-5h-4a5 5 0 0 0-5 5v3Z" />
          </svg>
          <span>{user ? user.initials : t.login}</span>
        </button>
      )}
      <dialog ref={dialog} className="auth-dialog" id="auth-dialog" aria-labelledby="auth-title" aria-busy={busy} onClose={closed}>
        <button type="button" className="auth-close" aria-label={t.close} onClick={() => dialog.current?.close()}>×</button>
        <p className="eyebrow">Imaginne Lab</p>
        <h2 id="auth-title">{user ? t.account : registration ? t.signup : t.login}</h2>
        <div className="auth-toast" role="status" aria-live="polite" aria-atomic="true" hidden={!toast}>
          <button type="button" aria-label={toast ? `${toast} — ${t.close}` : undefined} onClick={dismissToast}>
            <span>{toast}</span>
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <form
          ref={form}
          className={`auth-form${registration ? ' is-registration' : ''}`}
          hidden={!!user}
          onSubmit={submit}
          onInput={() => { field('confirm')?.setCustomValidity(''); field('name')?.setCustomValidity(''); }}
        >
          <fieldset disabled={busy}>
            <input type="hidden" name="locale" value={locale} />
            <label data-registration hidden={!registration}>
              {t.name}
              <input name="name" autoComplete="name" maxLength={100} required={registration} disabled={!registration} />
            </label>
            <label>
              {t.email}
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              {t.password}
              <input
                name="password"
                type="password"
                required
                minLength={registration ? 8 : 1}
                autoComplete={registration ? 'new-password' : 'current-password'}
                aria-describedby={registration ? 'auth-password-hint' : undefined}
              />
            </label>
            <small data-registration id="auth-password-hint" hidden={!registration}>{t.hint}</small>
            <label data-registration hidden={!registration}>
              {t.confirm}
              <input name="confirm" type="password" autoComplete="new-password" required={registration} disabled={!registration} />
            </label>
            <button className="btn btn-primary" type="submit" aria-busy={pending || undefined}>
              {pending ? t.wait : registration ? t.signup : t.login}
            </button>
          </fieldset>
        </form>
        <div className="auth-account" hidden={!user}>
          <div className="auth-identity">
            <span className="auth-avatar" aria-hidden="true">{user?.initials}</span>
            <div>
              <p className="auth-full-name">{user?.name}</p>
              <p className="auth-email">{user?.email}</p>
            </div>
          </div>
          <div className="auth-account-actions">
            <a className="btn btn-primary auth-admin" href={adminHref} hidden={!user?.isAdmin}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 5h7v8H4zM13 5h7v5h-7zM13 12h7v7h-7zM4 15h7v4H4z" />
              </svg>
              <span>{t.admin}</span>
            </a>
            <button ref={logout} className="btn btn-ghost" type="button" disabled={busy} aria-busy={leaving || undefined} onClick={leave}>
              {leaving ? t.wait : t.logout}
            </button>
          </div>
        </div>
        <p className={`auth-message${message ? ' is-error' : ''}`} role="status" aria-live="polite" aria-atomic="true">{message}</p>
        <p className="auth-switch" hidden={!!user}>
          <span>{registration ? '' : t.invitation}</span>{' '}
          <button type="button" disabled={busy} onClick={switchMode}>{registration ? t.back : t.register}</button>
        </p>
      </dialog>
    </>
  );
}
