import { createClient } from "@/lib/supabase/server"

export type RiderRow = {
  id: string
  legacy_rider_id: string | null
  app_rider_id: string | null
  name: string
  phone: string
  address: string | null
  id_proof_url: string | null
  photo_url: string | null
  source: string | null
  location_id: number | null
  current_location: string | null
  alt_contact_name: string | null
  alt_contact_number: string | null
  purpose: string | null
  notes: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
}

/**
 * All helpers apply `deleted_at IS NULL` so soft-deleted rows never leak into
 * the UI. No caller should bypass these helpers for core CRUD.
 */

export async function listRiders() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("riders")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as RiderRow[]
}

export async function getRider(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("riders")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) throw error
  return data as unknown as RiderRow | null
}

/**
 * Riders eligible for a new deployment: those without an ACTIVE deployment.
 * Mirrors listAvailableVehicles() — a rider can hold only one ACTIVE
 * deployment at a time (invariant #3, deployments_active_rider_uniq).
 * Riders whose deployments are RETURNED/CANCELLED (or who have none) are free.
 */
export async function listRidersWithoutActiveDeployment() {
  const supabase = createClient()
  const [ridersRes, activeRes] = await Promise.all([
    supabase
      .from("riders")
      .select("id, name, phone, app_rider_id")
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("deployments")
      .select("rider_id")
      .eq("status", "ACTIVE")
      .is("deleted_at", null),
  ])
  if (ridersRes.error) throw ridersRes.error
  if (activeRes.error) throw activeRes.error
  const active = new Set(
    (activeRes.data ?? []).map((d) => (d as { rider_id: string }).rider_id)
  )
  return (ridersRes.data ?? []).filter(
    (r) => !active.has((r as { id: string }).id)
  ) as Array<{
    id: string
    name: string
    phone: string
    app_rider_id: string | null
  }>
}

export async function findRiderByPhone(phone: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("riders")
    .select("id,name,phone")
    .eq("phone", phone)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) throw error
  return data as unknown as { id: string; name: string; phone: string } | null
}
