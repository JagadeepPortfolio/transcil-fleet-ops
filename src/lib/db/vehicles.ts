import { createClient } from "@/lib/supabase/server"

export type VehicleRow = {
  id: string
  vtd_no: string
  vehicle_id: string | null
  chassis_no: string | null
  vehicle_type_id: number
  hub_id: number | null
  colour: string | null
  service_status: string
  business_type: string
  created_at: string
  updated_at: string
}

export async function listVehicles() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("vehicles")
    .select("*, vehicle_types(name)")
    .is("deleted_at", null)
    .order("vtd_no", { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getVehicle(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) throw error
  return data as unknown as VehicleRow | null
}

/**
 * Vehicles available to deploy right now. Uses the derived effective_status from
 * `vehicles_enriched` (migration 0051): only 'Available' is deployable, which
 * correctly excludes In Use, **Locked**, Under Repair, and In Factory.
 *
 * Also **B2C-only**: B2B vehicles are not managed for deployment in this app yet,
 * so they're excluded from the deployable pool even when idle/Available (future
 * scope). `createDeployment` re-checks this server-side.
 */
export async function listAvailableVehicles() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("vehicles_enriched")
    .select("id, vtd_no, vehicle_id, colour, vehicle_type_name")
    .eq("effective_status", "Available")
    .eq("business_type", "B2C")
    .order("vtd_no", { ascending: true })
  if (error) throw error
  return data ?? []
}
