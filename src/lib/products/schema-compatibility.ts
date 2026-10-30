import { specificationColumns } from './specifications';

// Retry only when an optional product column is absent. Authorization and network errors
// must keep failing, with the same session and RLS on every request.
export function missingProductSpecifications(error: { code?: string; message?: string } | null): boolean {
  return !!error && ['42703', 'PGRST204'].includes(error.code ?? '') &&
    specificationColumns.split(',').some((column) => new RegExp(`\\b${column}\\b`).test(error.message ?? ''));
}
