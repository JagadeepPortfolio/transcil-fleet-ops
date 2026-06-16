import { createClient } from "@/lib/supabase/server"

export type HubRow = {
  id: number
  code: string
  name: string
  location_id: number | null
}

export async function listHubs() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("hubs")
    .select("*")
    .is("deleted_at", null)
    .order("id", { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as HubRow[]
}

/** Id of the launch hub (Nagole), resolved by NAME — active hub codes are
 * opaque legacy ids, so the app resolves Nagole by name everywhere. Used as a
 * fallback hub for CMD users who aren't tied to a specific hub (inventory and
 * repairs are per-hub). Returns null if not found. */
export async function getDefaultHubId(): Promise<number | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("hubs")
    .select("id")
    .eq("name", "Nagole")
    .is("deleted_at", null)
    .maybeSingle()
  return (data as { id?: number } | null)?.id ?? null
}

export async function listLocations() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("locations")
    .select("id, name")
    .order("name", { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as { id: number; name: string }[]
}

export async function listVehicleTypes() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("vehicle_types")
    .select("id, name")
    .order("id", { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as { id: number; name: string }[]
}
