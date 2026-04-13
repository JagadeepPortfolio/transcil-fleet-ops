import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { getVehicle } from "@/lib/db/vehicles"
import { listVehicleTypes, listHubs } from "@/lib/db/hubs"
import { vehicleCreateSchema } from "@/lib/validation/vehicle"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { Field, SelectField, FormError } from "@/components/ui/form-fields"

export const metadata = {
  title: "Edit vehicle · Transcil Fleet Ops",
}

async function updateVehicle(id: string, formData: FormData) {
  "use server"

  const parsed = vehicleCreateSchema.safeParse({
    vtd_no: formData.get("vtd_no"),
    vehicle_id: formData.get("vehicle_id"),
    vehicle_type_id: formData.get("vehicle_type_id"),
    hub_id: formData.get("hub_id"),
    colour: formData.get("colour") ?? "",
  })
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ")
    redirect(`/admin/vehicles/${id}?error=${encodeURIComponent(msg)}`)
  }
  const input = parsed.data

  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id

  const { error } = await supabase
    .from("vehicles")
    .update({
      vtd_no: input.vtd_no,
      vehicle_id: input.vehicle_id,
      vehicle_type_id: input.vehicle_type_id,
      hub_id: input.hub_id,
      colour: input.colour || null,
      updated_by: userId,
    })
    .eq("id", id)

  if (error) {
    redirect(
      `/admin/vehicles/${id}?error=${encodeURIComponent(error.message)}`
    )
  }

  revalidatePath("/admin/vehicles")
  redirect("/admin/vehicles")
}

export default async function EditVehiclePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const vehicle = await getVehicle(params.id)
  if (!vehicle) notFound()

  const [types, hubs] = await Promise.all([listVehicleTypes(), listHubs()])
  const action = updateVehicle.bind(null, params.id)

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Admin" },
          { label: "Vehicles", href: "/admin/vehicles" },
          { label: vehicle.vtd_no },
        ]}
        title="Edit vehicle"
        description={`Vehicle ${vehicle.vtd_no}`}
        action={
          <Button variant="ghost" render={<Link href="/admin/vehicles" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <FormError message={searchParams.error} />

      <Card>
        <form action={action} className="space-y-5 p-6">
          <Field
            label="VTD number"
            name="vtd_no"
            required
            defaultValue={vehicle.vtd_no}
          />
          <Field
            label="Vehicle No"
            name="vehicle_id"
            defaultValue={vehicle.vehicle_id ?? ""}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label="Vehicle type"
              name="vehicle_type_id"
              required
              defaultValue={String(vehicle.vehicle_type_id)}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Hub"
              name="hub_id"
              required
              defaultValue={vehicle.hub_id != null ? String(vehicle.hub_id) : ""}
            >
              <option value="">Select hub…</option>
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} — {h.name}
                </option>
              ))}
            </SelectField>
          </div>
          <Field
            label="Colour"
            name="colour"
            defaultValue={vehicle.colour ?? ""}
          />
          <div className="flex items-center justify-end gap-3 border-t pt-5">
            <Button variant="ghost" render={<Link href="/admin/vehicles" />}>
              Cancel
            </Button>
            <Button type="submit" size="lg">
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
