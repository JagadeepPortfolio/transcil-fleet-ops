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
    .order("id", { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as HubRow[]
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
