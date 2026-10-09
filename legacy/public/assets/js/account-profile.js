export function fullName(profile, user) {
  return [profile?.full_name, user?.user_metadata?.full_name, user?.user_metadata?.name]
    .find(value => typeof value === 'string' && value.trim())?.trim() || '';
}

export function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const letters = Array.from(parts[0]);
  return (parts.length > 1
    ? letters[0] + Array.from(parts[parts.length - 1])[0]
    : letters.slice(0, 2).join('')).toLocaleUpperCase();
}

export async function readProfile(client, userId) {
  const { data, error } = await client.from('users')
    .select('full_name,isadmin:is_admin').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}
