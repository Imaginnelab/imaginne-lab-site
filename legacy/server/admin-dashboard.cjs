// Both the local preview server and Vercel use this authorization boundary.
// These defaults are public credentials, never a service-role key.
const supabaseUrl = process.env.SUPABASE_URL || 'https://xdinubduvlxattlpjrvu.supabase.co';
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_qIxpMXDigpJw7tgsFwWfxQ_uPvqM3Ar';

module.exports = async function adminDashboard(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Vary', 'Authorization');
  const respond = (code, body) => { res.statusCode = code; res.end(JSON.stringify(body)); };
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return respond(405, { error: 'method_not_allowed' });
  }
  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !/^Bearer \S+$/.test(authorization)) {
    return respond(401, { error: 'unauthorized' });
  }
  const headers = { apikey: publicKey, Authorization: authorization };
  try {
    // Verify the token with Auth; never trust a user ID, role, or hash from the browser.
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers, signal: AbortSignal.timeout(10000),
    });
    if (!authResponse.ok) return respond(authResponse.status >= 500 ? 503 : 401, { error: 'unauthorized' });
    const user = await authResponse.json();
    if (!user.id) return respond(401, { error: 'unauthorized' });
    const query = new URLSearchParams({ select: 'full_name,isadmin:is_admin', id: `eq.${user.id}`, limit: '1' });
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/users?${query}`, {
      headers, signal: AbortSignal.timeout(10000),
    });
    if (!profileResponse.ok) return respond(503, { error: 'access_check_failed' });
    const rows = await profileResponse.json();
    const profile = rows[0];
    if (profile?.isadmin !== true) return respond(403, { error: 'forbidden' });
    return respond(200, { profile: { full_name: profile.full_name || '', email: user.email || '' } });
  } catch {
    return respond(503, { error: 'access_check_failed' });
  }
};
