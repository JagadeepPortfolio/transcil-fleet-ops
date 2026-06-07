# Changelog

Session-by-session log of what shipped. Update this at the end of every
session — future agents and developers depend on it for context.

---

## Session 11 — Foundation scaffold (2026-04-12)

**Scope:** Scaffold + schema + auth + 3 modules.

### Shipped

- **Repo scaffold**: `create-next-app` + shadcn/ui init + all deps
- **Supabase schema**: 12 migrations (`0001..0012`)
  - Extensions: pgcrypto, citext
  - Enums: rider_source, deployment_status, pay_status, action_priority,
    call_status, lock_status, deposit_refund_status,
    activity_event_type, app_role
  - Reference tables: locations (20 Telangana cities), hubs (6),
    vehicle_types (5)
  - Core tables: riders, vehicles, deployments, activity_log, app_users
  - Generated column: `deployments.due_date` (deploy_date + weeks*7)
  - Partial unique indexes: one ACTIVE deployment per vehicle, one per
    rider
  - Views: `deployment_totals`, `deployments_enriched`
  - Helper functions: `current_user_role()`, `current_user_hub_id()`,
    `handle_new_user()` trigger, `promote_to_cmd()`
  - RLS policies on all tables
  - Storage buckets: rider-photos, rider-id-proofs, payment-receipts,
    vehicle-photos
  - Seed CMD user (migration 0011)
  - Dropped `role_hub_check` (migration 0012) — fought the
    `handle_new_user` trigger, RLS is sufficient
- **Auth**: Supabase Auth (email/password), middleware session refresh,
  layout double-check, Server Action sign-out
- **Module 1 — Rider Profiles**: list / new / detail pages, photo
  upload, unique phone constraint
- **Module 2 — Deployments**: list / new / detail pages, activity log
  read-only timeline, concurrency guard on create
- **Module 3 — Vehicles admin**: CMD-only CRUD, derived availability
- **Dashboard**: 3 KPI cards, 3 alert cards, "most urgent" top-5 list
- **Shell**: sidebar, header with role badge + sign-out, login page with
  form

### Bug fixes

- `role_hub_check` constraint dropped — prevented new auth users
- Email confirmation applied manually for CMD user
- `env.ts` zod schema updated to handle empty-string Sentry DSN
  placeholders via `transform().pipe()` pattern

---

## Sessions 12/13/14 — UI/UX polish (2026-04-12)

**Scope:** Design system, Cmd+K palette, dense tables, mobile shell.

### Shipped

- **Design system tokens**: success/warning/info semantic colors in oklch
- **Badge system**: CVA variants + domain wrappers (ActionBadge,
  PayStatusBadge, DeploymentStatusBadge, LockStatusBadge) — single
  source of truth for status colors
- **PageHeader**: breadcrumbs + title + description + action slot, used
  on every page
- **EmptyState**: dashed-border placeholder with icon + CTA
- **DataTable** (`src/components/ui/data-table.tsx`): TanStack Table
  wrapper with global filter, sort arrows, sticky headers, zebra rows
- **Per-entity tables**: `DeploymentsTable`, `RidersTable`,
  `VehiclesTable` — column defs with badge cells and custom sort
- **Cmd+K command palette**: global keybinding, base-ui Dialog, lazy
  fetch from `/api/search`, local filter, keyboard nav
- **Mobile shell**: bottom tab bar (hidden md+), 4 tabs + Search
- **Login page polish**: Transcil brand hero, centered card layout
- **Header polish**: role badge, search trigger, backdrop blur
- **Sidebar polish**: active state, icon column, brand mark
- **Dashboard polish**: color-coded alert tints, KPI hover affordance

---

## Session 12 — Collection loop (2026-04-12)

**Scope:** PAYMENT, DEPOSIT, DEPOSIT_REFUND, REMINDER_CALL write UIs.

### Shipped

- **Validation schemas**: `src/lib/validation/activity.ts` — paymentSchema,
  depositSchema, depositRefundSchema, reminderCallSchema. All mirror the
  Excel template field requirements including the "txn ID is optional but
  gates Total Paid" audit safeguard.
- **Server Actions**: `src/app/(app)/deployments/[id]/actions.ts` — 4
  actions (recordPaymentAction, recordDepositAction, refundDepositAction,
  logReminderCallAction). Each parses with zod → delegates to
  `logActivityEvent()` → `revalidatePath` on detail + list + dashboard.
- **Event dialogs**: `src/app/(app)/deployments/[id]/event-dialogs.tsx`
  — 4 dialog forms (Payment / Deposit / Refund / Reminder Call) using
  base-ui Dialog. Opens from a "Quick actions" card on the deployment
  detail page (only shown for ACTIVE deployments). `useFormState` +
  auto-close on success.
- **Detail page integration**: Quick-actions card added between info grid
  and activity log timeline. "Module 4 ships" placeholder removed.
- **Branding**: Real Transcil logo + pin icon extracted from asset sheet,
  optimized (logo 146 KB, icon 15 KB, favicon 11 KB), wired into login
  page hero, sidebar brand mark, and browser favicon.
- **Seed data**: `scripts/seed-dev.mjs` — applies 5 riders, 3 vehicles,
  2 deployments via service-role key (idempotent). Needed because
  `supabase db push` does not run `seed.sql`.
- **DB smoke test**: `scripts/smoke-db.mjs` — 6 automated checks:
  enriched view, row counts, CMD user, partial unique index enforcement,
  RLS anon block, reference tables.
- **Documentation**: `CLAUDE.md`, `docs/RIDER_FLOWS.md`,
  `docs/CHANGELOG.md`, `docs/SMOKE_TESTS.md`. README updated.

### Not shipped (deferred to next sessions)

- S13: EXTENSION, RETURN, REPLACEMENT write UIs
- S14: LOCK, UNLOCK write UIs
- CSV Import (blocked on Discovery)
- Full admin/settings UI

---

## Session 15 — Bug fixes, UX improvements, schema addition (2026-04-12)

**Scope:** Fix deployment creation bug, deployment detail UX, riders schema.

### Bug fixes

- **Zod v4 UUID validation breaking form submissions**: `z.string().uuid()`
  in Zod v4 enforces strict RFC 4122 version/variant bits, rejecting
  synthetic seed UUIDs (e.g. `20000000-0000-0000-0000-000000000005`).
  Replaced with a relaxed `dbUuid()` regex helper in
  `src/lib/validation/helpers.ts`. Applied to `deployment.ts` and
  `activity.ts`. Added as **invariant #9** in CLAUDE.md.
- **LOCKED deployments showing blank in list**: The `deployments_enriched`
  view returns `action = NULL` for non-ACTIVE deployments. Added a
  **Status** column (`DeploymentStatusBadge`) to the deployments list
  table so LOCKED/RETURNED/CANCELLED are always visible.

### UX improvements

- **Quick actions sidebar layout**: Moved quick actions from inline card
  to a sticky left sidebar on the deployment detail page. Buttons are
  vertical, ghost variant, left-aligned. Collapses above content on
  mobile. Only renders for ACTIVE/LOCKED deployments.
- **Activity log Weeks column**: Added a Weeks column to the activity
  log table showing `+N` for EXTENSION events (extra_weeks) and week
  number for PAYMENT events.
- **Consistent button styling**: "Record payment" quick action was
  `variant="default"` (dark) while all others were `variant="outline"`.
  Normalized to ghost variant for the sidebar layout.
- **Sidebar nav reorder**: Moved Reports after Vehicles in the sidebar.

### Schema changes

- **Migration 0013**: Added `app_rider_id text` column to `riders` table
  for mobile app rider IDs. Sparse index on non-null values.
- **Rider form**: "Rider ID" field added next to Source (optional, with
  hint). Shown on rider detail page header when present.
- **New deployment form**: Rider dropdown now shows app_rider_id in
  parentheses when available.

---

## Session 17 — Post-deployment refinements, perf, audit, deploy (2026-06-06)

**Scope:** Field/flow corrections from real testing, money-model fixes,
auto-fill from legacy data, audit trail, performance, and first production
deploys. Migrations **0014–0027**. Live on Vercel (Mumbai `bom1`).

### Vehicles

- **0014** `vehicles.hub_id`; **0017** `vehicles.chassis_no`; **0023**
  `vehicles.created_by_name`.
- New Vehicle form: dropped Vehicle Type & Hub selects (default **E-Scooter** +
  **Nagole/NAG**); relabeled "Vehicle No" → **EC No** everywhere; added Chassis No.
- **EC-No autofill (0026)**: `vehicle_reference` table (2,585 rows imported from
  legacy `vehicles1.xlsx`: ec_no → device_id, chassis_no, color). New Vehicle
  screen is EC-primary; typing EC auto-fills VTD(Device ID)/Chassis/Colour via
  `GET /api/vehicle-reference`. Manual entry still allowed on no match.
- **Staff view-access**: Vehicles screen viewable by all roles (read-only);
  add/edit/delete remain CMD-only (per-page `getCurrentRole()` gate + RLS).
  Admin layout no longer blanket CMD-only; write pages self-gate.
- Availability filter (All / Available / In use) + "Added by" column.

### Riders

- **0015** hubs cleanup (NAG/KUK/VJA/VIZ); **0018** source enum →
  **Individual / 3PL / Camions** (old values mapped to Individual) + alt-contact
  name/number + purpose; **0019** free-text `current_location` (replaced the
  Location dropdown); **0023** `riders.created_by_name`.
- New/detail UI updated for the above; "Added by" shown on detail.

### Deployments

- **0020** `rental_type` enum (Weekly/Monthly); **0021** `deployment_code`
  (`DEP-<deploy_year>-N`, gap-free trigger, yearly reset) + counter table;
  **0025** balance/totals fix; **0027** `DEPLOY_DATE_EDIT` event + audit cols.
- New Deployment: hub defaults to NAG; **Rental type** Weekly (1wk, ₹1799) /
  Monthly (4wk fixed, ₹6500 shown but stored as ₹1625/wk weekly-equivalent);
  deposit section reveals on "New deposit needed"; **initial payment + deposit
  recorded inline on create** via `logActivityEvent`.
- Rider dropdown excludes riders with an ACTIVE deployment.
- List: EC No shown under VTD; only the **rider name** is clickable.
- **Balance/totals (0025)**: `total_paid = rent paid + deposit collected`,
  `balance = total_due − rent − deposit collected`; pay_status uses the same →
  rent+deposit fully collected reads **PAID / ₹0**.
- **Mandatory Txn ID (0024 modes + validation)**: payment & deposit require a
  Transaction ID (with `*`); DB count-filter retained (invariant #5).
- **CMD deploy-date edit (0027)**: CMD-only "Edit deploy date" with required
  reason; recalculates due_date, **shifts the initial payment/deposit dates** to
  match, logs a `DEPLOY_DATE_EDIT` timeline entry (old → new, by).

### Payments / audit

- **0024**: payment modes → **UPI / Mobile App** (removed Bank Transfer, Cash).
- **0023 audit**: `created_by_name` snapshot trigger on activity_log/riders/
  vehicles → "By" on the activity log, "Added by" on riders/vehicles. The
  initial-payment actor is now recorded (was previously NULL).

### Dashboard / UI / dates

- Dashboard cards: added **Available Vehicles**, renamed Vehicles → **Total
  Vehicles**, added **Locked vehicles**; removed "Call today"; renamed "At risk
  today" → **Due Date Crossed** (overdue).
- All UI dates standardized to **`dd MMM yyyy`** via `src/lib/dates.ts`
  (`formatDate`). Nav reordered: Dashboard · Riders · Vehicles · Deployments ·
  Reports. Added shared `(app)/loading.tsx` skeleton for instant nav feedback.

### Performance

- **Region co-location** (`vercel.json` `regions:["bom1"]`): functions now run
  in Mumbai next to Supabase (was `iad1`/US) — eliminates ~250ms-per-query
  cross-continent latency. App layout reads session from cookie (`getSession`)
  instead of a second network `getUser`. Fluid Compute already on.

### Testing helpers (DB functions, service-role only)

- **0022** `reset_test_data()` — truncate deployments/riders/vehicles (+activity
  via cascade) and reset numbering. `reset_deployment_codes()` — counters only.
  Both `REVOKE`d from app users; not callable from the app or a Vercel deploy.

### Deploy

- First production deploys via `npx vercel --prod` (manual; no Git auto-deploy).
  Live at https://transcil-fleet-ops.vercel.app.

---

## Session 18 — Rider emergency contact (2026-06-07)

- **Migration 0028**: renamed `riders.alt_contact_name/alt_contact_number` →
  `emergency_contact_name/emergency_contact_number` and added
  `emergency_contact_relationship` (CHECK: Father/Brother/Mother/Guardian).
- New Rider form: **Emergency Contact** section — required Relationship dropdown +
  Name + Number (10 digits). Riders list column and rider detail card relabeled
  "Emergency contact" (shows name (relationship) + number).
- **Migration 0029**: structured **Purpose** — a dropdown (Big Basket, Zepto,
  Swiggy, Swiggy Instamart, Zomato, Blinkit, Amazon, Flipkart Minute, Amazon One,
  Others). A platform requires Store ID / Store Name / Store Location; "Others"
  requires a free-text description. New columns `store_id`, `store_name`,
  `store_location`, `purpose_other`; conditional zod validation; rider list +
  detail show the selected purpose with store details.

---

## Session 19 — Rider fields + hub codes (2026-06-07)

- Made rider **Address** mandatory (New Rider).
- **Migration 0030**: hub `code` now holds the legacy HubIDs (Nagole H25110002,
  Kukatpally H26030003, Vijayawada H26030004, Vizag H26040005) and **Guntur
  (H26060006)** added. Default-hub lookups (new vehicle/deployment) resolve
  Nagole by name, not code.

---

## What's next

| Priority | Work | Blocked on |
|---|---|---|
| 1 | CSV Import from legacy (rider deployments) | Discovery |
| 2 | Delete deployment (CMD, soft-delete + audit) | deferred by request |
| 3 | User admin UI (add/role/hub for staff) | nothing |
| 4 | WhatsApp / MSG91 OTP | Phase 2, provider accounts |
| 5 | Rider edit page; Edit-vehicle EC autofill | nothing |
| 6 | GitHub → Vercel auto-deploy (optional) | dashboard connect |
