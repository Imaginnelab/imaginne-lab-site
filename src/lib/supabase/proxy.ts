import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/env';

// Refreshes an expiring session and writes the new cookies on the response that is already
// going out. It decides nothing about access: every page and action checks for itself.
export async function refreshSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  // getClaims validates the token and refreshes it when needed.
  await supabase.auth.getClaims();
  return response;
}