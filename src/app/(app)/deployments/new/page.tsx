import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { listRiders } from "@/lib/db/riders"
import { listAvailableVehicles } from "@/lib/db/vehicles"
import { listHubs } from "@/lib/db/hubs"
import { deploymentCreateSchema } from "@/lib/validation/deployment"

export const metadata = {
  title: "New deployment · Transcil Fleet Ops",
}

async function createDeployment(formData: FormData) {
  "use server"

  const parsed = deploymentCreateSchema.safeParse({
    rider_id: formData.get("rider_id"),
    vehicle_id: formData.get("vehicle_id"),
    hub_id: formData.get("hub_id"),
    deploy_date: formData.get("deploy_date"),
    weeks: formData.get("weeks"),
    rate_inr: formData.get("rate_inr"),
    deposit_required_inr: formData.get("deposit_required_inr") ?? 0,
    new_deposit_needed: formData.get("new_deposit_needed") === "on",
    notes: formData.get("notes") ?? "",
  })

  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ")
    redirect(`/deployments/new?error=${encodeURIComponent(msg)}`)
  }

  const input = parsed.data
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id

  const { data: row, error } = await supabase
    .from("deployments")
    .insert({
      rider_id: input.rider_id,
      vehicle_id: input.vehicle_id,
      hub_id: input.hub_id,
      deploy_date: input.deploy_date,
      weeks: input.weeks,
      rate_inr: input.rate_inr,
      deposit_required_inr: input.deposit_required_inr,
      new_deposit_needed: input.new_deposit_needed,
      notes: input.notes || null,
      status: "ACTIVE",
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .maybeSingle()

  if (error) {
    // Partial unique index violations — see 0004_generated_columns_indexes.sql
    const friendly = error.message.includes("deployments_active_vehicle_uniq")
      ? "This vehicle is already in an active deployment. Refresh the list."
      : error.message.includes("deployments_active_rider_uniq")
        ? "This rider already has an active deployment. Refresh the list."
        : error.message
    redirect(`/deployments/new?error=${encodeURIComponent(friendly)}`)
  }

  revalidatePath("/deployments")
  if (row) redirect(`/deployments/${(row as { id: string }).id}`)
  redirect("/deployments")
}

export default async function NewDeploymentPage({
  searchParams,
}: {
  searchParams: { error?: string; rider?: string }
}) {
  const [riders, vehicles, hubs] = await Promise.all([
    listRiders(),
    listAvailableVehicles(),
    listHubs(),
  ])

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New deployment</h1>
          <p className="text-sm text-muted-foreground">
            Vehicle list shows only currently-available vehicles.
          </p>
        </div>
        <Link
          href="/deployments"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to list
        </Link>
      </div>

      {searchParams.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {searchParams.error}
        </div>
      ) : null}

      <form
        action={createDeployment}
        className="space-y-5 rounded-lg border bg-background p-6 shadow-sm"
      >
        <SelectField
          label="Rider"
          name="rider_id"
          required
          defaultValue={searchParams.rider}
        >
          <option value="">Select a rider…</option>
          {riders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} — {r.phone}
            </option>
          ))}
        </SelectField>

        <SelectField label="Vehicle" name="vehicle_id" required>
          <option value="">Select a vehicle…</option>
          {vehicles.length === 0 ? (
            <option disabled value="">
              No vehicles available — add some under Admin → Vehicles
            </option>
          ) : (
            vehicles.map((v: Record<string, unknown>) => (
              <option key={v.id as string} value={v.id as string}>
                {(v.vtd_no as string) ?? ""}
                {v.vehicle_id ? ` · ${v.vehicle_id as string}` : ""}
                {v.colour ? ` · ${v.colour as string}` : ""}
              </option>
            ))
          )}
        </SelectField>

        <SelectField label="Hub" name="hub_id" required>
          <option value="">Select a hub…</option>
          {hubs.map((h) => (
            <option key={h.id} value={h.id}>
              {h.code} — {h.name}
            </option>
          ))}
        </SelectField>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label="Deploy date"
            name="deploy_date"
            type="date"
            defaultValue={today}
            required
          />
          <Field
            label="Weeks"
            name="weeks"
            type="number"
            inputProps={{ min: 1, max: 52 }}
            defaultValue="4"
            required
          />
          <Field
            label="Rate (₹/week)"
            name="rate_inr"
            type="number"
            inputProps={{ min: 0, step: "0.01" }}
            defaultValue="1500"
            required
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Deposit required (₹)"
            name="deposit_required_inr"
            type="number"
            inputProps={{ min: 0, step: "0.01" }}
            defaultValue="3000"
          />
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="new_deposit_needed"
                defaultChecked
                className="size-4"
              />
              New deposit needed
              <span className="text-xs text-muted-foreground">
                (uncheck if carried forward)
              </span>
            </label>
          </div>
        </div>

        <TextareaField label="Notes" name="notes" />

        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Link
            href="/deployments"
            className="text-sm text-muted-foreground hover:underline"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create deployment
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  inputProps,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  defaultValue?: string
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
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
        type={type}
        required={required}
        defaultValue={defaultValue}
        {...inputProps}
        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  )
}

function SelectField({
  label,
  name,
  required,
  children,
  defaultValue,
}: {
  label: string
  name: string
  required?: boolean
  children: React.ReactNode
  defaultValue?: string
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required ? " *" : ""}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </select>
    </div>
  )
}

function TextareaField({ label, name }: { label: string; name: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={3}
        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  )
}
