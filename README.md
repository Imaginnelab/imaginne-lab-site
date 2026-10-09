# Imaginne Lab

Site of Imaginne Lab, a 3D printing studio (miniatures, home organization,
personalized gifts): the home page, the product catalogue and the admin
dashboard, in English (default), Portuguese and Spanish.

**Live:** https://imaginne-lab-site.vercel.app

## Stack

Next.js 16 (App Router), React 19 and strict TypeScript; Supabase for
accounts, products, coupons and file storage, with the session kept in a
cookie (`@supabase/ssr`); Zod for validation; Vitest and Playwright for tests.

## Structure

```
src/
  app/[locale]/       pages: (site) home and catalogue, admin dashboard
  components/         site shell, catalogue, account dialog, admin screens, 3D
  lib/                data access (dal.ts), Supabase clients, auth, products, admin
  i18n/               locales and dictionary loaders
  styles/             global CSS
  proxy.ts            locale routing and session refresh (Next's middleware)
messages/             texts per language (en, pt, es)
public/assets/        fonts, icons, images and the hero 3D model
supabase/migrations/  database schema, policies and grants
tests-e2e/            Playwright tests
source-assets/        original files as provided by the client; not deployed
```

English is served at the root (`/`, `/products/`); `/pt/` and `/es/` keep
their prefix. Every text comes from `messages/`, read on the server.

## Local development

Requires Node.js 20 or newer.

```
npm install
npm run dev          # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run build` | production build |
| `npm run typecheck` | TypeScript, no output |
| `npm run lint` | ESLint |
| `npm test` | unit tests (Vitest) |
| `npm run test:e2e` | browser tests (Playwright) against a production build on port 4310 |

The signed-in browser tests need an administrator account in
`.env.e2e.local` (`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`; the file is
ignored by Git). Without it they are skipped. They run against the real
database: what they create is named `[E2E] …` / `E2E-…`, is born inactive
and is deleted by the test itself. The catalogue and list tests expect more
than twelve products to exist.

## Accounts and permissions

- Sign-in, sign-up and sign-out are Server Actions; the browser never holds
  a token outside the session cookie.
- `public.users.is_admin` decides who is an administrator. It can only be
  granted in the database, never from sign-up data or from the interface.
- The admin dashboard is rendered only for an administrator: anyone else is
  redirected on the server before any of it is sent.
- Every write goes through a Server Action that checks the caller, validates
  the input with Zod and writes as that user. Row level security and the
  column grants in `supabase/migrations/` are the real authorization; no
  service key is used anywhere.
- Product photos and 3D models are uploaded from the browser straight to
  Supabase Storage. Before a product may use them, the server checks that
  the files exist, have the right type and size, and that a model does not
  reference anything outside its own file.
- Maintenance mode (a switch in the dashboard) closes the site to everyone
  but administrators.

## Deployment

Connected to Vercel through GitHub: pushing to `main` deploys to production,
and other branches get a preview. `vercel.json` selects the Next.js preset.
