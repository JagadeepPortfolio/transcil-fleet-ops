import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { listVehicleTypes, listHubs } from "@/lib/db/hubs"
import { vehicleCreateSchema } from "@/lib/validation/vehicle"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { Field, SelectField, FormError } from "@/components/ui/form-fields"

export const metadata = {
  title: "New vehicle · Transcil Fleet Ops",
}

async function createVehicle(formData: FormData) {
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
    redirect(`/admin/vehicles/new?error=${encodeURIComponent(msg)}`)
  }
  const input = parsed.data

  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id

  const { data: row, error } = await supabase
    .from("vehicles")
    .insert({
      vtd_no: input.vtd_no,
      vehicle_id: input.vehicle_id,
      vehicle_type_id: input.vehicle_type_id,
      hub_id: input.hub_id,
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
  const [types, hubs] = await Promise.all([listVehicleTypes(), listHubs()])

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
          <Field label="VTD number" name="vtd_no" required />
          <Field label="Vehicle No" name="vehicle_id" required />
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label="Vehicle type" name="vehicle_type_id" required>
              <option value="">Select type…</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Hub" name="hub_id" required>
              <option value="">Select hub…</option>
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} — {h.name}
                </option>
              ))}
            </SelectField>
          </div>
          <Field label="Colour" name="colour" />
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
