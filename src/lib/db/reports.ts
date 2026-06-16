import { createClient } from "@/lib/supabase/server"
import type { DeploymentEnrichedRow } from "./deployments"

/**
 * Report query helpers.
 *
 * These read from `deployments_enriched` and `activity_log` — the same
 * views/tables the rest of the app uses. No new DB objects needed.
 *
 * All queries respect `deleted_at IS NULL` via the view or explicit filter.
 */

// ─────────────────────────────────────────────────────────────────────────
//  Operations overview — deployments trend + counts + collections, by period
// ─────────────────────────────────────────────────────────────────────────

export type Granularity = "week" | "month" | "year"

export type OverviewTrendPoint = {
  label: string
  individual: number
  threePL: number
}

export type OperationsOverview = {
  granularity: Granularity
  anchor: string // normalised to the period start (YYYY-MM-DD)
  periodLabel: string
  trend: OverviewTrendPoint[]
  counts: {
    newTotal: number
    newIndividual: number
    newThreePL: number
    returned: number
    replaced: number
    activeIndividual: number
    activeThreePL: number
  }
  collections: {
    depositsCollected: number
    rentCollected: number
    outstandingDue: number
  }
}

export async function getOperationsOverview(
  granularity: Granularity,
  anchor: string
): Promise<OperationsOverview> {
  const supabase = createClient()

  // Calendar-date math in UTC. deploy_date / return_date / event_date are
  // plain `date` columns (no time), so ISO YYYY-MM-DD strings compare and
  // bucket correctly without timezone conversion.
  const toYMD = (d: Date) => d.toISOString().slice(0, 10)
  const parseYMD = (s: string) => {
    const [y, m, d] = s.split("-").map(Number)
    return new Date(Date.UTC(y, m - 1, d))
  }

  // Start of the period that contains `d`.
  const periodStart = (g: Granularity, d: Date): Date => {
    if (g === "week") {
      const x = new Date(d)
      const diff = (x.getUTCDay() + 6) % 7 // days since Monday (Mon-start week)
      x.setUTCDate(x.getUTCDate() - diff)
      return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()))
    }
    if (g === "month") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    return new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  }

  // The period start `n` periods before `start` (n may be negative for forward).
  const stepBack = (g: Granularity, start: Date, n: number): Date => {
    if (g === "week") {
      const x = new Date(start)
      x.setUTCDate(x.getUTCDate() - n * 7)
      return x
    }
    if (g === "month")
      return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - n, 1))
    return new Date(Date.UTC(start.getUTCFullYear() - n, 0, 1))
  }
  const nextPeriod = (g: Granularity, start: Date) => stepBack(g, start, -1)

  const labelFor = (g: Granularity, start: Date): string => {
    if (g === "week")
      return start.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })
    if (g === "month")
      return start.toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" })
    return String(start.getUTCFullYear())
  }

  const selStart = periodStart(granularity, parseYMD(anchor))
  const selEnd = nextPeriod(granularity, selStart)
  const selStartYMD = toYMD(selStart)
  const selEndYMD = toYMD(selEnd)

  const periodLabel = (() => {
    if (granularity === "week") {
      const last = new Date(selEnd)
      last.setUTCDate(last.getUTCDate() - 1)
      const a = selStart.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })
      const b = last.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
      return `${a} – ${b}`
    }
    if (granularity === "month")
      return selStart.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })
    return String(selStart.getUTCFullYear())
  })()

  // Trend window: last N periods ending at (and including) the selected period.
  const N = granularity === "year" ? 5 : 12
  const buckets: { label: string; startYMD: string; endYMD: string }[] = []
  for (let i = N - 1; i >= 0; i--) {
    const s = stepBack(granularity, selStart, i)
    const e = nextPeriod(granularity, s)
    buckets.push({ label: labelFor(granularity, s), startYMD: toYMD(s), endYMD: toYMD(e) })
  }

  const [deploymentsRes, activityRes] = await Promise.all([
    supabase.from("deployments_enriched").select("*"),
    // Money/lifecycle events in the SELECTED period only.
    supabase
      .from("activity_log")
      .select("event_type, amount_inr, transaction_id, payment_category, event_date")
      .gte("event_date", selStartYMD)
      .lt("event_date", selEndYMD)
      .is("deleted_at", null),
  ])
  if (deploymentsRes.error) throw deploymentsRes.error
  if (activityRes.error) throw activityRes.error

  const deployments = (deploymentsRes.data ?? []) as unknown as DeploymentEnrichedRow[]
  const events = activityRes.data ?? []

  // Trend: deployments by deploy_date per bucket, split Individual vs 3PL.
  const trend: OverviewTrendPoint[] = buckets.map((b) => {
    let individual = 0
    let threePL = 0
    for (const d of deployments) {
      if (d.deploy_date >= b.startYMD && d.deploy_date < b.endYMD) {
        if (d.billing_exempt) threePL++
        else individual++
      }
    }
    return { label: b.label, individual, threePL }
  })

  // Counts: flows (new/returned) scoped to the selected period; active is a
  // live snapshot (a state, not a flow). Replaced = REPLACEMENT events in period.
  let newIndividual = 0
  let newThreePL = 0
  let returned = 0
  let activeIndividual = 0
  let activeThreePL = 0
  for (const d of deployments) {
    if (d.deploy_date >= selStartYMD && d.deploy_date < selEndYMD) {
      if (d.billing_exempt) newThreePL++
      else newIndividual++
    }
    if (
      d.status === "RETURNED" &&
      d.return_date &&
      d.return_date >= selStartYMD &&
      d.return_date < selEndYMD
    ) {
      returned++
    }
    if (d.status === "ACTIVE" || d.status === "LOCKED") {
      if (d.billing_exempt) activeThreePL++
      else activeIndividual++
    }
  }
  const replaced = events.filter((e) => e.event_type === "REPLACEMENT").length

  // Collections in the selected period (Individual by nature — 3PL is exempt).
  const depositsCollected = events
    .filter((e) => e.event_type === "DEPOSIT" && e.transaction_id)
    .reduce((s, e) => s + (Number(e.amount_inr) || 0), 0)
  const rentCollected = events
    .filter(
      (e) =>
        e.event_type === "PAYMENT" &&
        e.transaction_id &&
        e.payment_category !== "Late fee"
    )
    .reduce((s, e) => s + (Number(e.amount_inr) || 0), 0)
  // Outstanding is a live figure: unpaid balance across active Individual units.
  const outstandingDue = deployments
    .filter((d) => (d.status === "ACTIVE" || d.status === "LOCKED") && !d.billing_exempt)
    .reduce((s, d) => s + Math.max(0, d.balance ?? 0), 0)

  return {
    granularity,
    anchor: selStartYMD,
    periodLabel,
    trend,
    counts: {
      newTotal: newIndividual + newThreePL,
      newIndividual,
      newThreePL,
      returned,
      replaced,
      activeIndividual,
      activeThreePL,
    },
    collections: { depositsCollected, rentCollected, outstandingDue },
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  Outstanding balances — ageing buckets
// ─────────────────────────────────────────────────────────────────────────

export type AgeingBucket = "current" | "1_7" | "8_14" | "15_30" | "30_plus"

export type OutstandingRow = DeploymentEnrichedRow & {
  bucket: AgeingBucket
}

export async function getOutstandingBalances(): Promise<OutstandingRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("deployments_enriched")
    .select("*")
    .eq("status", "ACTIVE")
    .order("days_left", { ascending: true })

  if (error) throw error

  return ((data ?? []) as unknown as DeploymentEnrichedRow[])
    .filter((d) => (d.balance ?? 0) > 0 && !d.billing_exempt)
    .map((d) => {
      const overdueDays =
        d.days_left != null && d.days_left < 0 ? Math.abs(d.days_left) : 0
      let bucket: AgeingBucket = "current"
      if (overdueDays >= 30) bucket = "30_plus"
      else if (overdueDays >= 15) bucket = "15_30"
      else if (overdueDays >= 8) bucket = "8_14"
      else if (overdueDays >= 1) bucket = "1_7"
      return { ...d, bucket }
    })
}

// ─────────────────────────────────────────────────────────────────────────
//  Hub performance
// ─────────────────────────────────────────────────────────────────────────

export type HubPerformance = {
  hubId: number
  hubName: string
  activeDeployments: number
  totalVehicles: number
  utilizationPct: number
  totalCollected: number
  totalDue: number
  collectionPct: number
  overdueCount: number
  avgDaysLeft: number | null
}

export async function getHubPerformance(
  year: number,
  month: number
): Promise<HubPerformance[]> {
  const supabase = createClient()
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`

  const [deploymentsRes, hubsRes, activityRes, vehiclesRes] = await Promise.all([
    supabase.from("deployments_enriched").select("*"),
    supabase.from("hubs").select("id, name").is("deleted_at", null).order("id"),
    supabase
      .from("activity_log")
      .select("deployment_id, event_type, amount_inr, transaction_id")
      .gte("event_date", monthStart)
      .lt("event_date", monthEnd)
      .is("deleted_at", null),
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
  ])

  if (deploymentsRes.error) throw deploymentsRes.error
  if (hubsRes.error) throw hubsRes.error
  if (activityRes.error) throw activityRes.error

  const deployments = (deploymentsRes.data ?? []) as unknown as DeploymentEnrichedRow[]
  const hubs = (hubsRes.data ?? []) as { id: number; name: string }[]
  const events = activityRes.data ?? []
  const totalVehicles = vehiclesRes.count ?? 0

  // Build a deployment_id → hub_id lookup
  const depHubMap = new Map<string, number>()
  for (const d of deployments) depHubMap.set(d.id, d.hub_id)

  // Per-hub payments this month
  const hubPayments = new Map<number, number>()
  for (const e of events) {
    if (e.event_type === "PAYMENT" && e.transaction_id) {
      const hubId = depHubMap.get(e.deployment_id as string)
      if (hubId != null) {
        hubPayments.set(hubId, (hubPayments.get(hubId) ?? 0) + (Number(e.amount_inr) || 0))
      }
    }
  }

  // Distribute vehicles evenly across hubs for utilization (best approximation
  // without a vehicles.hub_id column — vehicles are hub-agnostic, deployments
  // have the hub). Use deployed-per-hub / total-vehicles as a proxy.
  const vehiclesPerHub = hubs.length > 0 ? Math.ceil(totalVehicles / hubs.length) : 0

  return hubs.map((hub) => {
    const hubDeployments = deployments.filter((d) => d.hub_id === hub.id)
    const active = hubDeployments.filter((d) => d.status === "ACTIVE")
    const overdue = active.filter(
      (d) => !d.billing_exempt && d.pay_status === "OVERDUE"
    )
    // 3PL is rent-exempt — excluded from due / collection rate (but still counts
    // toward utilization since it occupies a vehicle).
    const totalDue = active
      .filter((d) => !d.billing_exempt)
      .reduce((s, d) => s + (d.total_due ?? 0), 0)
    const collected = hubPayments.get(hub.id) ?? 0

    const daysLeftValues = active
      .map((d) => d.days_left)
      .filter((v): v is number => v != null)
    const avgDaysLeft =
      daysLeftValues.length > 0
        ? Math.round(
            daysLeftValues.reduce((a, b) => a + b, 0) / daysLeftValues.length
          )
        : null

    return {
      hubId: hub.id,
      hubName: hub.name,
      activeDeployments: active.length,
      totalVehicles: vehiclesPerHub,
      utilizationPct:
        vehiclesPerHub > 0
          ? Math.round((active.length / vehiclesPerHub) * 100)
          : 0,
      totalCollected: collected,
      totalDue,
      collectionPct:
        totalDue > 0 ? Math.round((collected / totalDue) * 100) : 0,
      overdueCount: overdue.length,
      avgDaysLeft,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────
//  Most urgent — overdue active deployments for follow-up calls
// ─────────────────────────────────────────────────────────────────────────

export type MostUrgentRow = {
  id: string
  rider_name: string | null
  vtd: string | null
  ec_no: string | null
  phone: string | null
  due_date: string | null
  days_left: number | null
}

/** ACTIVE deployments due today or past due (days_left <= 0), most overdue first. */
export async function getMostUrgent(): Promise<MostUrgentRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("deployments_enriched")
    .select("id, rider_name, rider_phone, vtd_no, vehicle_serial, due_date, days_left")
    .eq("status", "ACTIVE")
    .lte("days_left", 0)
    .order("days_left", { ascending: true })
  if (error) throw error
  return ((data ?? []) as Array<{
    id: string
    rider_name: string | null
    rider_phone: string | null
    vtd_no: string | null
    vehicle_serial: string | null
    due_date: string | null
    days_left: number | null
  }>).map((d) => ({
    id: d.id,
    rider_name: d.rider_name,
    vtd: d.vtd_no,
    ec_no: d.vehicle_serial,
    phone: d.rider_phone,
    due_date: d.due_date,
    days_left: d.days_left,
  }))
}

// ─────────────────────────────────────────────────────────────────────────
//  Daily activity — deployments, customers & money collected per day
// ─────────────────────────────────────────────────────────────────────────

export type DailyActivityRow = {
  date: string
  deployments: number
  customers: number
  newCollected: number
  prevCollected: number
  total: number
}

export type DailyActivity = {
  rows: DailyActivityRow[]
  totals: Omit<DailyActivityRow, "date">
}

function addDay(d: string): string {
  const dt = new Date(d + "T00:00:00Z")
  dt.setUTCDate(dt.getUTCDate() + 1)
  return dt.toISOString().slice(0, 10)
}

/**
 * Per-day operations summary for a date range (inclusive), both bounds as
 * YYYY-MM-DD IST business dates:
 *   deployments    — deployments started that day (deploy_date)
 *   customers      — distinct riders deployed that day
 *   newCollected   — money collected that day for deployments that STARTED that
 *                    day (deploy_date == event_date)
 *   prevCollected  — money collected that day for deployments started earlier
 *   total          — newCollected + prevCollected
 * All amounts txn-gated (transaction_id IS NOT NULL), inflows only (PAYMENT +
 * DEPOSIT; refunds excluded). The new/previous split clarifies that a day's
 * collections include ongoing weekly rent from older deployments, not just
 * that day's new ones.
 */
export async function getDailyActivity(from: string, to: string): Promise<DailyActivity> {
  const supabase = createClient()
  const [depRes, actRes] = await Promise.all([
    supabase
      .from("deployments")
      .select("deploy_date, rider_id")
      .gte("deploy_date", from)
      .lte("deploy_date", to)
      .is("deleted_at", null),
    supabase
      .from("activity_log")
      .select("event_date, amount_inr, deployments(deploy_date)")
      .in("event_type", ["PAYMENT", "DEPOSIT"])
      .not("transaction_id", "is", null)
      .gte("event_date", from)
      .lte("event_date", to)
      .is("deleted_at", null),
  ])
  if (depRes.error) throw depRes.error
  if (actRes.error) throw actRes.error

  type Agg = { deployments: number; riders: Set<string>; newCollected: number; prevCollected: number }
  const map = new Map<string, Agg>()
  const ensure = (d: string): Agg => {
    let r = map.get(d)
    if (!r) { r = { deployments: 0, riders: new Set(), newCollected: 0, prevCollected: 0 }; map.set(d, r) }
    return r
  }

  for (const d of depRes.data ?? []) {
    const row = d as { deploy_date: string; rider_id: string | null }
    const a = ensure(row.deploy_date)
    a.deployments += 1
    if (row.rider_id) a.riders.add(row.rider_id)
  }
  for (const e of actRes.data ?? []) {
    const ev = e as {
      event_date: string
      amount_inr: number | null
      deployments: { deploy_date: string | null } | null
    }
    const a = ensure(ev.event_date)
    const amt = Number(ev.amount_inr) || 0
    // "New" = the payment's deployment started on the same day it was collected.
    if (ev.deployments?.deploy_date === ev.event_date) a.newCollected += amt
    else a.prevCollected += amt
  }

  const rows: DailyActivityRow[] = []
  const totals = { deployments: 0, customers: 0, newCollected: 0, prevCollected: 0, total: 0 }
  let d = from
  let guard = 0
  while (d <= to && guard < 732) {
    const a = map.get(d)
    const deployments = a?.deployments ?? 0
    const customers = a?.riders.size ?? 0
    const newCollected = a?.newCollected ?? 0
    const prevCollected = a?.prevCollected ?? 0
    const total = newCollected + prevCollected
    rows.push({ date: d, deployments, customers, newCollected, prevCollected, total })
    totals.deployments += deployments
    totals.customers += customers
    totals.newCollected += newCollected
    totals.prevCollected += prevCollected
    totals.total += total
    d = addDay(d)
    guard += 1
  }

  return { rows, totals }
}

// ─────────────────────────────────────────────────────────────────────────
//  Daily activity — by rider source (Individual / 3PL / Camions / …)
// ─────────────────────────────────────────────────────────────────────────

export type SourceBreakdownRow = {
  source: string
  deployments: number
  active: number
  newCollected: number
  prevCollected: number
  total: number
}

export type SourceBreakdown = {
  rows: SourceBreakdownRow[]
  totals: Omit<SourceBreakdownRow, "source">
}

const SOURCE_ORDER = ["Individual", "3PL", "Camions"]

/**
 * Deployments and money collected within [from, to], split by the rider's
 * source. Deployments counted by deploy_date (all statuses, with Active broken
 * out); collections split into new (payment's deployment started that same day,
 * deploy_date == event_date) vs previous — same definition as getDailyActivity,
 * grouped by source instead of by day. Txn-gated, inflows only.
 */
export async function getDailySourceBreakdown(from: string, to: string): Promise<SourceBreakdown> {
  const supabase = createClient()
  const [depRes, actRes] = await Promise.all([
    supabase
      .from("deployments")
      .select("status, riders(source)")
      .gte("deploy_date", from)
      .lte("deploy_date", to)
      .is("deleted_at", null),
    supabase
      .from("activity_log")
      .select("event_date, amount_inr, deployments(deploy_date, riders(source))")
      .in("event_type", ["PAYMENT", "DEPOSIT"])
      .not("transaction_id", "is", null)
      .gte("event_date", from)
      .lte("event_date", to)
      .is("deleted_at", null),
  ])
  if (depRes.error) throw depRes.error
  if (actRes.error) throw actRes.error

  type Agg = { deployments: number; active: number; newCollected: number; prevCollected: number }
  const map = new Map<string, Agg>()
  const ensure = (s: string): Agg => {
    let r = map.get(s)
    if (!r) { r = { deployments: 0, active: 0, newCollected: 0, prevCollected: 0 }; map.set(s, r) }
    return r
  }

  for (const d of depRes.data ?? []) {
    const row = d as { status: string; riders: { source: string | null } | null }
    const a = ensure(row.riders?.source ?? "—")
    a.deployments += 1
    if (row.status === "ACTIVE") a.active += 1
  }
  for (const e of actRes.data ?? []) {
    const ev = e as {
      event_date: string
      amount_inr: number | null
      deployments: { deploy_date: string | null; riders: { source: string | null } | null } | null
    }
    const a = ensure(ev.deployments?.riders?.source ?? "—")
    const amt = Number(ev.amount_inr) || 0
    if (ev.deployments?.deploy_date === ev.event_date) a.newCollected += amt
    else a.prevCollected += amt
  }

  // Known sources first (even if zero), then any extras present.
  const present = Array.from(map.keys())
  const ordered = [
    ...SOURCE_ORDER,
    ...present.filter((s) => !SOURCE_ORDER.includes(s)).sort(),
  ]

  const rows: SourceBreakdownRow[] = []
  const totals = { deployments: 0, active: 0, newCollected: 0, prevCollected: 0, total: 0 }
  for (const source of ordered) {
    const a = map.get(source)
    if (!a && !SOURCE_ORDER.includes(source)) continue
    const deployments = a?.deployments ?? 0
    const active = a?.active ?? 0
    const newCollected = a?.newCollected ?? 0
    const prevCollected = a?.prevCollected ?? 0
    const total = newCollected + prevCollected
    rows.push({ source, deployments, active, newCollected, prevCollected, total })
    totals.deployments += deployments
    totals.active += active
    totals.newCollected += newCollected
    totals.prevCollected += prevCollected
    totals.total += total
  }

  return { rows, totals }
}
