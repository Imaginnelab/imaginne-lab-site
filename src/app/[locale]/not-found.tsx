import { getDictionary } from '@/i18n/dictionaries';
import { LocalizedNotFound } from '@/components/site/LocalizedNotFound';

export default async function NotFoundPage() {
  const [en, pt, es] = await Promise.all([getDictionary('en'), getDictionary('pt'), getDictionary('es')]);
  const select = (t: typeof en) => ({
    error: t.notFound, language: t.site.language, theme: t.site.theme, brand: t.site.brand.name,
  });
  return <LocalizedNotFound copies={{ en: select(en), pt: select(pt), es: select(es) }} />;
}
