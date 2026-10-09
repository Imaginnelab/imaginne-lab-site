import 'server-only';
import type { Locale } from './config';

// The English file defines the shape; the other two must match it (checked by the compiler).
export type Dictionary = typeof import('../../messages/en.json');

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('../../messages/en.json').then((module) => module.default),
  pt: () => import('../../messages/pt.json').then((module) => module.default),
  es: () => import('../../messages/es.json').then((module) => module.default),
};

// Texts are read on the server. A Client Component gets only the strings it needs as props,
// so the dictionaries never travel to the browser whole.
export const getDictionary = (locale: Locale): Promise<Dictionary> => dictionaries[locale]();