import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getAdminDictionary } from '@/i18n/admin-dictionaries';
import { isLocale, localePath } from '@/i18n/config';
import { getAdmin } from '@/lib/dal';
import '@/styles/admin.css';

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  // Not even the title of the dashboard goes out with the redirect of a visitor.
  if (!isLocale(locale) || !(await getAdmin())) return { robots: { index: false, follow: false } };
  const t = await getAdminDictionary(locale);
  return { title: `${t.title} · ${t.brand}`, robots: { index: false, follow: false } };
}

// The dashboard is only ever rendered for an administrator. Anyone else is sent to the home
// page of their language before a single byte of it leaves the server. This is the page's
// own lock; every read and every action behind it checks again for itself.
export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (!(await getAdmin())) redirect(localePath(locale));
  return <>{children}</>;
}
