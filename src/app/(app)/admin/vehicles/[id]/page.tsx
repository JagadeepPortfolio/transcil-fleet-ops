import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { getVehicle } from "@/lib/db/vehicles"
import { listVehicleTypes, listHubs } from "@/lib/db/hubs"
import { getCurrentRole } from "@/lib/auth/role"
import { vehicleUpdateSchema, serviceStatuses } from "@/lib/validation/vehicle"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { Field, SelectField, FormError } from "@/components/ui/form-fields"

export const metadata = {
  title: "Edit vehicle · Transcil Fleet Ops",
}

async function updateVehicle(id: string, formData: FormData) {
  "use server"

  const parsed = vehicleUpdateSchema.safeParse({
    vtd_no: formData.get("vtd_no"),
    vehicle_id: formData.get("vehicle_id"),
    chassis_no: formData.get("chassis_no") ?? "",
    vehicle_type_id: formData.get("vehicle_type_id"),
    hub_id: formData.get("hub_id"),
    colour: formData.get("colour") ?? "",
    service_status: formData.get("service_status"),
  })
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ")
    redirect(`/admin/vehicles/${id}?error=${encodeURIComponent(msg)}`)
  }
  const input = parsed.data

  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id

  // Status is locked while the vehicle is In Use (has an active deployment):
  // keep the existing status and ignore any submitted value.
  const [{ data: vehRow }, { count: activeCount }] = await Promise.all([
    supabase.from("vehicles").select("service_status").eq("id", id).maybeSingle(),
    supabase
      .from("deployments")
      .select("id", { count: "exact", head: true })
      .eq("vehicle_id", id)
      .eq("status", "ACTIVE")
      .is("deleted_at", null),
  ])
  const currentStatus = (vehRow as { service_status?: string } | null)?.service_status ?? "Available"
  const isInUse = (activeCount ?? 0) > 0
  const effectiveStatus = isInUse ? currentStatus : input.service_status ?? currentStatus

  const { error } = await supabase
    .from("vehicles")
    .update({
      vtd_no: input.vtd_no,
      vehicle_id: input.vehicle_id,
      chassis_no: input.chassis_no || null,
      vehicle_type_id: input.vehicle_type_id,
      hub_id: input.hub_id,
      colour: input.colour || null,
      service_status: effectiveStatus,
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
  // Editing vehicles is CMD-only; staff can view the list but not write.
  if ((await getCurrentRole()) !== "CMD") redirect("/admin/vehicles")

  const vehicle = await getVehicle(params.id)
  if (!vehicle) notFound()

  const supabase = createClient()
  const [types, hubs, activeRes] = await Promise.all([
    listVehicleTypes(),
    listHubs(),
    supabase
      .from("deployments")
      .select("id", { count: "exact", head: true })
      .eq("vehicle_id", params.id)
      .eq("status", "ACTIVE")
      .is("deleted_at", null),
  ])
  const isInUse = (activeRes.count ?? 0) > 0
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
            label="EC No"
            name="vehicle_id"
            defaultValue={vehicle.vehicle_id ?? ""}
          />
          <Field
            label="Chassis No"
            name="chassis_no"
            defaultValue={vehicle.chassis_no ?? ""}
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
          {isInUse ? (
            <Field
              label="Status"
              name="service_status_display"
              defaultValue="In Use"
              inputProps={{ disabled: true }}
              uppercase={false}
              hint="Locked — the status can’t be changed while the vehicle is deployed."
            />
          ) : (
            <SelectField
              label="Status"
              name="service_status"
              required
              defaultValue={vehicle.service_status ?? "Available"}
              hint="“In Use” is set automatically when the vehicle has an active deployment."
            >
              {serviceStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectField>
          )}
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
