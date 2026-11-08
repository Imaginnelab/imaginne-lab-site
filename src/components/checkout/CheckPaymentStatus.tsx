'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function CheckPaymentStatus({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button className="btn btn-primary" type="button" disabled={pending} aria-busy={pending}
    onClick={() => startTransition(() => router.refresh())}>{label}</button>;
}
