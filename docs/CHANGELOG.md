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
- **Migration 0031**: New Deployment captures **battery number** + **charger
  cable number** (required); shown on the deployment detail. View recreated to
  expose the columns.
- **Migration 0032**: Return dialog captures the **returned** battery & charger
  cable numbers (required) on the RETURN activity_log row; shows the issued
  values for reference and flags a **⚠ mismatch** on the timeline.

---

## Session 20 — Return late fee + categorized payments (2026-06-07)

- **Migration 0033**: `activity_log.payment_category` (`Billing Cycle` | `Late
  fee`, nullable; null/legacy rows treated as rent). `deployment_totals` rent
  sum now excludes late-fee payments (`payment_category IS DISTINCT FROM 'Late
  fee'`) so collecting a late fee does **not** reduce the rent balance.
- **Record Payment** now has a required **"Payment for"** dropdown (Billing
  Cycle / Late fee). Timeline tags each PAYMENT with its category. The auto
  initial payment on New Deployment is logged as **Billing Cycle**.
- **Return Vehicle** screen shows a live **balance-to-collect** breakdown: rent
  outstanding + late fee (`days late × ⌈rate ÷ 7⌉`, ₹257/day for ₹1799/wk) =
  total to collect. Late fee is **informational** at return — collected via
  Record Payment, not auto-charged. Recomputes as the return date changes; ₹0
  late fee on/before the due date.

---

## Session 21 — Total Collected (2026-06-07)

- Return battery/charger numbers are now **info-only** — no exact-match
  validation or ⚠ mismatch warning on the timeline.
- **Migration 0034**: `deployment_totals.late_fee_collected` (txn-gated Late-fee
  PAYMENTs); `deployments_enriched.total_collected = rent paid + deposit
  collected + late fee collected` (also exposes `late_fee_collected`). The
  deployment detail card **"Total paid" → "Total collected"**. A **"Late fee
  collected"** card appears alongside it when a late fee has been collected, so
  the Total collected figure can be verified.
- `total_paid`, `balance`, and `pay_status` are **unchanged** (rent + deposit) —
  late fees are extra revenue, not part of the contract due, so they don't clear
  the balance.
- **Extend dialog**: now extend by **Weekly or Monthly** (mirrors New
  Deployment). A rental-type selector + count field; Monthly converts to weeks
  (1 month = 4 weeks) and submits the computed `extra_weeks`. No schema change —
  due date and amount due recalculate as before; the extra rent is collected via
  Record Payment (not auto-charged).

---

## Session 22 — Battery type on new deployment (2026-06-08)

- **Migration 0035**: `deployments.battery_type` (`Fixed` | `Single` | `Dual`)
  + `battery_number_2`. `deployments_enriched` recreated so `d.*` exposes them.
- **New Deployment**: a **Battery type** dropdown above the accessories.
  Fixed → no battery number; Single → one battery number; Dual → two battery
  numbers. Charger cable number stays required. Conditional validation enforced
  in `deploymentCreateSchema` (superRefine). Detail page shows battery type and
  both numbers when present.
- **Migration 0036**: `activity_log.battery_number_2`. The **Return** dialog now
  adapts to the deployment's battery type — Fixed asks for no battery number,
  Single one, Dual two (with the issued values shown for reference). Conditional
  validation in `returnSchema` (a hidden `battery_type` carries the type).
  Timeline shows both returned battery numbers for dual.

---

## Session 23 — 3PL deposit-only + rider alternate number (2026-06-08)

- **Migration 0037**: `riders.alt_phone` (optional 10-digit alternate number).
  Added to New Rider (below Phone) and the rider detail page.
- **Migration 0038**: `deployments.billing_exempt` (bool). `deployments_enriched`
  recreated so exempt rows are guarded: `action='OK'` (never in alerts),
  `days_left=NULL` (no term), and never `OVERDUE` by date.
- **3PL rule** — when the selected rider's **Source = 3PL**, New Deployment goes
  **deposit-only**: no weekly rent, a **fixed ₹2,000 deposit** (txn ID required),
  no initial payment, `billing_exempt=true`. The form auto-switches on rider
  selection; the **server re-derives 3PL from the rider's source** (source of
  truth) and enforces rate 0 / 1 week / deposit 2000.
- 3PL deployments **never show as due/overdue** and are **excluded from rent
  reports** (Outstanding Balances, overdue counts, hub collection rate) — but
  still count toward fleet **utilization** (they occupy a vehicle). Detail page
  shows a "3PL — deposit only (no rent)" card.
- New Deployment form refactored into a client component
  (`new-deployment-form.tsx`) to react to rider source; the server action is
  passed in as a prop.
- Assumption: each 3PL driver is its own rider (Source=3PL); the one-active-
  deployment-per-rider rule is unchanged.

---

## Session 24 — Daily Activity report (2026-06-11)

- New **Daily Activity** report (`/reports/daily-activity`, 4th report card):
  per-day **deployments**, **customers** (distinct riders deployed that day),
  and money collected split into **Deposit · Weekly rent · Late fee · Total**,
  with a grand-total row.
- **From / To** date filter (GET params), **defaults to today** (IST). Money is
  txn-gated (`transaction_id IS NOT NULL`) and inflows-only (refunds excluded),
  consistent with the money model. Deployments grouped by `deploy_date`, money
  by `event_date`. New `getDailyActivity(from, to)` helper in `reports.ts`.
- No migration (read-only over `deployments` + `activity_log`).

---

## Session 25 — Replace Vehicle enhancements (2026-06-11)

- **Replace dialog** now shows the **EC number** (vehicle serial) for both the
  current and the new vehicle (options read `VTD … · EC … · colour`; a current-
  vehicle line shows VTD + EC).
- New **"Battery & charger"** toggle (Same / Change). **Same** keeps the current
  battery/charger; **Change** reveals required fields for the new vehicle's
  battery number(s) (per the deployment's battery type — Fixed none / Single one
  / Dual two) and charger cable number.
- On "Change", `logActivityEvent(REPLACEMENT)` patches the deployment's
  battery/charger and records the new values on the activity-log row for audit;
  the vehicle swap is unchanged. Conditional validation in `replacementSchema`
  (hidden `battery_type` carries the type). No migration (columns already exist).

---

## Session 26 — Extend dialog: pay-in-place + due-date clarity; deposit disable (2026-06-11)

- **Record / Refund deposit disabled** — both options hidden from the deployment
  action bar (`DEPOSITS_ENABLED` flag) and the server actions reject with a
  "disabled" message. New Deployment initial deposit (incl. 3PL) unaffected.
  One-line flip to re-enable.
- **Extend dialog** now shows a **Due date → New due date** preview. (No logic
  change: `due_date` is generated as `deploy_date + total weeks × 7`, so an
  extension always extends from the current due date by the selected weeks — the
  event date never shifts it.)
- **Collect payment now** (checkbox, default on) inside the Extend dialog —
  amount **pre-filled to weeks × rate**, with payment mode / UTR / week#.
  Submitting logs the EXTENSION then the PAYMENT (Billing Cycle) in one step;
  unchecking just extends. `extendDeploymentAction` parses the optional payment
  via `paymentSchema`. No migration.

---

## Session 27 — Vehicle detail EC No + open "add vehicle" (2026-06-11)

- Deployment detail now shows **EC No** (`vehicle_serial`) in the header line and
  as a card (plus a VTD No card).
- **Adding a vehicle is now allowed for all authenticated users** (was CMD-only).
  Migration 0039 replaces `vehicles_insert_cmd` with `vehicles_insert_all`
  (`WITH CHECK (true)`); the New Vehicle page no longer self-gates and the
  button shows for everyone. **Edit/delete stay CMD-only.**

---

## Session 28 — Uppercase data normalization (2026-06-11)

- All **identifiers & names auto-normalize to UPPERCASE** on save (free-text
  **Notes excluded**; email/password/phone/amount/date untouched). Covers rider
  name/address/location/emergency name/IDs/store fields, vehicle VTD/EC/chassis/
  colour, battery & charger numbers, and transaction IDs — via `up` /
  `upperOptional` helpers in `validation/helpers.ts` applied across the rider /
  vehicle / deployment / activity schemas.
- Text inputs (`type="text"`) **display uppercase as you type** (visual only;
  the value is normalized for real on save). Added an `uppercase` opt-out prop to
  the shared `Field`.
- **Migration 0040** backfills existing rows (riders / vehicles / deployments /
  activity_log) to uppercase for the same columns. `upper()` is idempotent.

---

## Session 29 — Vehicle service status (CMD) (2026-06-11)

- **Migration 0041**: `vehicles.service_status` (`Available` | `Under Repair` |
  `In Factory`, default Available). **CMD-only** edit on the vehicle edit page
  (existing `vehicles_update_cmd` RLS).
- **"In Use" stays derived** (active deployment) — `service_status` only applies
  to idle vehicles. Effective status shown = In Use else `service_status`;
  vehicles list shows Under Repair / In Factory badges and an "out of service"
  count.
- **New Deployment picker** now offers only `service_status='Available'` vehicles
  with no active deployment (`listAvailableVehicles` filters both). Foundation for
  Phase-2 repair tracking. Invariant #2 in CLAUDE.md updated to reflect this.

---

## Session 30 — Most Urgent report + CSV export (2026-06-12)

- New **Most Urgent** report (`/reports/most-urgent`, first report card): ACTIVE
  deployments **due today or past due** (`days_left <= 0`), most overdue first.
  Columns: Rider Name, EC No, Due Date, Days left, Customer Mobile No.
- **Download Excel (CSV)** via `/reports/most-urgent/export` route handler —
  UTF-8 BOM, same columns/sort, `most-urgent-<date>.csv`. Rider name links to the
  deployment so the officer can log the reminder call via the existing flow.
- `getMostUrgent()` in `reports.ts`. No migration (read-only over
  `deployments_enriched`).

---

## Session 31 — Lock vehicle status while In Use (2026-06-12)

- On the vehicle edit page, **Status can't be changed while the vehicle is In
  Use** (has an active deployment): the field renders as a read-only "In Use —
  locked" instead of the dropdown. Vehicles that are not in use (Available /
  Under Repair / In Factory) remain editable; other fields stay editable always.
- Server guard in `updateVehicle`: re-checks In Use on submit and keeps the
  existing `service_status` (ignores any submitted value). `service_status` is
  now optional in `vehicleUpdateSchema`. No migration.

---

## Session 32 — Rider Source on deployments list (2026-06-12)

- **Migration 0042**: `deployments_enriched` recreated to expose
  `rider_source` (`r.source`). Deployments list now shows a **Source** column
  (Individual / 3PL / Camions) as a badge, right after the Rider column.
  `DeploymentEnrichedRow` gains `rider_source`. No backfill.

---

## Session 33 — Daily Activity: by-source breakdown (2026-06-12)

- **Daily Activity** report gains a **"By rider source"** comparison table above
  the day-by-day table: one row per source (Individual / 3PL / Camions, + any
  others, + Total) with **Deployments · Active · Deposit · Weekly rent · Late
  fee · Total received** for the selected From/To range. 3PL shows ₹0 rent
  (deposit-only).
- Deployments counted by `deploy_date` (all statuses, Active broken out);
  amounts by `event_date`, txn-gated, grouped by the deployment's rider source.
  New `getDailySourceBreakdown(from, to)` helper (nested `riders(source)` embed).
  No migration.

---

## Session 34 — Deployments list: server-side pagination (2026-06-12)

- **Deployments list is now server-paginated** (50/page) — fetches one page +
  an exact count instead of the whole table, so it stays fast no matter how large
  the table grows. Previously it fetched **and rendered** every row.
- **Default scope = Active + Locked** (bounded by fleet size); a **status filter**
  (Active+Locked / Active / Locked / Returned / Cancelled / All) and **DB search**
  (rider / phone / VTD / EC / code) run server-side via URL params; Prev/Next +
  "Showing A–B of N".
- `listDeployments(opts)` now returns `{ rows, total, page, perPage }`;
  `listActiveDeployments()` added for the dashboard (lock-now + urgent list);
  `countDeploymentsByAction()` for header alerts. `DeploymentsTable` hides its
  client filter (`hideFilter`). Uses the existing `deployments_status_due_date_idx`;
  no migration.

---

## Session 35 — days_left blank for terminal deployments (2026-06-14)

- **Migration 0043**: `deployments_enriched.days_left` is now **NULL when status
  is not ACTIVE/LOCKED** (RETURNED / CANCELLED → "—" in the list), instead of
  showing a meaningless due-date countdown for already-returned vehicles.
  ACTIVE/LOCKED still compute; billing-exempt (3PL) stays NULL. View-only change,
  no UI edit (table already renders `days_left ?? "—"`).

---

## Session 36 — Hub Performance: exclude retired hubs (2026-06-16)

- **Bug fix**: `getHubPerformance()` (`src/lib/db/reports.ts`) fetched hubs
  without the `deleted_at IS NULL` filter, so soft-deleted `[retired]` hubs
  (migration 0015) showed up as zero-activity rows in the Hub Performance
  report. Added `.is("deleted_at", null)` to match `listHubs()` and every
  other hub query. One-line change, no migration.
- **Side effect (improvement)**: `vehiclesPerHub` divisor now spans only the
  4 active hubs instead of all hubs, so per-hub utilization % is more accurate.

---

## Session 37 — Security hardening: headers + Sentry (2026-06-16)

Driven by an evidence-based security review of the app. Core controls (auth,
RLS, input validation, secret fencing, parameterized queries, private buckets)
were already solid; this session closed the two real gaps.

### Shipped

- **Security response headers** (`next.config.mjs`): added `headers()` applying
  HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  and a restrictive `Permissions-Policy` to every route. Verified live.
  - **CSP intentionally deferred** — needs tuning against Supabase/Sentry/Next
    inline bootstrap and must be validated on a preview deploy first.
- **Sentry error monitoring** — was installed (`@sentry/nextjs`) but never
  initialized; production errors went uncaptured. Now wired:
  - `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts`
    + `instrumentation.ts`; `next.config.mjs` wrapped with `withSentryConfig`.
  - All inits **DSN-guarded** — app is byte-identical when no DSN is set.
  - `experimental.instrumentationHook: true` (required on Next 14 for
    `instrumentation.ts` to run; no-op on Next 15+).
  - Session Replay excluded (bundle weight); source-map upload disabled (works
    without `SENTRY_AUTH_TOKEN`). Client First Load JS grew ~64 kB (Sentry SDK).
  - `NEXT_PUBLIC_SENTRY_DSN` set in Vercel **Production** + verified inlined in
    the live bundle. **Preview** env not set (CLI quirk) — add via dashboard if
    preview-branch capture is wanted. Add the same var to `.env.local` for local.
  - **Gotcha fixed:** because the repo uses a `src/` dir, the instrumentation
    hook must live at **`src/instrumentation.ts`** (not the project root, where
    Next silently ignores it). Symptom was server/edge capture being a no-op
    (`clientInitialized:false`) while client capture worked. Verified end-to-end
    in production after the move.
  - `src/app/global-error.tsx` added so React **render** errors are captured too
    (not just thrown/server errors) — clears the Sentry build warning.

### Deferred / not done

- Rate limiting (login/API) — declined for now; Supabase Auth's built-in
  throttling is the baseline for this internal-only app.
- CSP, source-map upload, Sentry Preview env — optional follow-ups above.

---

## Session 38 — Operations Overview report (replaces Monthly Summary) (2026-06-16)

Replaced the month-locked **Monthly Summary** with a flexible **Operations
Overview** — one comprehensive snapshot with a Week / Month / Year filter.

### Shipped

- **New report** `reports/overview/` (`/reports/overview`), titled *Operations
  Overview*. One period filter drives everything:
  - **Deployments trend** chart (`DeploymentTrendChart`, Recharts grouped bars)
    — total deployments per period across the last 12 weeks / 12 months / 5
    years, split **Individual vs 3PL** (`billing_exempt`).
  - **Fleet movement (selected period):** New (split Ind/3PL), Returned,
    Replaced (= `REPLACEMENT` events in period), plus **Currently Active**
    (live snapshot, Ind/3PL).
  - **Individual collections (selected period):** security deposits collected,
    weekly rent collected (PAYMENT excl. Late fee), and **Outstanding dues**
    (live balance across active Individual units).
- **New `getOperationsOverview(granularity, anchor)`** in `src/lib/db/reports.ts`
  — UTC calendar-date bucketing (Mon-start weeks), reads `deployments_enriched`
  + `activity_log`. **No DB migration** (additive, JS aggregation).
- **New `PeriodPicker`** (`reports/_components/period-picker.tsx`) — Week/Month/
  Year toggle + prev/next navigator via `?g=&anchor=` URL params.
- **`MonthPicker` relocated** to `reports/_components/month-picker.tsx` (it was
  living inside `monthly-summary/` but is shared with Hub Performance — import
  repointed before deletion).

### Removed

- `reports/monthly-summary/` (page + month-picker), `getMonthlySummary()` +
  `MonthlySummary` type, and the now-orphaned charts `revenue-bar-chart`,
  `utilization-donut`, `deployment-flow-chart`.

### Design notes

- "Active" is a point-in-time **state**, shown as a live snapshot; New /
  Returned / Replaced are **flows** scoped to the selected period.
- Outstanding dues is a **live** figure (current unpaid balance), not scoped to
  the period — labelled as such on the page.

### Follow-ups (same session)

- Default filter on load is now **Current Week** (was Month) — anchor defaults
  to IST today.
- Trend bars use distinct theme colours instead of black/gray:
  **Individual = `--color-chart-1`** (orange), **3PL = `--color-chart-2`** (teal).

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
