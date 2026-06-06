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
  vtd_no: string | null
  vehicle_serial: string | null
  hub_name: string | null
  hub_code: string | null
  total_due: number | null
  total_paid: number | null
  deposit_collected: number | null
  deposit_refunded: number | null
  deposit_net: number | null
  balance: number | null
  pay_status: "PAID" | "PARTIAL" | "OVERDUE" | "PENDING" | null
  days_left: number | null
  action: "LOCK_NOW" | "AT_RISK" | "CALL_TODAY" | "UPCOMING" | "OK" | null
  created_at: string
  updated_at: string
}

export async function listDeployments() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("deployments_enriched")
    .select("*")
    .order("due_date", { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as DeploymentEnrichedRow[]
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
