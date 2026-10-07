# Imaginne Lab

Marketing site for Imaginne Lab, a 3D printing studio (miniatures, home
organization, personalized gifts). Static HTML/CSS/JS, no build step,
localized in English (default), Portuguese, and Spanish.

**Live:** https://imaginne-lab-site.vercel.app

## Structure

```
public/            deployed site (Vercel outputDirectory)
  index.html         English (default, served at /)
  pt/index.html       Portuguese
  es/index.html       Spanish
  assets/
    css/styles.css   design system + all page styles
    js/main.js       theme toggle, mobile nav, scroll-reveal
    fonts/           self-hosted Outfit + DM Mono (woff2)
    icons/           Phosphor icon SVGs (inlined in HTML)
    img/             logos and product photography
  robots.txt
  sitemap.xml

source-assets/      original files as provided by the client (logos, photos),
                    not part of the deployed site
scripts/            local tooling (dev server)
```

## Local development

No dependencies to install. Requires only Node.js.

```
npm run dev
```

Serves `public/` at http://127.0.0.1:3000 with automatic browser reload when files change. The reload client is injected only in local responses; files in `public/` and deployed output are unchanged. If port 3000 is occupied, use `npm run dev -- 3001`; `npm run dev -- 0` selects a free port and prints its URL. The server binds to loopback only.

## Editing content

- All three languages share the same structure and the same
  `assets/` folder. When changing copy or styling, update
  `index.html`, `pt/index.html`, and `es/index.html` together to
  keep them in sync.
- Paths in HTML are root-relative (`/assets/...`), which is why
  `pt/index.html` and `es/index.html` can reference the same
  `public/assets/` folder without adjustment.

## Authentication setup

The shared login/registration dialog is loaded on all three homepages.
Set `url` and `publishableKey` in `public/assets/js/auth-config.js` to the
Supabase project URL and public publishable (or legacy anon) key. Never put
a service role or secret key in public files. The browser loads the pinned
Supabase JS SDK from esm.sh; network access to that host is required.

Enable email/password authentication in Supabase. Configure the Site URL
and allow the `/`, `/pt/`, and `/es/` confirmation redirect URLs for production
and local development. Test both email-confirmation and immediate-session flows.

Registration sends the name as `options.data.name` (`raw_user_meta_data->>'name'`
in SQL). The existing database trigger must read that key to populate
`public.users`. No trigger or table schema is present in this repository, so
automatic profile creation must be verified against the deployed database.
Password confirmation stays in the browser and is never submitted.

Manual checks: open and switch forms in each locale; test mismatched passwords,
invalid credentials, email confirmation, reload/session persistence, sign out,
keyboard Tab/Esc, close button, and mobile/light/dark layouts.

Account profiles read `public.users(id, full_name, is_admin)`, where `id` matches
the Auth user ID. Allow authenticated users to SELECT their own row through RLS.
Keep `is_admin` protected from user INSERT/UPDATE (including through signup
metadata or a profile-edit policy). Only a trusted backend/database operator
should grant admin rights. The UI never trusts user metadata for admin status.
The `/admin/` page is a public shell with no protected data. It requests the
dashboard through `/api/admin-dashboard`, which verifies the bearer token with
Supabase Auth and checks `users.is_admin === true` on the server for every request.
Missing/invalid sessions return 401; non-admins return 403. The browser redirects
these visitors to the homepage, including when opening the URL directly.
The local server and Vercel Function share `server/admin-dashboard.cjs`.
Restart the local server after changing its code. Node.js 20+ is required.
Production can override the public project defaults with `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY`. Do not cache these API responses. Future admin
endpoints must enforce the same authorization before accessing protected data.
No database policies were changed here; protecting writes to `is_admin` is required.

## Deployment

Connected to Vercel via GitHub: pushing to `main` deploys automatically.
`vercel.json` points Vercel at `public/` as the site root.

To deploy manually:

```
vercel --prod
```
