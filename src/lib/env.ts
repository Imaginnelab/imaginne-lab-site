// Public Supabase settings. Both values are meant for the browser (the publishable key only
// grants what row level security allows), so they have defaults; a secret key never goes here.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xdinubduvlxattlpjrvu.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_qIxpMXDigpJw7tgsFwWfxQ_uPvqM3Ar';