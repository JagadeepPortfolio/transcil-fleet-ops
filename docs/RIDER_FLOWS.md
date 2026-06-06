# Rider flows — the 9 post-deployment events

Transcil Fleet Ops replaces a structured Excel template (v2.4) that
codified nine types of event on each deployment row. Every rider's
lifecycle after taking delivery of a vehicle is a sequence of these
events, logged by field staff and hub managers daily.

This document maps each flow to its implementation status in the web app.
Update this file when shipping new event write UIs.

---

## Source of truth

The flows originate from `build_template_v2.py:808–849` in the sibling
repo. The Activity Log sheet has 14 columns (A–N). The Deployments sheet
has auto-calculated formula columns that consume activity_log rows via
`COUNTIFS` and `SUMIFS`.

In the web app, the `deployments_enriched` view (migration 0007) is the
equivalent of the Deployments sheet formula columns, and
`logActivityEvent()` in `src/lib/db/activity-log.ts` is the equivalent
of "add a row to the Activity Log sheet, then update Deployments."

---

## Flow map

| # | Event type | Frequency | Required fields | Deployment columns patched | Web UI | Module |
|---|---|---|---|---|---|---|
| 1 | **PAYMENT** | First on create; then weekly | amount, week #, **txn ID (now mandatory)**, optional additional txn ID | _none_ — total_paid computed in `deployment_totals` (counts only `transaction_id IS NOT NULL`) | ✅ Captured on create + dialog on detail page | S12 / S17 |
| 2 | **DEPOSIT** | On create (if new deposit needed) | amount, **txn ID (now mandatory)** | _none_ — deposit_collected computed in view; reduces balance (S17) | ✅ Captured on create + dialog on detail page | S12 / S17 |
| 3 | **DEPOSIT_REFUND** | On contract close | amount, refund status (Refunded / Carried Forward), txn ID | `deposit_refund_status` | ✅ Dialog on detail page (S12) | S12 |
| 4 | **REPLACEMENT** | Medium — vehicle swap (damage, breakdown, upgrade) | old VTD, new VTD, reason | `vehicle_id` → new vehicle | ✅ Dialog on detail page (S12) | S12 |
| 5 | **EXTENSION** | Medium — rider continues after current term | extra weeks | `weeks += extra_weeks` (due_date auto-recalcs via generated column) | ✅ Dialog on detail page (S12) | S12 |
| 6 | **RETURN** | Medium — rider gives vehicle back | return reason | `status='RETURNED'`, `return_date`, `return_reason` | ✅ Dialog on detail page (S12) | S12 |
| 7 | **REMINDER_CALL** | Daily for CALL_TODAY deployments | call outcome, notes | `call_status` | ✅ Dialog on detail page (S12) | S12 |
| 8 | **LOCK** | Low — anti-fraud vehicle lock for overdue | notes | `lock_status='Locked'`, `lock_date`, `status='LOCKED'` | ✅ Dialog on detail page (S12) | S12 |
| 9 | **UNLOCK** | Low — reverse lock after resolution | notes | `lock_status='Unlocked'` | ✅ Dialog on detail page (S12) | S12 |

Legend: ✅ = write UI shipped | ❌ = schema + helper ready, UI not yet built

### Admin correction event (not one of the original 9)

| # | Event type | Who | Required fields | Deployment columns patched | Web UI | Module |
|---|---|---|---|---|---|---|
| 10 | **DEPLOY_DATE_EDIT** | CMD only | new deploy date, **reason** | `deploy_date` → new (due_date auto-recalcs); also shifts the initial PAYMENT/DEPOSIT `event_date` from the old to the new date; old/new stored in `old_value`/`new_value` | ✅ CMD-only dialog on detail page (S17) | S17 |

---

## The daily loop

From the Excel template's HOW-TO sheet:

1. **Open dashboard** → read **LOCK NOW / AT RISK / CALL TODAY** counts
2. **Go to deployments list** → filter by action priority → work **red
   first**, then amber, then yellow
3. **For each rider row**: take the action (collect payment, make call,
   lock, etc.) → log the event via the detail page dialog →
   `logActivityEvent()` patches the deployment → row re-computes its
   action badge through `deployments_enriched`
4. **Status drift can't happen** in the web app because
   `logActivityEvent()` patches both tables in one call. The Excel
   template relied on a "Status Alert" formula to catch drift; we
   prevent it at write time instead.

---

## Audit safeguards

### Payment validation — txn ID gates the money

`deployment_totals` view sums PAYMENT rows only where `transaction_id IS
NOT NULL` — the #1 financial control from the Excel template
(`build_template_v2.py:863`): _"no Txn ID, no validated payment."_ Do
not change this DB filter without explicit sign-off from the CMD.

As of S17 (migration 0024) the Txn ID is also **mandatory in the UI** for
payment & deposit (payment modes are UPI / Mobile App, which always have a
reference), so entries always carry one and count. The DB filter stays as the
safeguard. **Balance (S17, migration 0025):** the deposit is part of Total Due,
so `balance = total_due − rent paid − deposit collected` and `total_paid` shows
rent + deposit collected.

### Deposit carry-forward

When a rider returns vehicle A and immediately takes vehicle B with the
same deposit carried over, record **two** activity_log events sharing a
`transaction_id = 'CARRY-{uuid}'`:

1. DEPOSIT_REFUND on deployment A → `refundStatus = 'Carried Forward'`
2. DEPOSIT on deployment B → set B's `new_deposit_needed = false`

The money trail is preserved; B's Total Due correctly excludes the
deposit.

---

## Data model sketch

```
deployments ──────────────── activity_log
│                            │
│ id (PK)                    │ id (PK)
│ rider_id (FK→riders)       │ deployment_id (FK→deployments)
│ vehicle_id (FK→vehicles)   │ event_type (enum: 9 types above)
│ hub_id (FK→hubs)           │ event_date
│ deploy_date                │ amount_inr
│ weeks                      │ transaction_id  ← gates Total Paid
│ rate_inr                   │ additional_transaction_id
│ deposit_required_inr       │ week_number
│ new_deposit_needed         │ old_vehicle_id / new_vehicle_id
│ deposit_refund_status      │ old_vtd / new_vtd
│ status (canonical)         │ reason
│ call_status                │ extra_weeks
│ lock_status, lock_date     │ call_outcome
│ return_date, return_reason │ notes
│ due_date (GENERATED)       │ created_at / created_by (audit)
│                            │
└── deployments_enriched ───── deployment_totals
    (view: joins riders,       (view: SUMs from activity_log
     vehicles, hubs,            with transaction_id IS NOT NULL)
     computes action/pay_status/days_left/balance)
```
