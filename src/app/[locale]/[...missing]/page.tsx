import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  return { title: t.notFound.title, description: t.notFound.lede, robots: { index: false, follow: false } };
}

// Keep missing routes outside the site group: MaintenanceGate must not replace the 404.
export default function MissingPage() {
  notFound();
}
