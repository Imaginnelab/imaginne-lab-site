import 'server-only';
import type { Locale } from './config';

// Texts of the account dialog and of the maintenance screen. Same mould as dictionaries.ts:
// the English file defines the shape and the other two must match it.
export type AccountDictionary = typeof import('../../messages/account/en.json');

const dictionaries: Record<Locale, () => Promise<AccountDictionary>> = {
  en: () => import('../../messages/account/en.json').then((module) => module.default),
  pt: () => import('../../messages/account/pt.json').then((module) => module.default),
  es: () => import('../../messages/account/es.json').then((module) => module.default),
};

export const getAccountDictionary = (locale: Locale): Promise<AccountDictionary> => dictionaries[locale]();
