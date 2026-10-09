import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { htmlLang, isLocale, locales } from '@/i18n/config';
import { getDictionary } from '@/i18n/dictionaries';
import '@/styles/styles.css';

// The site always opens in the light theme; dark is only used when the visitor chose it with
// the toggle (remembered in localStorage). Runs before the first paint, so there is no flash.
const themeScript = `(function(){var t='light';try{if(localStorage.getItem('imaginne-theme')==='dark')t='dark'}catch(e){}document.documentElement.setAttribute('data-theme',t)})()`;
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