import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Vehicles · Admin · Transcil Fleet Ops",
}

export default async function VehiclesAdminPage() {
  const supabase = createClient()

  // Pull vehicles joined with their type, and separately find which
  // vehicle_ids currently have an active deployment so the availability
  // column matches the derived source of truth.
  const [vehRes, activeRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, vtd_no, vehicle_id, colour, vehicle_types(name)")
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
    vehicle_types: { name: string } | null
  }>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vehicles</h1>
          <p className="text-sm text-muted-foreground">
            CMD-only admin. {vehicles.length} vehicle
            {vehicles.length === 1 ? "" : "s"} on file.
          </p>
        </div>
        <Link
          href="/admin/vehicles/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New vehicle
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">VTD</th>
              <th className="px-4 py-3 text-left font-medium">Vehicle ID</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Colour</th>
              <th className="px-4 py-3 text-left font-medium">Availability</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {vehicles.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No vehicles yet. Add the first one with the button above.
                </td>
              </tr>
            ) : (
              vehicles.map((v) => {
                const active = activeByVehicle.get(v.id)
                return (
                  <tr key={v.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/admin/vehicles/${v.id}`}
                        className="font-medium hover:underline"
                      >
                        {v.vtd_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {v.vehicle_id ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {v.vehicle_types?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {v.colour ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {active ? (
                        <span className="text-destructive">
                          In use · {active.rider_name ?? "—"} ·{" "}
                          {active.days_left ?? "—"} days left
                        </span>
                      ) : (
                        <span className="text-emerald-700">Available</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
