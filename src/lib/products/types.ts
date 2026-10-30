import type { Locale } from '@/i18n/config';
import type { SpecificationField } from './specifications';
import type { ProductColorOption } from './colors';

export type ProductDTO = {
  id: string;
  name: string;
  description: string;
  price: string | null;
  priceCents: number | null;
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
export type CartProductDTO = ProductDTO & { colors: ProductColorOption[]; stockQuantity: number | null };
export type ProductsResult = { ok: true; products: CartProductDTO[] } | { ok: false };
export type ProductDetailDTO = ProductDTO & {
  colors: ProductColorOption[];
  specifications: Record<SpecificationField, string>;
  widthCm: number | null; heightCm: number | null; depthCm: number | null;
  weightGrams: number | null; stockQuantity: number | null;
};
export type ProductResult = { ok: true; product: ProductDetailDTO | null } | { ok: false };
