import type { Locale } from '@/i18n/config';

export type ProductDTO = {
  id: string;
  name: string;
  description: string;
  price: string | null;
  photos: string[];
  modelUrl: string | null;
  modelBytes: number | null;
  featured: boolean;
};
export type ProductPage = {
  items: ProductDTO[];
  offset: number;
  hasMore: boolean;
  featuredId: string | null;
  term: string;
};
export type PageInput = { locale: Locale; term?: string; offset?: number; featuredId?: string | null };
export type PageResult = { ok: true; page: ProductPage } | { ok: false };
