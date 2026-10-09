'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Session events are a hint to re-run the server's permission gate, never authorization.
export function AdminSessionRefresh() {
  const router = useRouter();
  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | null = null;
    const refresh = () => { if (!disposed) router.refresh(); };
    window.addEventListener('focus', refresh);
    void import('@/lib/supabase/client').then(({ createClient }) => {
      if (disposed) return;
      const { data } = createClient().auth.onAuthStateChange((event) => {
        if (event !== 'INITIAL_SESSION') queueMicrotask(refresh);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    }).catch(() => { /* The server keeps checking every action. */ });
    return () => { disposed = true; window.removeEventListener('focus', refresh); unsubscribe?.(); };
  }, [router]);
  return null;
}
