import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getVehicle } from "@/lib/db/vehicles"
import { listVehicleTypes } from "@/lib/db/hubs"
import { vehicleCreateSchema } from "@/lib/validation/vehicle"

export const metadata = {
  title: "Edit vehicle · Transcil Fleet Ops",
}

async function updateVehicle(id: string, formData: FormData) {
  "use server"

  const parsed = vehicleCreateSchema.safeParse({
    vtd_no: formData.get("vtd_no"),
    vehicle_id: formData.get("vehicle_id") ?? "",
    vehicle_type_id: formData.get("vehicle_type_id"),
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
      vehicle_id: input.vehicle_id || null,
      vehicle_type_id: input.vehicle_type_id,
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

  const types = await listVehicleTypes()
  const action = updateVehicle.bind(null, params.id)

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit vehicle</h1>
        <Link
          href="/admin/vehicles"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back
        </Link>
      </div>

      {searchParams.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {searchParams.error}
        </div>
      ) : null}

      <form
        action={action}
        className="space-y-5 rounded-lg border bg-background p-6 shadow-sm"
      >
        <Field
          label="VTD number"
          name="vtd_no"
          required
          defaultValue={vehicle.vtd_no}
        />
        <Field
          label="Vehicle ID"
          name="vehicle_id"
          defaultValue={vehicle.vehicle_id ?? ""}
        />
        <div className="space-y-1">
          <label htmlFor="vehicle_type_id" className="block text-sm font-medium">
            Vehicle type *
          </label>
          <select
            id="vehicle_type_id"
            name="vehicle_type_id"
            required
            defaultValue={vehicle.vehicle_type_id}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Colour"
          name="colour"
          defaultValue={vehicle.colour ?? ""}
        />
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Link
            href="/admin/vehicles"
            className="text-sm text-muted-foreground hover:underline"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  required,
  defaultValue,
}: {
  label: string
  name: string
  required?: boolean
  defaultValue?: string
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  )
}
