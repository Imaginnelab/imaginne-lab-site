import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { htmlLang, isLocale, locales } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import '@/styles/styles.css';
import '@/styles/navigation.css';
import { NavigationProvider } from '@/components/navigation/NavigationLink';
import { PREPAINT_SCRIPT_SRC } from '@/lib/site/prepaint';

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getDictionary(locale);
  return { title: t.metadata.title, icons: { icon: '/assets/img/logo-icon.svg' } };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);
  return (
    <html lang={htmlLang[locale]} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script src={PREPAINT_SCRIPT_SRC} async />
      </head>
      <body><NavigationProvider loading={t.navigation.loading}>{children}</NavigationProvider></body>
    </html>
  );
}
