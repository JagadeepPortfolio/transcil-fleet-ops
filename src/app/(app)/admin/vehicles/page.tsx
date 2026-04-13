import Link from "next/link"
import { Plus, Bike } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { VehiclesTable, type VehicleRow } from "@/components/tables/vehicles-table"

export const metadata = {
  title: "Vehicles · Admin · Transcil Fleet Ops",
}

export default async function VehiclesAdminPage() {
  const supabase = createClient()

  const [vehRes, activeRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, vtd_no, vehicle_id, colour, hub_id, vehicle_types(name), hubs(code, name)")
      .is("deleted_at", null)
      .order("vtd_no", { ascending: true }),
    supabase
      .from("deployments_enriched")
      .select("vehicle_id, rider_name, days_left")
      .eq("status", "ACTIVE"),
  ])

  const activeByVehicle = new Map<
    string,
    { rider_name: string | null; days_left: number | null }
  >()
  for (const row of (activeRes.data ?? []) as Array<{
    vehicle_id: string
    rider_name: string | null
    days_left: number | null
  }>) {
    activeByVehicle.set(row.vehicle_id, {
      rider_name: row.rider_name,
      days_left: row.days_left,
    })
  }

  const vehicles = (vehRes.data ?? []) as Array<{
    id: string
    vtd_no: string
    vehicle_id: string | null
    colour: string | null
    hub_id: number | null
    vehicle_types: { name: string } | null
    hubs: { code: string; name: string } | null
  }>

  const rows: VehicleRow[] = vehicles.map((v) => {
    const active = activeByVehicle.get(v.id)
    return {
      id: v.id,
      vtd_no: v.vtd_no,
      vehicle_id: v.vehicle_id,
      colour: v.colour,
      type_name: v.vehicle_types?.name ?? null,
      hub_name: v.hubs ? `${v.hubs.code} — ${v.hubs.name}` : null,
      active_rider: active?.rider_name ?? null,
      active_days_left: active?.days_left ?? null,
    }
  })

  const inUse = rows.filter((r) => r.active_rider).length
  const available = rows.length - inUse

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Admin" }, { label: "Vehicles" }]}
        title="Vehicles"
        description={`CMD only · ${rows.length} total · ${available} available · ${inUse} in use.`}
        action={
          <Button render={<Link href="/admin/vehicles/new" />}>
            <Plus /> New vehicle
          </Button>
        }
      />

      <VehiclesTable
        rows={rows}
        emptyState={
          <EmptyState
            icon={<Bike />}
            title="No vehicles yet"
            description="Add the first vehicle. Deployments can only be created against registered VTDs."
            action={
              <Button render={<Link href="/admin/vehicles/new" />}>
                <Plus /> New vehicle
              </Button>
            }
          />
        }
      />
    </div>
  )
}
