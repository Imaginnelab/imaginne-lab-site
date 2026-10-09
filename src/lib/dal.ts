import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type CurrentUser = { id: string; email: string | null; fullName: string | null; isAdmin: boolean };

// The signed-in user, verified with the auth server (never trusted from the cookie alone),
// with the profile row that says whether they are an administrator. One lookup per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, is_admin')
    .eq('id', data.user.id)
    .maybeSingle();
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    // Display only: the name typed at sign-up is the fallback. It is editable by the user, so
    // it never takes part in any permission decision.
    fullName: profile?.full_name ?? metadataName(data.user.user_metadata) ?? null,
    isAdmin: profile?.is_admin === true,
  };
});

function metadataName(metadata: unknown): string | null {
  if (typeof metadata !== 'object' || metadata === null) return null;
  const { full_name: fullName, name } = metadata as Record<string, unknown>;
  const value = typeof fullName === 'string' && fullName.trim() ? fullName : name;
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 100) : null;
}

// For Server Actions and admin pages: the administrator, or null. Callers must stop on null.
export async function getAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.isAdmin ? user : null;
}

// Whether the site is under maintenance. Unknown counts as "off": a failed read must not be
// what takes the site down (the database itself hides products while it is on).
export const isUnderMaintenance = cache(async (): Promise<boolean> => {
  // Local visual checks only: lets the pages render for a visitor on a developer machine. It is
  // ignored on Vercel, and the database keeps hiding products from non-administrators anyway.
  if (process.env.E2E_SKIP_MAINTENANCE === '1' && process.env.VERCEL !== '1') return false;
  const supabase = await createClient();
  const { data } = await supabase.from('site_settings').select('maintenance_mode').eq('id', true).maybeSingle();
  return data?.maintenance_mode === true;
});