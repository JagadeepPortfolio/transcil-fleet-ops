# CLAUDE.md

Orientation file for Claude Code (and any future AI agent) working on this
repo. Read this before making changes — it captures the context and
invariants that are not obvious from the code alone.

> For human-focused setup & scripts, see `README.md`.
> For deep architecture / schema, see `docs/ARCHITECTURE.md`.
> For the 9 rider flows inherited from the Excel template, see `docs/RIDER_FLOWS.md`.
> For the session-by-session log, see `docs/CHANGELOG.md`.

---

## What this project is

**Transcil Fleet Ops** is a Next.js + Supabase web app for **Transcil
Sustainable Services**, an EV fleet operator in Hyderabad. It replaces the
v2.4 Excel template the client used for post-deployment operations
(payments, returns, reminders, lock/unlock, replacements, deposit
lifecycle, dashboard).

It does **not** replace Transcil's legacy third-party fleet platform,
which owns manufacturing, parts, hubs, vehicle assignment, initial
transaction recording, agreement printing, geolocation, and service
tickets. That system keeps running.

### The boundary — memorize this

```
┌─────────────────────────────┐       ┌─────────────────────────────┐
│ Transcil Legacy App         │  CSV  │ Transcil Fleet Ops          │
│ (third-party SaaS,          │ ────▶ │ (this repo — what we build) │
│  Vendor V2407001)           │       │                             │
│                             │       │                             │
│ • Manufacturing, parts      │       │ • Rider profiles (full)     │
│ • Hubs, configurations      │       │ • Deployments (ongoing)     │
│ • Vehicle assignment        │       │ • Weekly payments           │
│ • Initial transaction       │       │ • Returns & replacements    │
│ • Agreement print           │       │ • Overdue + lock queue      │
│ • Geolocation, tracking     │       │ • Reminder-call log         │
│ • Service tickets           │       │ • Deposit lifecycle         │
│                             │       │ • Action board / dashboard  │
└─────────────────────────────┘       └─────────────────────────────┘
      source of truth for                 source of truth for
      vehicle + agreement                 rider + lifecycle
```

**The handoff** is a one-way CSV import from legacy → this app. There is
no write-back, no API, no shared DB. The contract is 8 fields: Rider ID,
Vehicle No, Hub, Agreement Date, Initial Txn No, Initial Amount, Rental
Type, optional Mobile Booking ID.

**Never propose a feature that reaches back into legacy.** Manufacturing,
agreement printing, vehicle lifecycle before deployment — all out of
scope. If a task sounds like it belongs to legacy, push back and confirm
before spending time on it.

### The rider flows — what staff actually does every day

The Excel template codified nine post-deployment events on each
deployment row: PAYMENT, DEPOSIT, DEPOSIT_REFUND, REPLACEMENT, EXTENSION,
RETURN, REMINDER_CALL, LOCK, UNLOCK. All nine are modeled in the DB
schema and in `src/lib/db/activity-log.ts`. See `docs/RIDER_FLOWS.md` for
what's shipped in the UI vs what's still planned.

---

## Tech stack (locked — do not re-litigate)

| Layer            | Choice                                                |
| ---------------- | ----------------------------------------------------- |
| Framework        | Next.js 14 (App Router) + TypeScript                  |
| Styling          | Tailwind **v4** (`@theme inline`) + shadcn/ui on `@base-ui/react` |
| DB               | Supabase Postgres (Mumbai, tz = `Asia/Kolkata`)       |
| Auth             | Supabase Auth (email/password now; MSG91 OTP later)   |
| Storage          | Supabase Storage (4 private buckets)                  |
| Forms            | `react-hook-form` available, but most forms use raw `FormData` + Server Actions |
| Tables           | TanStack Table v8 via `src/components/ui/data-table.tsx` |
| Dates            | `date-fns` + `date-fns-tz`                            |
| Error tracking   | Sentry (wired, DSN optional in `.env`)                |
| Deploy           | Vercel Hobby (manual `npx vercel --prod`)             |

**Explicitly NOT adding:** Drizzle, Prisma, `@tanstack/react-query`,
Moment, Day.js. Generated PostgREST types in `src/lib/db/types.ts` cover
the ORM needs; server components cover client-state-for-server-data.

### Package manager

`pnpm`. Do not `npm install` or `yarn`. The lockfile is `pnpm-lock.yaml`.

---

## Architecture at a glance

```
src/
  app/
    (auth)/login         — public login page + brand hero
    (app)/               — auth-gated shell
      layout.tsx         — double-checks session (middleware is primary gate)
      dashboard/         — KPI cards + alert cards + "most urgent" list
      riders/            — list / new / [id] detail
      deployments/       — list / new / [id] detail (+ activity timeline + S12 dialogs)
      admin/vehicles/    — CMD-only CRUD for vehicle inventory
    api/
      health/            — `{ok:true, ts}` for liveness checks
      search/            — feeds the Cmd+K palette (RLS-filtered)
  lib/
    supabase/            — server + browser + middleware clients
    db/                  — typed query helpers — ALL filter `deleted_at IS NULL`
      activity-log.ts    — ⚠ the single write path for rider events
    validation/          — zod schemas shared by forms + Server Actions
    auth/otp.ts          — MSG91 abstraction (stub impl today)
    env.ts               — zod-validated env at boot
  components/
    shell/               — sidebar, header, command palette, mobile nav
    ui/                  — design-system primitives (badge, card, data-table, form-fields…)
    tables/              — per-entity TanStack Table column defs
    forms/               — shared form fragments
middleware.ts            — refreshes session on every request
supabase/
  migrations/0001..00NN  — the only source of schema truth (0027 at last update)
  seed.sql               — dev fixtures (also runnable via `scripts/seed-dev.mjs`)
scripts/
  seed-dev.mjs           — seeds riders/vehicles/deployments against remote (idempotent)
  smoke-db.mjs           — DB integrity smoke test (view + indexes + RLS)
```

Details live in `docs/ARCHITECTURE.md`.

---

## Critical invariants — DO NOT break these

### 1. Canonical state vs audit trail

`deployments` is canonical state. `activity_log` is history. **Every
activity_log insert must update the corresponding deployment columns in
the same call.** This is enforced by `logActivityEvent()` in
`src/lib/db/activity-log.ts`. Direct inserts into `activity_log` from a
component or Server Action are forbidden.

The mapping table lives in the docblock at the top of
`src/lib/db/activity-log.ts`. When adding a new event type, update both
the switch in that file and `docs/RIDER_FLOWS.md`.

### 2. "In Use" is derived, not stored

A vehicle is **In Use** iff it has an ACTIVE, non-deleted deployment — never
stored, so it can't drift. The concurrency guard is the partial unique index
`deployments_active_vehicle_uniq` (migration 0004). **Do not add a stored column
that duplicates In-Use/availability.**

`vehicles.service_status` (migration 0041, CMD-only) is **not** that duplicate:
it's a manual condition for **idle** vehicles only — `Available` (default),
`Under Repair`, `In Factory`. The effective status shown = In Use (if active
deployment) **else** `service_status`. A vehicle is offered for a new deployment
only when it has **no active deployment AND `service_status='Available'`**
(see `listAvailableVehicles`). Never let `service_status` say "In Use" or be set
on a deployed vehicle to mean availability — that's the drift the rule forbids.

### 3. One ACTIVE deployment per rider

Same pattern — `deployments_active_rider_uniq` partial index. A rider
cannot be on two vehicles at once. A racing second `createDeployment`
call fails with a clean Postgres 23505 error, which the form surfaces
as a friendly message.

### 4. IST, not UTC

Bare `CURRENT_DATE` in Postgres flips at **05:30 IST** — a real bug for
the night shift. Always use
`(CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date` in views and queries.
See `deployments_enriched` in migration 0007 for the pattern.

### 5. Payment validation — txn ID gates the money

`deployment_totals` only sums PAYMENT/DEPOSIT rows where
`transaction_id IS NOT NULL` (the "verified to count" rule, mirroring the
v2.4 Excel template audit safeguard). Do not "fix" this by removing the
`IS NOT NULL` filter.

As of migration 0024+ the txn ID is **mandatory in the UI** for payment &
deposit (`paymentSchema`/`depositSchema` in
`src/lib/validation/activity.ts`), so every entry carries a reference and
counts — the DB filter is retained as the safeguard.

Balance/Total Paid (migration 0025): `total_due = rent + deposit_required`;
`deployments_enriched` exposes `total_paid = rent paid + deposit collected`
and `balance = total_due − total_paid − deposit_collected`, so a deployment
with rent + deposit fully collected reads PAID / ₹0. `deployment_totals`
still keeps rent and deposit separate — the fold happens only in the view.

### 6. Migrations are the only source of schema truth

Do NOT edit tables via the Supabase Studio SQL editor. Every schema
change is a new migration file. See `README.md` for the command
sequence.

### 7. Soft deletes only

Every core table has `deleted_at timestamptz` (nullable). Every query
helper in `src/lib/db/*.ts` filters `WHERE deleted_at IS NULL`. Views do
the same. There is no UI to delete rows yet — when it lands, it's a
one-line Server Action, not a query audit.

### 8. `pnpm`, not `npm`

Use `pnpm install`, `pnpm add`, `pnpm dev`. The `package.json` scripts
assume pnpm.

### 9. `dbUuid()`, not `z.string().uuid()`

Zod v4's `.uuid()` enforces strict RFC 4122 version/variant bits and
rejects synthetic seed UUIDs (e.g. `20000000-0000-0000-0000-000000000005`).
Always use the `dbUuid()` helper from `src/lib/validation/helpers.ts`
for any UUID form field. It validates the 8-4-4-4-12 hex format without
checking version/variant — the DB enforces the real FK constraint.

### 10. Post-foundation patterns (sessions 17+) — see `docs/ARCHITECTURE.md`

These are load-bearing and easy to break; details in ARCHITECTURE.md:

- **Money/balance (0025):** `total_paid = rent + deposit collected`;
  `balance = total_due − rent − deposit collected`. `rate_inr` is always ₹/week
  (Monthly stores the weekly-equivalent ₹1625). Txn ID is **mandatory** on
  payment & deposit; the `transaction_id IS NOT NULL` count-filter stays (#5).
- **Audit actor (0023):** `created_by_name` is snapshotted by a SECURITY DEFINER
  trigger on activity_log/riders/vehicles — never resolve names via app_users
  join (RLS blocks cross-user reads).
- **Deployment code (0021):** `DEP-<deploy_year>-N`, trigger-assigned, immutable
  after creation (editing the date won't renumber it).
- **`deployments_enriched` uses `d.*`** → adding a deployments column requires
  **recreating the view** (Postgres freezes the column list). See 0021/0025.
- **Vehicles screen:** viewable by all roles; **adding** a vehicle is allowed for
  all authenticated users (migration 0039 — RLS `vehicles_insert_all`; the new
  page no longer self-gates). **Edit/delete remain CMD-only** via per-page
  `getCurrentRole()` (`src/lib/auth/role.ts`) + RLS. The `(app)/admin` layout is
  no longer blanket CMD-only — new admin pages must self-gate.
- **Deploy/region:** single Vercel region `bom1` (`vercel.json`) co-located with
  Supabase; deploy is manual `npx vercel --prod` (no Git auto-deploy).

---

## Where to find things (common questions)

| Question | Answer |
| --- | --- |
| How does auth work? | Middleware refreshes the session on every request; `(app)/layout.tsx` is a belt-and-braces check. Signing out is a Server Action in `src/components/shell/header.tsx`. |
| How does the status-pill color system work? | `src/components/ui/badge.tsx` defines CVA variants; domain wrappers `ActionBadge`/`PayStatusBadge`/`DeploymentStatusBadge`/`LockStatusBadge` map domain enums to variants. Single source of truth — editing this file propagates to every screen. |
| How does the command palette work? | `src/components/shell/command-palette.tsx` — global Cmd+K, lazy-fetches `/api/search`, filters in memory. Called from `(app)/layout.tsx`. |
| Where are the TanStack Table columns defined? | `src/components/tables/*.tsx` — one file per entity. They wrap `<DataTable>`. |
| How do I add a Server Action mutation? | Same file as the form. Use `"use server"` inline (or a sibling `actions.ts` for sets of related actions). Validate with zod → call the relevant db helper → `revalidatePath()`. See `src/app/(app)/deployments/[id]/actions.ts` for a reference implementation. |
| Why does `pnpm db:push` need a password? | Supabase CLI caches it after the first run. Password is set in the dashboard. |
| Where's the CMD user seed? | Migration `0011_seed_cmd_user.sql`. Email `cmd@transcil.local`, password documented in `README.md` — change it on first login. |
| Why is `role_hub_check` missing? | Migration 0012 drops it. Reason: the `handle_new_user` trigger inserts a baseline `app_users` row with no hub_id, which fought the constraint. RLS already makes un-hubbed staff harmless because `current_user_hub_id()` returns NULL and hub-scoped policies filter NULL comparisons out. |

---

## Task cookbook

Common tasks, with the files to touch.

### Add a new rider-flow event type (e.g., EXTENSION write UI)

1. Zod schema in `src/lib/validation/activity.ts`
2. Server Action in `src/app/(app)/deployments/[id]/actions.ts` — parse,
   call `logActivityEvent`, `revalidatePath`
3. Dialog in `src/app/(app)/deployments/[id]/event-dialogs.tsx` — copy
   the shape of `PaymentDialog`
4. Add the button to the `EventDialogs` action bar
5. Update `docs/RIDER_FLOWS.md` — flip the status column from ❌ to ✅
6. Add a smoke test line to `docs/SMOKE_TESTS.md`

### Add a new schema column

1. `pnpm db:new <description>` → `supabase/migrations/00NN_*.sql`
2. Write the SQL (add column, backfill if needed, update `deployments_enriched` view)
3. `pnpm db:push`
4. `pnpm db:types` (regenerates `src/lib/db/types.ts`)
5. Commit both the `.sql` and the regenerated `types.ts`
6. Update query helpers in `src/lib/db/*.ts`
7. Update zod validation if it's part of a form
8. Update `docs/ARCHITECTURE.md` if it changes an invariant

### Add a new admin page (CMD-only)

1. New route under `src/app/(app)/admin/<name>/page.tsx`
2. Check role in the page — the `(app)/admin/layout.tsx` gate will
   handle this once it exists, for now read `current_user_role()` or
   check in the page itself
3. Add to `src/components/shell/sidebar.tsx` with `cmdOnly: true`
4. Add to the Cmd+K palette's static nav in
   `src/components/shell/command-palette.tsx` with `role === 'CMD'` filter

### Run the app against a fresh Supabase project

1. Create the Supabase project in Mumbai region, tz = Asia/Kolkata
2. Fill `.env.local` from `.env.example` with the new URL + keys
3. `supabase link --project-ref <ref>`
4. `pnpm db:push` — applies all migrations
5. Create the CMD user in the Supabase Auth dashboard (email
   `cmd@transcil.local`, auto-confirm) — or run
   `SELECT promote_to_cmd('cmd@transcil.local')` after signup
6. `node scripts/seed-dev.mjs` — seeds 5 riders / 3 vehicles / 2
   deployments
7. `node scripts/smoke-db.mjs` — verifies schema integrity
8. `pnpm dev`

---

## Security — secrets fencing

Three layers protect secrets from accidental exposure:

### 1. Claude Code file-access deny rules (`.claude/settings.json`)

The project-level settings deny Read/Edit of `.env*`, credential files,
private keys, and `~/.aws`/`~/.ssh`. They also deny common Bash patterns
like `cat .env*` and `printenv SUPABASE*`.

**Rule: never read `.env.local` or any file containing secrets.** If you
need to know which env vars exist, read `.env.example` (placeholder
values only). If you need to verify a value is set, use
`test -s .env.local && echo "exists"` — don't print contents.

### 2. Pre-commit hook (`.githooks/pre-commit`)

Scans staged files for:
- `.env` files (should be gitignored, this is belt-and-braces)
- Supabase service-role keys (`sb_secret_*`)
- JWTs (`eyJhbGci...`)
- AWS access keys (`AKIA...`)
- Private key headers (`-----BEGIN...PRIVATE KEY-----`)
- GitHub tokens (`ghp_*`), Slack tokens (`xoxb-*`), OpenAI keys (`sk-*`)

If a match is found, the commit is blocked. Install with:
```bash
git config core.hooksPath .githooks
```

### 3. `.gitignore` hardening

Covers all common env file patterns, private key extensions, and
credential JSON files. `.env.example` with placeholder values is the
only env file committed.

### What agents (and developers) must never do

- **Never** `Read(.env.local)` or `cat .env*` — use `.env.example` for
  reference
- **Never** print environment variable values (use `test -n "$VAR"` to
  check existence)
- **Never** hardcode keys, tokens, or passwords in source files
- **Never** log request headers that may contain auth tokens
- **Never** commit Supabase service-role key — it bypasses RLS
- **Never** use `--no-verify` to skip the pre-commit hook unless you
  have a genuine false positive (and then add the file to the allowlist
  in the hook, don't disable the hook)

### Scripts that use secrets at runtime

`scripts/seed-dev.mjs` and `scripts/smoke-db.mjs` read `.env.local` at
runtime to get the service-role key. This is correct — they need it to
bypass RLS for seeding and testing. They never log the key value.

---

## How memory works on this project

Two distinct stores — do not confuse them:

1. **Repo docs** (this file, `README.md`, `docs/`) — travels with the
   repo. Anyone cloning gets them. **This is the source of truth for
   agent continuity.** Keep it current.

2. **Personal auto-memory** (my `~/.claude/projects/.../memory/` on the
   machine I was last working on) — does not travel. Captures my
   personal observations about the user's preferences, session log,
   working style. Not a substitute for repo docs.

**Rule: anything a future agent needs to continue this work goes in the
repo.** Anything that's purely "how does this specific user like me to
respond" stays in personal memory.

### Definition of Done (keep docs from drifting)

A change is not "done" until the docs that travel with it are updated **in the
same change**:

1. `docs/CHANGELOG.md` — **always** add an entry (what shipped + what's next).
2. `docs/ARCHITECTURE.md` — when schema, views, enums, or an invariant change.
3. `docs/data-model.html` — when tables/columns/enums change (visual companion).
4. `docs/RIDER_FLOWS.md` — when a rider-flow status changes.
5. `CLAUDE.md` — when an invariant or load-bearing pattern is added/changed.
6. `README.md` — when setup / scripts / status change.
7. Personal auto-memory — only for user-preference drift or meta-observations.

Don't batch this for "end of session" — stale docs are how a future agent gets a
wrong picture. The CHANGELOG once drifted ~14 migrations behind; that's the bar
not to cross again.

---

## Useful contacts & external references

- **Excel template v2 source** (reference for domain logic): lives in
  the sibling repo `transcil-pitch` → the Python builder at
  `build_template_v2.py`. This is the canonical source for the nine
  rider flows. Do not let the repo drift from it without a decision log
  entry in `docs/CHANGELOG.md`.
- **Client**: Transcil Sustainable Services, Hyderabad. Primary contact
  is the CMD (Chairman & Managing Director) — Mr. Alla Suresh Babu.
  "CMD" in the UI refers to this role, not "command" in the shell sense.
- **Proposal, pitch, deliverables**: sibling repo `transcil-pitch`
  (`/Users/jaggu/Desktop/transcil-pitch`). Don't commit deliverables
  here; this repo is app code only.
