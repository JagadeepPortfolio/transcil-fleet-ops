import { createClient } from "@/lib/supabase/server"

export type RiderRow = {
  id: string
  legacy_rider_id: string | null
  name: string
  phone: string
  address: string | null
  id_proof_url: string | null
  photo_url: string | null
  source: string | null
  location_id: number | null
  notes: string | null
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
