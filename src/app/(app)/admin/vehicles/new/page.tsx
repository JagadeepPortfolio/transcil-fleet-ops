import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { listVehicleTypes, listHubs } from "@/lib/db/hubs"
import { getCurrentRole } from "@/lib/auth/role"
import { vehicleCreateSchema } from "@/lib/validation/vehicle"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { FormError } from "@/components/ui/form-fields"
import { VehicleEntryFields } from "./vehicle-entry-fields"

// Vehicle type is no longer chosen in the UI; new vehicles default to
// E-Scooter. Hub is always Nagole (code "NAG").
const DEFAULT_HUB_CODE = "NAG"
const DEFAULT_VEHICLE_TYPE_NAME = "E-Scooter"

export const metadata = {
  title: "New vehicle · Transcil Fleet Ops",
}

async function createVehicle(formData: FormData) {
  "use server"

  const parsed = vehicleCreateSchema.safeParse({
    vtd_no: formData.get("vtd_no"),
    vehicle_id: formData.get("vehicle_id"),
    chassis_no: formData.get("chassis_no") ?? "",
    colour: formData.get("colour") ?? "",
  })
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ")
    redirect(`/admin/vehicles/new?error=${encodeURIComponent(msg)}`)
  }
  const input = parsed.data

  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id

  // Resolve the always-on defaults: Nagole hub + E-Scooter vehicle type.
  const [hubs, types] = await Promise.all([listHubs(), listVehicleTypes()])
  const hub = hubs.find((h) => h.code === DEFAULT_HUB_CODE) ?? hubs[0]
  const vehicleType =
    types.find((t) => t.name === DEFAULT_VEHICLE_TYPE_NAME) ?? types[0]
  if (!hub || !vehicleType) {
    redirect(
      `/admin/vehicles/new?error=${encodeURIComponent(
        "Reference data missing: no hub or vehicle type configured."
      )}`
    )
  }

  const { data: row, error } = await supabase
    .from("vehicles")
    .insert({
      vtd_no: input.vtd_no,
      vehicle_id: input.vehicle_id,
      chassis_no: input.chassis_no || null,
      vehicle_type_id: vehicleType.id,
      hub_id: hub.id,
      colour: input.colour || null,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .maybeSingle()

  if (error) {
    const friendly = error.message.includes("vehicles_vtd_no_key")
      ? `VTD ${input.vtd_no} is already on file.`
      : error.message
    redirect(`/admin/vehicles/new?error=${encodeURIComponent(friendly)}`)
  }

  revalidatePath("/admin/vehicles")
  redirect(
    row ? `/admin/vehicles/${(row as { id: string }).id}` : "/admin/vehicles"
  )
}

export default async function NewVehiclePage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  // Adding vehicles is CMD-only; staff can view the list but not write.
  if ((await getCurrentRole()) !== "CMD") redirect("/admin/vehicles")

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Admin" },
          { label: "Vehicles", href: "/admin/vehicles" },
          { label: "New" },
        ]}
        title="New vehicle"
        action={
          <Button variant="ghost" render={<Link href="/admin/vehicles" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <FormError message={searchParams.error} />

      <Card>
        <form action={createVehicle} className="space-y-5 p-6">
          <VehicleEntryFields />
          <div className="flex items-center justify-end gap-3 border-t pt-5">
            <Button variant="ghost" render={<Link href="/admin/vehicles" />}>
              Cancel
            </Button>
            <Button type="submit" size="lg">
              Create vehicle
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
