# Transcil Fleet Ops

Fleet operations web app for Transcil Sustainable Services.
Next.js 14 (App Router) + Supabase + Tailwind v4 + shadcn/ui.

Replaces the v2.4 Excel template for post-deployment operations. Does NOT
replace the legacy mfg/registration app — that one stays.

---

## Current status (Session 17 — 2026-06-06 · live on Vercel)

| Module | Status |
|---|---|
| 1. Rider Profiles | ✅ shipped (source: Individual/3PL/Camions, alt contact, current location) |
| 2. Deployments | ✅ shipped — rental type, codes (DEP-YYYY-N), inline first payment+deposit |
| 3. Admin → Vehicles | ✅ shipped — staff view-access, CMD-only writes, EC-No autofill from reference |
| 4. All 9 rider-flow events (PAYMENT … UNLOCK) | ✅ shipped (detail-page dialogs) |
| 5. CMD deploy-date edit (audited correction) | ✅ shipped (S17) |
| 6. Dashboard KPIs + alerts | ✅ shipped (Available/Total/Locked, Due Date Crossed) |
| 7. Command palette / mobile shell / loading states | ✅ shipped |
| 8. Reports (outstanding, monthly, hub) | ✅ shipped |
| 9. Audit "who did it" (created_by_name) | ✅ shipped (S17) |
| User admin UI / CSV import / delete deployment | planned |

Schema at migration **0027**. Production: https://transcil-fleet-ops.vercel.app

> For agent/AI context, see `CLAUDE.md`.
> For deep schema/architecture, see `docs/ARCHITECTURE.md`.
> For rider-flow status, see `docs/RIDER_FLOWS.md`.
> For the full session log, see `docs/CHANGELOG.md`.

---

## Local setup

### Prereqs

- Node 20+ (`brew install node`)
- pnpm 10 (`npm i -g pnpm`)
- Supabase project on supabase.com with:
  - Region: Mumbai (`ap-south-1`)
  - Timezone set to **Asia/Kolkata** under Project Settings -> General
- Optional: Supabase CLI (`brew install supabase/tap/supabase`) — only needed
  for type generation and local schema diff

### Install

```bash
pnpm install
cp .env.example .env.local
# Fill in SUPABASE_URL + anon/service-role keys from Supabase dashboard
```

### Run migrations (against remote Supabase)

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies `supabase/migrations/0001..0012` in order.

### Dev server

```bash
pnpm dev
# http://localhost:3000 -> redirects to /login
```

### CMD bootstrap

Migration `0011_seed_cmd_user.sql` creates:

- Email: `cmd@transcil.local`
- Password: `ChangeMe!2026`
- Role: `CMD`

**Log in once, then change the password immediately** via the Supabase Auth
dashboard.

---

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:push` | Apply migrations to linked Supabase project |
| `pnpm db:diff` | Diff local schema against remote — should be empty |
| `pnpm db:new <name>` | Create a new timestamped migration |
| `pnpm db:types` | Regenerate `src/lib/db/types.ts` from live schema |
| `node scripts/seed-dev.mjs` | Seed dev data (5 riders, 3 vehicles, 2 deployments) |
| `node scripts/smoke-db.mjs` | DB integrity smoke test (6 automated checks) |

**Testing-only DB helpers** (run from the Supabase SQL editor / service role):
`SELECT reset_test_data();` wipes deployments + riders + vehicles (+ activity via
cascade) and resets deployment numbering; `SELECT reset_deployment_codes();`
resets only the `DEP-YYYY-N` counters. Both are revoked from app users.

---

## Security setup

### Pre-commit hook (auto-installed)

The repo uses a git pre-commit hook that scans for leaked secrets
(Supabase keys, JWTs, AWS keys, private key headers, GitHub/Slack
tokens). If detected, the commit is blocked.

```bash
# The hook path is set in git config — verify with:
git config core.hooksPath   # should print: .githooks
```

If it's not set (e.g., after a fresh clone), run:
```bash
git config core.hooksPath .githooks
```

### Claude Code fencing

`.claude/settings.json` denies Read/Edit of `.env*` files and common
credential paths. This prevents AI agents from reading secrets during
development sessions. See `CLAUDE.md` → "Security — secrets fencing"
for full details.

### What to never commit

- `.env.local` or any `.env.*` file (gitignored)
- Supabase service-role key (bypasses RLS — app-breaking if exposed)
- Private keys (`*.pem`, `*.key`)
- Credential JSON files

Use `.env.example` as the reference for which env vars exist. It
contains placeholder values only.

---

## Migration discipline

**Migrations are the only source of schema truth.** Do NOT edit tables via
the Supabase Studio SQL editor.

Every schema change:

1. `pnpm db:new <description>`
2. Write SQL in the new file
3. `pnpm db:push`
4. `pnpm db:types` (regenerates TS types)
5. Commit both the `.sql` and the regenerated `types.ts`

---

## Key conventions (read these)

### Canonical state vs audit trail

`deployments` row holds canonical state. `activity_log` is the audit trail.
**Every activity_log insert must update the corresponding deployment
columns in the same transaction.** See the table in
`src/lib/db/activity-log.ts`.

Direct inserts into `activity_log` from components are forbidden. Route all
writes through `logActivityEvent(deploymentId, event)`.

Why: without this rule, the dashboard says one thing and the audit trail
another. Staff logs a RETURN in activity but the deployment still shows
ACTIVE -> false LOCK_NOW badge. The Excel template's Status Alert formula
was built to catch this exact drift; we prevent it at write time instead.

### Vehicle availability — derived, not stored

There is no `vehicles.status` column. Availability is the absence of an
ACTIVE, non-deleted deployment for the vehicle. The concurrency guard is
a partial UNIQUE index on `(vehicle_id) WHERE status='ACTIVE' AND
deleted_at IS NULL` (see migration 0004). Two racing Server Actions ->
one wins, the other surfaces a clean "vehicle no longer available" error.

### Deposit split

- `deployments.deposit_required_inr` -> contract amount (the agreed deposit)
- `deployments.new_deposit_needed` -> false if carried forward
- `deployments.deposit_refund_status` -> Pending / Refunded / Carried Forward
- `activity_log` DEPOSIT / DEPOSIT_REFUND events -> cash movements

Total Due = `weeks * rate_inr + (new_deposit_needed ? deposit_required_inr : 0)`.

Carry-forward pattern: record an explicit DEPOSIT_REFUND on the outgoing
deployment AND an explicit DEPOSIT on the incoming one, both sharing a
transaction_id like `CARRY-{uuid}`. Set the incoming deployment's
`new_deposit_needed = false`.

### IST timezone

Bare `CURRENT_DATE` in Postgres flips at **05:30 IST** — a real bug for
the night shift. Always use `(CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')::date`
in views and queries. See `deployments_enriched` in migration 0007.

### Soft deletes

Every core table has a `deleted_at timestamptz` column. Every query helper
in `src/lib/db/*.ts` filters `WHERE deleted_at IS NULL`. Views do the same.
No UI to delete yet — when it lands, it's a one-line Server Action, not a
query audit.

### Mutations are Server Actions

Colocate mutations in the same file as the form/page. Route Handlers are
reserved for webhook callers and health checks — **not** for CRUD.

---

## Folder tour

```
src/
  app/
    (auth)/login          # public login + brand hero
    (app)/                # auth-gated shell (middleware + layout double-check)
      dashboard/          # KPI cards + alert cards + "most urgent" list
      riders/             # Module 1 (list / new / [id] detail)
      deployments/        # Module 2 (list / new / [id] detail + S12 event dialogs)
      admin/vehicles/     # Module 3 (CMD only)
    api/
      health/             # DB liveness check
      search/             # feeds Cmd+K palette
  lib/
    supabase/{server,client,middleware}.ts
    db/                   # typed query helpers; all filter deleted_at
    validation/           # zod schemas: rider, deployment, activity
    auth/otp.ts           # MSG91 stub interface
    env.ts                # zod-validated env at boot
  components/
    shell/                # sidebar, header, command palette, mobile nav
    ui/                   # badge, card, data-table, form-fields, etc.
    tables/               # per-entity TanStack Table column defs
supabase/
  migrations/             # 0001-0012 source of truth
  seed.sql                # dev fixtures
scripts/
  seed-dev.mjs            # idempotent dev seeder (runs against remote)
  smoke-db.mjs            # 6 automated DB integrity checks
docs/
  CHANGELOG.md            # session log
  RIDER_FLOWS.md          # 9 rider flows — what's shipped vs planned
  SMOKE_TESTS.md          # smoke test checklist
CLAUDE.md                 # agent/AI orientation — read this for continuity
```

---

## Deployment

Vercel, **manual** `npx vercel --prod` (no GitHub auto-deploy — pushing to
`main` does not deploy). Env vars live in Vercel project settings, not
`.env.local`. Functions run in a **single Mumbai region (`bom1`)** —
`vercel.json` — co-located with Supabase for low latency; Fluid Compute on.
Production: https://transcil-fleet-ops.vercel.app

---

## Deferred — intentionally

- **MSG91 OTP** — stub interface in `src/lib/auth/otp.ts`, swap in
  production. Email/password is fine for build phase.
- **Sentry** — wired later once the Sentry project exists.
- **Drizzle/Prisma** — using generated PostgREST types instead, no ORM.
- **@tanstack/react-query** — server components cover data fetching for now.
- **Client-side image compression** — arrives with Module 4 photo capture.
