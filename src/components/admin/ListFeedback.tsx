'use client';
import { useEffect, useRef } from 'react';
type Copy = { loading: string; loadingMore: string; loadError: string; moreError: string; empty: string; noResults: string; retry: string };
export function ListFeedback({ active, size, term, loading, failed, hasMore, more, retry, copy, children }: {
  active: boolean; size: number; term: string; loading: boolean; failed: boolean; hasMore: boolean;
  more: () => Promise<void>; retry: () => Promise<void>; copy: Copy; children: React.ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = sentinel.current;
    if (!active || !element || !hasMore || failed || loading) return;
    if (window.IntersectionObserver) {
      const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) void more(); }, { rootMargin: '220px 0px' });
      observer.observe(element); return () => observer.disconnect();
    }
    let frame = 0;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (element.getBoundingClientRect().top < innerHeight + 220) void more(); }); };
    window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule, { passive: true }); schedule();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [active, hasMore, failed, loading, more]);
  const mode = loading ? 'loading' : failed ? 'error' : hasMore ? 'ready' : 'end';
  return <>
    <div className="products-state" hidden={size > 0}>
      <p role="status">{loading ? copy.loading : failed ? copy.loadError : term ? copy.noResults.replace('{term}', term) : copy.empty}</p>
      <button className="btn btn-ghost btn-sm" type="button" hidden={!failed} disabled={loading}
        aria-busy={loading ? 'true' : undefined} onClick={() => { void retry(); }}>{copy.retry}</button>
    </div>
    {children}
    <div ref={sentinel} className="list-more" data-mode={mode}>
      <span className="list-spinner" aria-hidden="true" />
      <span className="list-more-text" role="status">{size ? loading ? copy.loadingMore : failed ? copy.moreError : '' : ''}</span>
      <button className="btn btn-ghost btn-sm" type="button" hidden={!failed || !size} disabled={loading}
        aria-busy={loading ? 'true' : undefined} onClick={() => { void retry(); }}>{copy.retry}</button>
    </div>
  </>;
}

