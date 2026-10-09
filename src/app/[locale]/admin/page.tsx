import { notFound, redirect } from 'next/navigation';
import { getAdminDictionary } from '@/i18n/admin-dictionaries';
import { isLocale, localePath } from '@/i18n/config';
import { getAdmin } from '@/lib/dal';

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ lang?: string | string[] }> };

// Minimal dashboard page for this phase: the screens come next. `data-admin-root` is what the
// end-to-end tests look for to prove that a visitor never receives the dashboard.
export default async function AdminPage({ params, searchParams }: Props) {
  const [{ locale }, { lang }] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  // Links of the previous site: /admin/?lang=pt is now /pt/admin/.
  if (typeof lang === 'string' && isLocale(lang) && lang !== locale) redirect(localePath(lang, '/admin'));
  // The layout already refuses visitors; a page must not depend on that alone.
  if (!(await getAdmin())) redirect(localePath(locale));
  const t = await getAdminDictionary(locale);
  return (
    <main className="wrap admin-main" data-admin-root>
      <p className="eyebrow">{t.brand}</p>
      <h1 className="heading" id="admin-title">{t.title}</h1>
    </main>
  );
}
