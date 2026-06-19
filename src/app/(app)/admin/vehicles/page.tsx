import Link from "next/link"
import { Plus, Bike } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { getCurrentRole } from "@/lib/auth/role"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { VehiclesTable, type VehicleRow } from "@/components/tables/vehicles-table"

export const metadata = {
  title: "Vehicles · Admin · Transcil Fleet Ops",
}

export default async function VehiclesAdminPage() {
  const supabase = createClient()
  const isCmd = (await getCurrentRole()) === "CMD"

  const [vehRes, activeRes] = await Promise.all([
    supabase
      .from("vehicles_enriched")
      .select("id, vtd_no, vehicle_id, chassis_no, colour, service_status, business_type, hub_id, created_by_name, vehicle_type_name, hub_code, hub_name, effective_status")
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
    chassis_no: string | null
    colour: string | null
    service_status: string
    business_type: string
    hub_id: number | null
    created_by_name: string | null
    vehicle_type_name: string | null
    hub_code: string | null
    hub_name: string | null
    effective_status: string
  }>

  const rows: VehicleRow[] = vehicles.map((v) => {
    const active = activeByVehicle.get(v.id)
    return {
      id: v.id,
      vtd_no: v.vtd_no,
      vehicle_id: v.vehicle_id,
      chassis_no: v.chassis_no,
      colour: v.colour,
      service_status: v.service_status,
      business_type: v.business_type,
      effective_status: v.effective_status,
      created_by_name: v.created_by_name,
      type_name: v.vehicle_type_name ?? null,
      hub_name: v.hub_code ? `${v.hub_code} — ${v.hub_name}` : v.hub_name ?? null,
      active_rider: active?.rider_name ?? null,
      active_days_left: active?.days_left ?? null,
    }
  })

  const inUse = rows.filter((r) => r.effective_status === "In Use").length
  const available = rows.filter((r) => r.effective_status === "Available").length
  const outOfService = rows.length - inUse - available

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Admin" }, { label: "Vehicles" }]}
        title="Vehicles"
        description={`${rows.length} total · ${available} available · ${inUse} in use${outOfService ? ` · ${outOfService} out of service` : ""}.`}
        action={
          <Button render={<Link href="/admin/vehicles/new" />}>
            <Plus /> New vehicle
          </Button>
        }
      />

      <VehiclesTable
        rows={rows}
        canManage={isCmd}
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
