'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BackLink } from '@/components/navigation/BackLink';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';

export function ProductLoadError({ locale, copy }: {
  locale: Locale; copy: Pick<Dictionary['store']['detail'], 'loadError' | 'retry' | 'back'>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <div className="wrap product-detail product-error" role="alert">
    <BackLink href={localePath(locale, '/products')} label={copy.back} />
    <h1>{copy.loadError}</h1><button type="button" className="btn btn-primary" disabled={pending} aria-busy={pending}
      onClick={() => start(() => router.refresh())}>{copy.retry}</button>
  </div>;
}
