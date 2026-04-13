import { createClient } from "@/lib/supabase/server"

export type VehicleRow = {
  id: string
  vtd_no: string
  vehicle_id: string | null
  vehicle_type_id: number
  hub_id: number | null
  colour: string | null
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
 * Vehicles available to deploy right now. "Available" is defined as
 * the absence of an ACTIVE, non-deleted deployment for the vehicle.
 * This is the single source of truth — see 0004 partial unique index.
 */
export async function listAvailableVehicles() {
  const supabase = createClient()
  // Two-step query: pull all non-deleted vehicles, then the set of
  // vehicle_ids that currently have an ACTIVE deployment.
  const [vehiclesRes, inUseRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, vtd_no, vehicle_id, colour, vehicle_types(name)")
      .is("deleted_at", null)
      .order("vtd_no", { ascending: true }),
    supabase
      .from("deployments")
      .select("vehicle_id")
      .eq("status", "ACTIVE")
      .is("deleted_at", null),
  ])
  if (vehiclesRes.error) throw vehiclesRes.error
  if (inUseRes.error) throw inUseRes.error
  const inUse = new Set((inUseRes.data ?? []).map((d) => (d as { vehicle_id: string }).vehicle_id))
  return (vehiclesRes.data ?? []).filter(
    (v) => !inUse.has((v as unknown as { id: string }).id)
  )
}
