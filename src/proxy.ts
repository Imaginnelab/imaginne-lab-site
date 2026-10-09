import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale } from '@/i18n/config';
import { refreshSession } from '@/lib/supabase/proxy';

// Routing by language. English has no prefix: /products/ is served by /en/products/ behind the
// scenes, and /en/... is sent to the clean address. /pt/ and /es/ pass straight through.
function localeResponse(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const first = pathname.split('/')[1] ?? '';
  if (first === defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(defaultLocale.length + 1) || '/';
    return NextResponse.redirect(url, 308);
  }
  if (isLocale(first)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.rewrite(url);
}

export async function proxy(request: NextRequest) {
  const response = localeResponse(request);
  // A response that carries a refreshed session must never be stored by a shared cache.
  if (request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-'))) {
    await refreshSession(request, response);
    response.headers.set('Cache-Control', 'private, no-store');
  }
  return response;
}

export const config = {
  // Pages only: skip Next internals, API routes and anything with a file extension.
  matcher: ['/((?!api|_next|_vercel|assets|.*\\..*).*)'],
};