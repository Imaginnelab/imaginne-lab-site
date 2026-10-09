import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { htmlLang, isLocale, locales } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import '@/styles/styles.css';

// Sets the theme before the first paint, so a dark-mode visitor never sees a light flash.
const themeScript = `(function(){try{var s=localStorage.getItem('imaginne-theme');document.documentElement.setAttribute('data-theme',s||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'))}catch(e){}})()`;

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
  return (
    <html lang={htmlLang[locale]} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}