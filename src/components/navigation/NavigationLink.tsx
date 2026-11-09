'use client';

import Link, { useLinkStatus } from 'next/link';
import { createContext, useCallback, useContext, useEffect, useState, type ComponentProps, type ReactNode } from 'react';

// Every link reports when its navigation starts and ends; one bar under the header shows that
// something is loading, instead of a spinner drawn under whatever was clicked.
const ReportPending = createContext<(delta: 1 | -1) => void>(() => {});

export function NavigationProvider({ children, loading }: { children: ReactNode; loading: string }) {
  const [pending, setPending] = useState(0);
  const report = useCallback((delta: 1 | -1) => setPending((count) => Math.max(0, count + delta)), []);
  return <ReportPending value={report}>{children}<NavigationProgress active={pending > 0} label={loading} /></ReportPending>;
}

// Creeps towards the end while the page loads, runs to the end when it arrives, then fades.
function NavigationProgress({ active, label }: { active: boolean; label: string }) {
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
  return <div className="navigation-progress" data-phase={phase} role="status" aria-live="polite">
    <span aria-hidden="true" /><span className="navigation-sr-only">{phase === 'loading' ? label : ''}</span>
  </div>;
}

function PendingReporter() {
  const { pending } = useLinkStatus();
  const report = useContext(ReportPending);
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
