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
    fullName: profile?.full_name ?? null,
    isAdmin: profile?.is_admin === true,
  };
});

// For Server Actions and admin pages: the administrator, or null. Callers must stop on null.
export async function getAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.isAdmin ? user : null;
}

// Whether the site is under maintenance. Unknown counts as "off": a failed read must not be
// what takes the site down (the database itself hides products while it is on).
export const isUnderMaintenance = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.from('site_settings').select('maintenance_mode').eq('id', true).maybeSingle();
  return data?.maintenance_mode === true;
});