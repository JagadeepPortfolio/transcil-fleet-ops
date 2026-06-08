# Architecture & Data Model

Deep reference for the schema, views, and the money/audit models. For invariants
and "do not break" rules see **CLAUDE.md**; for the running history see
**CHANGELOG.md**; for the visual model see **data-model.html**. Schema truth is
the migrations in `supabase/migrations/` (currently `0001`–`0027`).

## Legacy boundary

The legacy third-party platform (Vendor V2407001) owns manufacturing, hubs,
vehicle assignment, initial transaction, agreement printing, geolocation, service
tickets. This app owns the **post-deployment lifecycle**: rider profiles,
deployments, weekly payments, deposits, returns/replacements, reminders, lock/
unlock, dashboard. Handoff is a one-way CSV (8 fields). No write-back.

## Tables (core)

- **riders** — `id`, `name`, `phone` (citext, unique, 10-digit), `address`,
  `id_proof_url`, `photo_url`, `source` (`rider_source`), `location_id`
  (legacy/unused), **`current_location` (free text, 0019)**, `app_rider_id`
  (0013), **`emergency_contact_relationship` / `emergency_contact_name` /
  `emergency_contact_number` (0018, renamed + relationship added in 0028)**,
  **`purpose` (0018; structured options + `store_id`/`store_name`/
  `store_location`/`purpose_other` in 0029)**,
  `notes`, audit (`created_by`, **`created_by_name`** 0023, timestamps,
  `deleted_at`).
- **vehicles** — `id`, `vtd_no` (unique; the tracker/Device ID), `vehicle_id`
  (= **EC No**), **`chassis_no` (0017)**, `vehicle_type_id`, **`hub_id` (0014)**,
  `colour`, audit + **`created_by_name`**. Availability is **derived** (no status
  column): a vehicle is available when it has no ACTIVE non-deleted deployment.
- **deployments** — canonical contract state: `rider_id`, `vehicle_id`,
  `hub_id`, `deploy_date`, `weeks`, `rate_inr` (always ₹/week),
  `deposit_required_inr`, `new_deposit_needed`, `deposit_refund_status`,
  `status` (`deployment_status`), `call_status`, `lock_*`, `return_*`,
  **`rental_type` (0020)**, **`deployment_code` (0021)**,
  **`battery_number` / `charger_cable_number` (0031)**, `notes`, audit.
  `due_date` is **GENERATED** = `deploy_date + weeks*7` (recalcs on edit).
- **activity_log** — audit trail of rider-flow events; written **only** via
  `logActivityEvent()`. Columns include `event_type` (`activity_event_type`),
  `event_date`, `amount_inr`, `transaction_id`, `payment_mode`, `week_number`,
  replacement/return/extension fields, **`old_value`/`new_value` (0027)**,
  **`battery_number`/`charger_cable_number` (0032 — returned-accessory
  verification on RETURN)**, `reason`, `notes`, audit + **`created_by_name`**.
- **app_users** — `id` (=auth.users.id), `role` (`app_role`), `full_name`,
  `hub_id`. `handle_new_user` trigger seeds a baseline row on signup.

## Tables (reference / support)

- **locations**, **hubs** (5 active — Nagole/Kukatpally/Vijayawada/Vizag/Guntur;
  `code` holds the legacy HubID e.g. `H25110002`, set in 0030), **vehicle_types**.
- **vehicle_reference (0026)** — read-only legacy catalog (~2,585 rows):
  `ec_no` PK → `device_id`, `chassis_no`, `color`. Powers EC-No autofill.
- **deployment_code_counters (0021)** — `year` PK, `last_seq`. Per-year sequence
  for `deployment_code`.

## Views (read models the UI consumes)

- **deployment_totals** — per-deployment money aggregates. Sums only rows with
  `transaction_id IS NOT NULL`: `total_paid` (PAYMENT), `deposit_collected`
  (DEPOSIT), `deposit_refunded` (DEPOSIT_REFUND). `total_due = weeks*rate_inr +
  (deposit_required if new_deposit_needed)`. **`total_paid` excludes late-fee
  PAYMENTs** (`payment_category IS DISTINCT FROM 'Late fee'`, 0033) — late fees
  are tracked in the timeline but don't reduce the rent balance.
  `late_fee_collected` (0034) sums the txn-gated Late-fee PAYMENTs separately.
- **deployments_enriched** — `d.*` + rider/vehicle/hub joins + computed
  (rebuilt in 0021/0025/0031/0034/0035). **Money model (0025):**
  - `total_paid = rent paid + deposit_collected`
  - `total_collected = rent paid + deposit_collected + late_fee_collected` (0034;
    the "Total collected" card — all cash received). `total_paid`/`balance` stay
    rent+deposit, so late fees don't clear the balance.
  - `balance = total_due − rent paid − deposit_collected`
  - `pay_status`: PAID when balance ≤ 0; PARTIAL when any paid; OVERDUE when past
    `due_date`; else PENDING.
  - `days_left`, `action` (LOCK_NOW/AT_RISK/CALL_TODAY/UPCOMING/OK) use IST
    `(CURRENT_DATE AT TIME ZONE 'Asia/Kolkata')`.
  > Note: Postgres freezes `d.*` at view-creation, so **adding a deployments
  > column requires recreating this view** (see 0021/0025).

## Enums (current values)

- `rider_source`: Individual, 3PL, Camions *(0018; was Walk-in/Reference/…)*
- `rental_type`: Weekly, Monthly *(0020)*
- `deployment_status`: ACTIVE, RETURNED, LOCKED, CANCELLED
- `activity_event_type`: PAYMENT, DEPOSIT, DEPOSIT_REFUND, REPLACEMENT,
  EXTENSION, RETURN, REMINDER_CALL, LOCK, UNLOCK, **DEPLOY_DATE_EDIT** *(0027)*
- `pay_status`: PAID, PARTIAL, OVERDUE, PENDING
- `action_priority`: LOCK_NOW, AT_RISK, CALL_TODAY, UPCOMING, OK
- `lock_status`, `call_status`, `deposit_refund_status`, `app_role`
  (CMD/HUB_MANAGER/FIELD_STAFF)
- Payment modes (app-level, CHECK on `activity_log.payment_mode`): **UPI,
  Mobile App** *(0024)*
- Payment category (CHECK on `activity_log.payment_category`, nullable):
  **Billing Cycle, Late fee** *(0033)* — null/legacy rows count as rent
- Battery type (CHECK on `deployments.battery_type`, nullable): **Fixed, Single,
  Dual** *(0035)* — Single needs `battery_number`, Dual needs `battery_number` +
  `battery_number_2`, Fixed needs none (enforced in `deploymentCreateSchema`)

## Money model

- `rate_inr` is always **₹/week**. Monthly rentals display ₹/month but store the
  weekly-equivalent (₹6500/4 = ₹1625) so `weeks*rate_inr` equals the monthly fee.
- Initial rent payment + deposit are captured **on deployment creation**.
- A payment/deposit counts toward totals only with a `transaction_id`
  (invariant #5); Txn ID is **mandatory** in the UI (0024).

## Audit model

- **Actor snapshot (0023):** a `SECURITY DEFINER` BEFORE INSERT trigger sets
  `created_by` = `auth.uid()` and `created_by_name` = full name (fallback email)
  on activity_log/riders/vehicles. Snapshot, so it survives renames and dodges
  the app_users RLS.
- **Deploy-date correction (0027):** `DEPLOY_DATE_EDIT` (CMD-only) records
  old/new + reason on the timeline, patches `deploy_date`, and shifts the initial
  payment/deposit dates — all through `logActivityEvent`.

## Deployment code

`deployment_code` = `DEP-<year-of-deploy_date>-<n>`, assigned by a BEFORE INSERT
trigger using `deployment_code_counters` (gap-free; rolls back with a failed
insert). Resets per year. **Immutable** after creation (editing the date does not
renumber it). `reset_deployment_codes()` clears counters for testing.

## Auth, RLS, roles

- Middleware refreshes the session each request and gates routes; `(app)/layout`
  reads the session from cookie (`getSession`, no extra round trip).
- RLS: reference tables readable by all; riders read/write by all, delete CMD;
  vehicles read by all, write CMD-only; deployments/activity scoped to CMD-or-hub;
  CMD sees all. **HUB_MANAGER and FIELD_STAFF currently have identical access.**
- `getCurrentRole()` (`src/lib/auth/role.ts`) gates CMD-only pages/actions.

## Platform / performance

- Next.js 14 App Router + Supabase (Mumbai). Vercel **single region `bom1`**
  (`vercel.json`) co-located with the DB; Fluid Compute on. Deploy is manual
  (`npx vercel --prod`); no Git auto-deploy.
