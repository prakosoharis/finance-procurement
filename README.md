# Procurement P&L Intelligence Dashboard

Full-stack rebuild of the Berau Coal Energy procurement P&L dashboard, per
[`Procurement_Dashboard_TechSpec_2026-08-24.html`](./Procurement_Dashboard_TechSpec_2026-08-24.html)
and the reference package in `Procurement_Dashboard_2026-08-24.zip`.

**Stack:** Next.js 15 (App Router) · TypeScript · Neon Postgres + Drizzle ORM · Auth.js (NextAuth v4) ·
Zustand · TanStack Query · Chart.js · Tailwind CSS.

## Deviations from the original tech spec

The tech spec was written around Supabase. This build uses **Neon** for Postgres instead, which changes
a few things:

| Concern | Tech spec (Supabase) | This build (Neon) |
|---|---|---|
| Database | Supabase Postgres | Neon Postgres — same schema, same generated columns |
| Auth | Supabase Auth | Auth.js v4, Credentials provider, bcrypt password hashes, JWT sessions |
| Authorization | Postgres RLS (`auth.uid()`) | Enforced in the API layer (`src/lib/rbac.ts`) — Neon has no `auth.uid()` equivalent |
| File storage | Supabase Storage | Not wired up yet — uploaded files are parsed in memory and discarded (raw file retention is a follow-up, see below) |
| Realtime FX broadcast | Supabase Realtime | Dropped — FX rates just poll every 5 min via TanStack Query, which was already the spec'd refresh interval |

## What's implemented

- Auth + RBAC (admin / manager / viewer), login page, protected `/dashboard/*` routes
- Full DB schema (12 tables → 11 here; Supabase's implicit `auth.users` is now our own `users` table) with
  the same generated columns (`net_value_creation`, `roi_pct`, `value_to_sum_pct`)
- Tabs: Actual vs Target, P&L + ROI Report, Charts (BCG-style dual panel), BI FX Rates, Peer Parity, AI Assistant, Permissions (admin)
- XLSX upload → parse → upsert into `pnl_data` + `cost_components`, with the "Combine" division computed on read (never stored)
- AI Assistant proxied server-side to Anthropic, with a deterministic offline fallback when `ANTHROPIC_API_KEY` isn't set
- Live FX rate fetch (open.er-api.com) with 5-minute cache

## Not implemented yet (scoped out of this pass)

- YoY Comparison and Ratio-to-Revenue/GP tabs
- Excel / PDF / PowerPoint export (the tech spec's `xlsx-js-style` / `jsPDF` / `pptxgenjs` libraries are installed but not wired to a route yet)
- 9-theme switcher and per-user dashboard preferences persistence (the `dashboard_preferences` table exists, nothing writes to it yet)
- Raw uploaded file retention in blob storage
- Transactional invite emails (new users get a temp password returned once in the API response — relay it out-of-band)

## Local development

### Option A — Docker (recommended, matches production)

```bash
cp .env.example .env.local   # fill in DATABASE_URL etc. — see below
docker compose up --build
```

App runs at http://localhost:3000 with hot reload (source is bind-mounted).

### Option B — Node directly

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `DATABASE_URL` — from your Neon project dashboard (neon.tech → your project → Connection Details).
  Use the **pooled** connection string.
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `ANTHROPIC_API_KEY` — optional; without it the AI Assistant tab falls back to a deterministic offline summary
- `FX_API_URL` — optional, defaults to open.er-api.com

### Database setup (first time)

```bash
npm run db:migrate   # applies drizzle/0000_*.sql to your Neon database
npm run db:seed      # seeds divisions, periods, benchmark peers, and one admin user
```

The seed script prints the admin login (email/password) to the console once — set `ADMIN_EMAIL` /
`ADMIN_PASSWORD` env vars beforehand if you want to control them instead of getting a random password.

## Deploying

1. Push this repo to GitHub.
2. In the Vercel dashboard, import the GitHub repo (Vercel's GitHub App auto-deploys on every push to `main`
   and creates preview deployments for PRs — no Vercel CLI needed).
3. In Vercel → Project → Settings → Environment Variables, set the same variables as `.env.example`
   (`DATABASE_URL` pointing at your Neon **production** branch, `NEXTAUTH_URL` set to your Vercel domain,
   `NEXTAUTH_SECRET`, `ANTHROPIC_API_KEY`).
4. Run `npm run db:migrate` once against the production `DATABASE_URL` (from your machine, or a one-off
   CI job) before the first deploy serves traffic.

## Project layout

```
src/
  app/
    login/                 — sign-in page
    dashboard/              — protected shell + one folder per tab
    api/                    — route handlers (pnl, fx, users, ai, peers, auth)
  components/dashboard/     — Shell, FilterBar, KpiCard, charts, upload dialog, report card
  lib/
    db/                     — Drizzle schema + lazy Neon client
    queries/pnl.ts          — RBAC-scoped P&L query + Combine-division aggregation
    auth.ts, rbac.ts        — Auth.js config, role/division guards
    calculations.ts         — cost component defs, NVC/ROI derivation, ROI benchmarks
    xlsx-parser.ts          — Database-sheet parser for the upload flow
  store/                    — Zustand: filters (division/year/quarter/currency), UI state
  hooks/                    — TanStack Query hooks per resource
scripts/                    — migrate.ts, seed.ts
drizzle/                    — generated SQL migrations
```
