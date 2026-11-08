import 'server-only';
import type { Locale } from './config';

export type OrderDictionary = typeof import('../../messages/orders/en.json');
const dictionaries: Record<Locale, () => Promise<OrderDictionary>> = {
  en: () => import('../../messages/orders/en.json').then((module) => module.default),
  pt: () => import('../../messages/orders/pt.json').then((module) => module.default),
  es: () => import('../../messages/orders/es.json').then((module) => module.default),
};
export const getOrderDictionary = (locale: Locale) => dictionaries[locale]();
