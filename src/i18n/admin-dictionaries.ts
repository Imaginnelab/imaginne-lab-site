import 'server-only';
import type { Locale } from './config';

// Texts of the admin dashboard. Same mould as dictionaries.ts: the English file defines the
// shape and the other two must match it.
export type AdminDictionary = typeof import('../../messages/admin/en.json');

const dictionaries: Record<Locale, () => Promise<AdminDictionary>> = {
  en: () => import('../../messages/admin/en.json').then((module) => module.default),
  pt: () => import('../../messages/admin/pt.json').then((module) => module.default),
  es: () => import('../../messages/admin/es.json').then((module) => module.default),
};

export const getAdminDictionary = (locale: Locale): Promise<AdminDictionary> => dictionaries[locale]();
