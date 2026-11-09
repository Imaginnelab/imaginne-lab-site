'use client';

import Link, { useLinkStatus } from 'next/link';
import { createContext, useCallback, useContext, useEffect, useState, type ComponentProps, type ReactNode } from 'react';

// Every link reports when its navigation starts and ends; one line under the site header shows
// that something is loading, instead of a spinner drawn under whatever was clicked.
type Navigation = { active: boolean; label: string; report: (delta: 1 | -1) => void; mount: (delta: 1 | -1) => void };
const NavigationState = createContext<Navigation>({ active: false, label: '', report: () => {}, mount: () => {} });

export function NavigationProvider({ children, loading }: { children: ReactNode; loading: string }) {
  const [pending, setPending] = useState(0);
  const [slots, setSlots] = useState(0);
  const report = useCallback((delta: 1 | -1) => setPending((count) => Math.max(0, count + delta)), []);
  const mount = useCallback((delta: 1 | -1) => setSlots((count) => count + delta), []);
  const value = { active: pending > 0, label: loading, report, mount };
  // Pages without the site header (the admin) keep the line at the top of the screen.
  return <NavigationState value={value}>{children}{slots ? null : <ProgressLine className="navigation-progress is-detached" />}</NavigationState>;
}

// Placed inside the header, so it always has the header's width and sits right under it.
export function NavigationProgress() {
  const { mount } = useContext(NavigationState);
  useEffect(() => {
    mount(1);
    return () => mount(-1);
  }, [mount]);
  return <ProgressLine className="navigation-progress" />;
}

// Shoots forward, then slows down while the page loads; runs to the end when it arrives, then fades.
function ProgressLine({ className }: { className: string }) {
  const { active, label } = useContext(NavigationState);
  const [wasActive, setWasActive] = useState(active);
  const [finishing, setFinishing] = useState(false);
  if (wasActive !== active) {
    setWasActive(active);
    setFinishing(!active);
  }
  useEffect(() => {
    if (!finishing) return;
    const timer = setTimeout(() => setFinishing(false), 600);
    return () => clearTimeout(timer);
  }, [finishing]);
  const phase = active ? 'loading' : finishing ? 'done' : 'idle';
  return <div className={className} data-phase={phase} role="status" aria-live="polite">
    <span aria-hidden="true" /><span className="navigation-sr-only">{phase === 'loading' ? label : ''}</span>
  </div>;
}

function PendingReporter() {
  const { pending } = useLinkStatus();
  const { report } = useContext(NavigationState);
  useEffect(() => {
    if (!pending) return;
    report(1);
    return () => report(-1);
  }, [pending, report]);
  return null;
}

// Use for internal page navigation throughout the app. Native anchors remain for in-page links.
export function NavigationLink({ children, className = '', ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={'navigation-link ' + className}>{children}<PendingReporter /></Link>;
}
