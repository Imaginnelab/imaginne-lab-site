'use client';

import Link, { useLinkStatus } from 'next/link';
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react';

const LoadingCopy = createContext('Loading page…');
export function NavigationProvider({ children, loading }: { children: ReactNode; loading: string }) {
  return <LoadingCopy value={loading}>{children}</LoadingCopy>;
}
function PendingIndicator() {
  const { pending } = useLinkStatus();
  const label = useContext(LoadingCopy);
  return <span className="navigation-spinner" data-pending={pending} hidden={!pending} role="status" aria-live="polite" aria-busy={pending}>
    <span aria-hidden="true" /><span className="navigation-sr-only">{pending ? label : ''}</span>
  </span>;
}
// Use for internal page navigation throughout the app. Native anchors remain for in-page links.
export function NavigationLink({ children, className = '', ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={'navigation-link ' + className}>{children}<PendingIndicator /></Link>;
}
