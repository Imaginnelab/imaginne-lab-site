'use client';

import type { ComponentProps, MouseEvent } from 'react';
import { NavigationLink } from './NavigationLink';

const trim = (path: string) => path.replace(/\/+$/, '') || '/';

// A link to the home page or one of its sections. Already on that page, it only scrolls (to the
// section, or to the top for the bare home link): no reload, no loading line, and the address
// bar is left clean, without a #fragment. From another page it navigates there; sections use
// their English anchor in every language.
export function SectionLink({ href, onClick, ...props }: ComponentProps<typeof NavigationLink> & { href: string }) {
  function scroll(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(href, window.location.href);
    if (trim(url.pathname) !== trim(window.location.pathname)) return;
    const target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
    if (url.hash && !target) return;
    event.preventDefault();
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (target) target.scrollIntoView({ behavior, block: 'start' });
    else window.scrollTo({ top: 0, behavior });
    if (window.location.hash) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  }
  return <NavigationLink href={href} onClick={scroll} {...props} />;
}
