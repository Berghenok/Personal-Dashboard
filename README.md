# Personal OS

A responsive personal productivity dashboard for university, running, strength training, tasks, calendar and planning. It is a single Next.js app. Local development uses SQLite; cloud mode uses Supabase Auth and Supabase Postgres.

## Run locally

Requirements: Node.js 20 or newer and npm.

```powershell
cd "C:\Users\bergh\Desktop\Blackbox\Projekter\Codex\Running Dashboard\personal-os"
npm install
Copy-Item .env.example .env
npm run db:migrate
npm run dev
```

Open <http://localhost:3000>. The local workspace uses `prisma/dev.db` and does not need a Supabase account. Stop the server with `Ctrl+C`. `npm run build` chooses the SQLite Prisma schema for a local `file:` URL and the PostgreSQL schema when `DATABASE_URL` is a PostgreSQL URL.

Use **Settings → Load sample data** to explore the dashboard. Example records have a `[SAMPLE]` label and can be removed without deleting other records.

## Mobile app and PWA

The dashboard uses a touch-friendly bottom tab bar on phones, a compact overflow menu for Calendar/Insights/Settings, safe-area padding, and responsive charts/forms. It has a web manifest, Personal OS app icons, iPhone launch artwork, and a service worker.

Install from the deployed HTTPS site:

- **iPhone/iPad:** open the site in Safari, tap **Share**, then **Add to Home Screen**. Launch Personal OS from its new home-screen icon.
- **Android:** open the site in Chrome, tap the browser menu, then **Install app** or **Add to Home screen**.
- **Desktop:** use the browser's install icon or menu when offered.

The service worker caches only versioned Next.js assets and app artwork. It never caches signed-in pages, forms, exports or database responses. The app requires a network connection to load and save records; full offline use is not implemented or claimed. Cross-device updates read the shared database on navigation, when the app returns to the foreground, and at a one-minute refresh interval.

## Supabase cloud mode

Cloud mode requires a Supabase project. Without Supabase settings the existing local SQLite mode remains available. Do not add secrets to source control.

1. Create a Supabase project and copy its **Project URL** and **publishable key** from the project API settings.
2. In Supabase SQL Editor, create the dedicated Prisma database role. Choose a unique password and keep it in a password manager:

   ```sql
   create user "prisma" with password 'choose-a-strong-password' bypassrls createdb;
   grant "prisma" to "postgres";
   grant usage, create on schema public to "prisma";
   grant all on all tables in schema public to "prisma";
   grant all on all sequences in schema public to "prisma";
   alter default privileges for role "prisma" in schema public grant all on tables to "prisma";
   alter default privileges for role "prisma" in schema public grant all on sequences to "prisma";
   ```

   Prisma uses a server-only database role, so it can run its schema and data queries. The app validates each Supabase user and scopes every data operation by that user's ID. RLS policies in the migration separately protect direct Supabase Data API access; never give this Prisma database password to a browser.

3. Copy the Supabase Postgres connection strings from **Connect**, changing the username to `prisma.<project-ref>` and using the password from step 2. Use a **transaction-mode pooler** URL (port `6543`) for `DATABASE_URL` on Vercel, with `pgbouncer=true&connection_limit=1` in the query string. Use a **session-mode pooler** URL (port `5432`) for `DIRECT_URL`, which Prisma uses for migrations. URL-encode special characters in the database password.
4. Configure these values in `.env` locally, or in Vercel Project → Settings → Environment Variables:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
   NEXT_PUBLIC_SITE_URL="https://your-app.vercel.app"
   DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
   DIRECT_URL="postgresql://...pooler.supabase.com:5432/postgres"
   ```

   The publishable key is intended for browser-facing Auth setup. The database URLs are secrets and must remain server-side. Never use a Supabase `service_role` key in the browser.

5. In Supabase **Authentication → URL Configuration**, set the Site URL to your app URL and add `https://your-app.vercel.app/auth/callback` as a redirect URL. For local account testing also allow `http://localhost:3000/auth/callback` and set `NEXT_PUBLIC_SITE_URL="http://localhost:3000"`.
6. Apply the cloud schema once against the new, empty Supabase database:

   ```powershell
   npm run db:deploy
   ```

   For local development against Supabase, first run `node scripts/prisma-generate.mjs` after setting the cloud `DATABASE_URL`; this selects and generates the PostgreSQL Prisma client.

   This PostgreSQL migration creates the application tables and enables owner policies for Supabase's Data API. The browser uses Supabase Auth only; application records are read and changed through server-side Prisma actions that verify the signed-in user and filter by that user's ID. Authenticated HTML and exports are marked `private, no-store`.

7. Deploy the `personal-os` directory as a Next.js project on Vercel and add the environment variables above for Production and Preview. Vercel detects the Next.js framework; use Node.js 20 or newer. After changing environment variables, redeploy.
8. Open the deployed URL, create an account, and confirm the email if Supabase email confirmation is enabled. Sign in on the same account on desktop and phone to use the same cloud records.

The first cloud account starts with an empty profile. Existing SQLite records are **not automatically copied** into Supabase; export them from Settings before switching databases. Cloud authentication and database access cannot be exercised without credentials for a real Supabase project.

## Features

- **Overview:** academic average, upcoming deadlines, tasks, goals and recent activity.
- **University:** modules, weighted assessments, grade projections, academic-year selection and comparison.
- **Fitness:** run history, pace and distance analytics, race bests, strength logging and workout templates.
- **Tasks and Calendar:** linked assignments, run plans, tasks and personal calendar items.
- **Insights:** optional OpenAI planning helper. Add `OPENAI_API_KEY` and optionally `OPENAI_MODEL` to `.env`; keys remain server-side.
- **Settings:** profile, goals, units, theme, sample data and full JSON/CSV export.

## Checks

```powershell
npm run typecheck
npm run test
npm run build
```

Tests cover grade calculations, pace/distance calculations, database persistence/cascades and invalid form data. The PostgreSQL schema can be validated with `npx prisma validate --schema prisma/postgresql/schema.prisma` after setting `DATABASE_URL` and `DIRECT_URL`.

## Project layout

```text
app/                         Pages, auth callback, manifest and export route
components/                  Desktop/mobile navigation, charts and PWA controls
lib/                         Prisma access, auth clients, calculations and actions
prisma/schema.prisma         Local SQLite schema and migrations
prisma/postgresql/            Supabase Postgres schema, RLS and cloud migration
public/sw.js                  Static-asset-only service worker
tests/                        Calculation and persistence tests
```
