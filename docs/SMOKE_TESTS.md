# Smoke test plan

Run after each session or before a deploy. Two phases: automated (CI or
manual) and human-driven (browser walkthrough).

---

## Phase A — automated checks

Run these from the repo root:

```bash
# Type check
pnpm typecheck

# Production build
pnpm build

# DB integrity (needs .env.local with service-role key)
node scripts/smoke-db.mjs

# Infra / routing (needs dev server running)
curl -sS http://localhost:3000/api/health          # → 200 {ok:true}
curl -sS -o /dev/null -w "%{http_code}" http://localhost:3000/              # → 307
curl -sS -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard     # → 307
curl -sS -o /dev/null -w "%{http_code}" http://localhost:3000/favicon.ico   # → 200
```

`scripts/smoke-db.mjs` checks:
1. `deployments_enriched` view returns rows with `action` + `pay_status`
2. Seed row counts: riders=5, deployments=2, vehicles=3, hubs=6
3. CMD `app_users` row exists with `role='CMD'`
4. Partial unique index blocks duplicate ACTIVE deployment
5. RLS blocks anon key read of `riders`
6. Reference tables seeded (locations / hubs / vehicle_types)

---

## Phase B — browser walkthrough

Login: `cmd@transcil.local` / your password.

### Auth
- [ ] Wrong password → inline error
- [ ] Correct password → lands on `/dashboard`
- [ ] Sign out → back to `/login`
- [ ] After sign-out, direct URL to `/dashboard` → bounced to `/login`

### Dashboard
- [ ] 3 KPI cards: Active deployments / Riders / Vehicles with correct
      counts
- [ ] 3 alert cards: Lock now / At risk / Call today — Lock now should
      be ≥1 (seed has an overdue deployment)
- [ ] "Most urgent" list shows overdue rider at the top

### Riders
- [ ] `/riders` list shows 5+ rows in DataTable
- [ ] Sort by name, filter by typing in the search input
- [ ] Click a rider → detail page shows info grid + deployment history
- [ ] Create a new rider with valid data → redirect to detail
- [ ] Duplicate phone → friendly "already registered" error
- [ ] Invalid phone (5 digits) → validation error

### Deployments
- [ ] `/deployments` list with ActionBadge + PayStatusBadge
- [ ] Click a row → detail page with headline status card
- [ ] Create a deployment for a free rider + vehicle → success
- [ ] Try to deploy an already-in-use vehicle → "vehicle no longer
      available"
- [ ] Try to deploy a rider who already has an active deployment → same

### Deployment detail — S12 collection loop
- [ ] "Quick actions" card visible for ACTIVE deployments
- [ ] **Record payment**: amount=1500, week #=1, txn ID=`UPI-TEST-001`
      → timeline updates, Total Paid + Balance update
- [ ] Payment without txn ID → appears in timeline but Total Paid stays
      unchanged (audit safeguard)
- [ ] **Record deposit**: amount=3000, txn ID=`DEP-001` → deposit
      columns update in the enriched view
- [ ] **Refund deposit**: amount=3000, status=Refunded, txn ID=`REF-001`
      → `deposit_refund_status` flips to Refunded
- [ ] **Log reminder call**: outcome=Called-Will Return, notes → timeline
      shows, call_status updates on the deployment

### Admin Vehicles
- [ ] `/admin/vehicles` shows 3+ rows with availability
- [ ] Create vehicle VTD `VTD-SMOKE-001` → success
- [ ] Duplicate VTD → unique violation error
- [ ] Edit a vehicle → change persists

### Command palette (Cmd+K)
- [ ] ⌘K from anywhere → palette opens
- [ ] Type a rider name → rider appears
- [ ] ArrowDown / Enter → navigates
- [ ] ESC → closes

### Mobile shell (narrow window < 768px)
- [ ] Sidebar hides, bottom tab bar appears
- [ ] Each tab navigates correctly
- [ ] Search tab opens Cmd+K palette

### Branding
- [ ] Login page shows Transcil wordmark + pin
- [ ] Sidebar shows pin icon + "Transcil / Fleet Ops"
- [ ] Browser tab favicon is the pin
