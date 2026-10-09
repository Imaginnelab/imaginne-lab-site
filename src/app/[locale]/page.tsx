import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  return (
    <main className="wrap" style={{ padding: '6rem 0' }}>
      <h1 className="heading">{t.metadata.title}</h1>
    </main>
  );
}