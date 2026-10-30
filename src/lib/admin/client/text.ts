import type { AdminFailure } from '@/lib/admin/schemas';
export const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
export function failureMessage(code: AdminFailure, copy: { forbidden: string; fixErrors: string; saveError: string; duplicate?: string; photoUploadError?: string; schemaMissing?: string }, fallback = copy.saveError) {
  if (code === 'unauthorized') return copy.forbidden;
  if (code === 'invalid') return copy.fixErrors;
  if (code === 'duplicate') return copy.duplicate ?? fallback;
  if (code === 'files') return copy.photoUploadError ?? fallback;
  if (code === 'schema') return copy.schemaMissing ?? fallback;
  return fallback;
}
export function isoToLocal(iso: string | null) {
  const date = new Date(iso ?? NaN);
  if (!iso || Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function localToIso(value: string): string | null | number {
  if (!value.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return NaN;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? NaN : date.toISOString();
}

