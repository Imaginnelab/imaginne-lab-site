'use client';
import { NavigationLink } from '@/components/navigation/NavigationLink';

import { type KeyboardEvent, useEffect, useRef, useState, useTransition } from 'react';
import { CartIcon } from '@/components/cart/CartIcon';
import { useCart } from '@/components/cart/CartProvider';
import type { AccountDictionary } from '@/i18n/account-dictionaries';
import { signOut } from '@/lib/auth/actions';
import type { AccountView } from '@/lib/auth/profile';

type Props = { user: AccountView; t: AccountDictionary['account']; adminHref: string; ordersHref: string };

// Signed in, the avatar opens a menu under it (same family as the language menu) instead of a
// modal: who is signed in, then everything the account can do, one row each.
export function AccountPopover({ user, t, adminHref, ordersHref }: Props) {
  const [opened, setOpened] = useState(false);
  // Opened from the keyboard, focus moves into the menu; opened with the pointer, it stays put.
  const byKeyboard = useRef(false);
  const [message, setMessage] = useState('');
  const [leaving, startLeaving] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const cart = useCart();
  const count = cart.lines.reduce((sum, line) => sum + line.quantity, 0);

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([hidden])') ?? []);

  useEffect(() => {
    if (!opened) return;
    if (byKeyboard.current) items()[0]?.focus();
    const onOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpened(false);
    };
    document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  }, [opened]);

  function close(refocus = true) {
    setOpened(false);
    if (refocus) trigger.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!opened) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1
      : (at + (event.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
    list[next]?.focus();
  }

  function openCart() {
    close(false);
    document.body.classList.remove('nav-open');
    cart.open();
  }

  function leave() {
    if (leaving) return;
    setMessage('');
    startLeaving(async () => {
      const result = await signOut();
      if (!result.ok) setMessage(t[result.message ?? 'generic']);
    });
  }

  return (
    <div className="account-switch" ref={root} onKeyDown={onKeyDown}
      onBlur={(event) => { if (event.relatedTarget instanceof Node && !root.current?.contains(event.relatedTarget)) setOpened(false); }}>
      <button
        ref={trigger}
        className="auth-trigger btn btn-ghost btn-sm is-authenticated"
        type="button"
        data-auth-open
        aria-haspopup="menu"
        aria-expanded={opened}
        aria-controls="account-menu"
        aria-label={`${t.account}${user.name ? `: ${user.name}` : ''}`}
        title={user.name || t.account}
        onClick={(event) => { byKeyboard.current = event.detail === 0; setOpened((value) => !value); }}
      >
        <span>{user.initials}</span>
      </button>
      <div className="account-menu" id="account-menu" ref={menu} role="menu" aria-label={t.account} hidden={!opened}>
        <div className="account-identity">
          <span className="auth-avatar" aria-hidden="true">{user.initials}</span>
          <div>
            {user.name ? <p className="account-name">{user.name}</p> : null}
            <p className="account-email">{user.email}</p>
          </div>
        </div>
        <button type="button" role="menuitem" className="account-item" onClick={openCart}>
          <CartIcon />
          <span>{t.cart}</span>
          {count ? <span className="account-count">{count}</span> : null}
        </button>
        <NavigationLink role="menuitem" className="account-item" href={ordersHref} onClick={() => close(false)}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" d="M7 4h10l4 5v11H3V9Zm-4 5h18M12 4v5M8 13h8m-8 4h5" />
          </svg>
          <span>{t.orders}</span>
        </NavigationLink>
        {user.isAdmin ? (
          <NavigationLink role="menuitem" className="account-item" href={adminHref} onClick={() => close(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 5h7v8H4zM13 5h7v5h-7zM13 12h7v7h-7zM4 15h7v4H4z" />
            </svg>
            <span>{t.admin}</span>
          </NavigationLink>
        ) : null}
        <button type="button" role="menuitem" className="account-item account-item-leave" disabled={leaving} aria-busy={leaving || undefined} onClick={leave}>
          {leaving ? null : (
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
            </svg>
          )}
          <span>{leaving ? t.wait : t.logout}</span>
        </button>
        <p className="account-message" role="status" aria-live="polite">{message}</p>
      </div>
    </div>
  );
}
