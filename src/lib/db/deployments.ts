import { createClient } from "@/lib/supabase/server"

export type DeploymentEnrichedRow = {
  id: string
  deployment_code: string | null
  rider_id: string
  vehicle_id: string
  hub_id: number
  deploy_date: string
  weeks: number
  rate_inr: number
  deposit_required_inr: number
  new_deposit_needed: boolean
  battery_type: string | null
  battery_number: string | null
  battery_number_2: string | null
  charger_cable_number: string | null
  billing_exempt: boolean
  deposit_refund_status: string
  status: "ACTIVE" | "RETURNED" | "LOCKED" | "CANCELLED"
  call_status: string | null
  call_notes: string | null
  lock_date: string | null
  lock_status: string
  return_date: string | null
  return_reason: string | null
  notes: string | null
  due_date: string
  rider_name: string | null
  rider_phone: string | null
  rider_source: string | null
  vtd_no: string | null
  vehicle_serial: string | null
  hub_name: string | null
  hub_code: string | null
  total_due: number | null
  total_paid: number | null
  deposit_collected: number | null
  deposit_refunded: number | null
  deposit_net: number | null
  late_fee_collected: number | null
  total_collected: number | null
  balance: number | null
  pay_status: "PAID" | "PARTIAL" | "OVERDUE" | "PENDING" | null
  days_left: number | null
  action: "LOCK_NOW" | "AT_RISK" | "CALL_TODAY" | "UPCOMING" | "OK" | null
  created_at: string
  updated_at: string
}

export type DeploymentStatusFilter =
  | "active_locked"
  | "active"
  | "locked"
  | "returned"
  | "cancelled"
  | "all"

export type DeploymentListResult = {
  rows: DeploymentEnrichedRow[]
  total: number
  page: number
  perPage: number
}

const STATUS_MAP: Record<DeploymentStatusFilter, string[] | null> = {
  active_locked: ["ACTIVE", "LOCKED"],
  active: ["ACTIVE"],
  locked: ["LOCKED"],
  returned: ["RETURNED"],
  cancelled: ["CANCELLED"],
  all: null,
}

/**
 * Paginated deployments list (server-side). Default scope is Active + Locked so
 * the default view stays bounded by fleet size; Returned/Cancelled/All via the
 * status filter. Search runs in the DB across rider/phone/VTD/EC/code. Each call
 * fetches one page + an exact total, so it's fast regardless of table size.
 */
export async function listDeployments(opts?: {
  status?: DeploymentStatusFilter
  q?: string
  page?: number
  perPage?: number
}): Promise<DeploymentListResult> {
  const supabase = createClient()
  const status = opts?.status ?? "active_locked"
  const page = Math.max(1, opts?.page ?? 1)
  const perPage = Math.min(200, Math.max(1, opts?.perPage ?? 50))
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = supabase
    .from("deployments_enriched")
    .select("*", { count: "exact" })

  const statuses = STATUS_MAP[status]
  if (statuses) query = query.in("status", statuses)

  const q = (opts?.q ?? "").replace(/[,()*%]/g, " ").trim()
  if (q) {
    const cols = ["rider_name", "rider_phone", "vtd_no", "vehicle_serial", "deployment_code"]
    query = query.or(cols.map((c) => `${c}.ilike.*${q}*`).join(","))
  }

  const { data, error, count } = await query
    .order("due_date", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to)
  if (error) throw error

  return {
    rows: (data ?? []) as unknown as DeploymentEnrichedRow[],
    total: count ?? 0,
    page,
    perPage,
  }
}

/**
 * Active + Locked deployments (the operational set, bounded by fleet size) for
 * the dashboard — lock-now count and the most-urgent list. Not paginated.
 */
export async function listActiveDeployments(): Promise<DeploymentEnrichedRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("deployments_enriched")
    .select("*")
    .in("status", ["ACTIVE", "LOCKED"])
    .order("due_date", { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as DeploymentEnrichedRow[]
}

/** Cheap count of deployments with a given computed action (for header alerts). */
export async function countDeploymentsByAction(
  action: "LOCK_NOW" | "AT_RISK"
): Promise<number> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from("deployments_enriched")
    .select("id", { count: "exact", head: true })
    .eq("action", action)
  if (error) throw error
  return count ?? 0
}

export async function getDeployment(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("deployments_enriched")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data as unknown as DeploymentEnrichedRow | null
}
