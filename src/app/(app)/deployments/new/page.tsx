import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { listRiders } from "@/lib/db/riders"
import { listAvailableVehicles } from "@/lib/db/vehicles"
import { listHubs } from "@/lib/db/hubs"
import { logActivityEvent } from "@/lib/db/activity-log"
import { deploymentCreateSchema } from "@/lib/validation/deployment"
import { paymentSchema, depositSchema } from "@/lib/validation/activity"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import {
  SelectField,
  TextareaField,
  FormError,
} from "@/components/ui/form-fields"
import { RentalFields } from "./rental-fields"

export const metadata = {
  title: "New deployment · Transcil Fleet Ops",
}

async function createDeployment(formData: FormData) {
  "use server"

  const parsed = deploymentCreateSchema.safeParse({
    rider_id: formData.get("rider_id"),
    vehicle_id: formData.get("vehicle_id"),
    hub_id: formData.get("hub_id"),
    rental_type: formData.get("rental_type"),
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

  // Initial payment — always recorded with the deployment.
  const payParsed = paymentSchema.safeParse({
    event_date: input.deploy_date,
    amount_inr: formData.get("payment_amount_inr"),
    payment_mode: formData.get("payment_mode"),
    week_number: formData.get("payment_week_number") ?? "",
    transaction_id: formData.get("payment_txn_id") ?? "",
  })
  if (!payParsed.success) {
    const msg = payParsed.error.issues.map((i) => i.message).join("; ")
    redirect(
      `/deployments/new?error=${encodeURIComponent(`Initial payment — ${msg}`)}`
    )
  }

  // Deposit — only when a new deposit is needed and a non-zero amount is set.
  const wantDeposit =
    input.new_deposit_needed && input.deposit_required_inr > 0
  let depParsed: ReturnType<typeof depositSchema.safeParse> | null = null
  if (wantDeposit) {
    depParsed = depositSchema.safeParse({
      event_date: input.deploy_date,
      amount_inr: input.deposit_required_inr,
      payment_mode: formData.get("deposit_mode"),
      transaction_id: formData.get("deposit_txn_id") ?? "",
    })
    if (!depParsed.success) {
      const msg = depParsed.error.issues.map((i) => i.message).join("; ")
      redirect(
        `/deployments/new?error=${encodeURIComponent(`Deposit — ${msg}`)}`
      )
    }
  }

  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id

  const { data: row, error } = await supabase
    .from("deployments")
    .insert({
      rider_id: input.rider_id,
      vehicle_id: input.vehicle_id,
      hub_id: input.hub_id,
      rental_type: input.rental_type,
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
    const friendly = error.message.includes("deployments_active_vehicle_uniq")
      ? "This vehicle is already in an active deployment. Refresh the list."
      : error.message.includes("deployments_active_rider_uniq")
        ? "This rider already has an active deployment. Refresh the list."
        : error.message
    redirect(`/deployments/new?error=${encodeURIComponent(friendly)}`)
  }

  if (!row) redirect("/deployments")
  const deploymentId = (row as { id: string }).id

  // Record the collection events through the single write path. Deposit first
  // (start-of-contract ordering), then the first payment.
  let warn: string | null = null
  try {
    if (depParsed && depParsed.success) {
      await logActivityEvent(deploymentId, {
        type: "DEPOSIT",
        eventDate: depParsed.data.event_date,
        amountInr: depParsed.data.amount_inr,
        paymentMode: depParsed.data.payment_mode,
        transactionId: depParsed.data.transaction_id,
      })
    }
    await logActivityEvent(deploymentId, {
      type: "PAYMENT",
      eventDate: payParsed.data.event_date,
      amountInr: payParsed.data.amount_inr,
      paymentMode: payParsed.data.payment_mode,
      weekNumber: payParsed.data.week_number,
      transactionId: payParsed.data.transaction_id,
    })
  } catch {
    warn =
      "Deployment created, but recording the initial payment/deposit failed — add it from the timeline below."
  }

  revalidatePath("/deployments")
  revalidatePath("/dashboard")
  revalidatePath(`/deployments/${deploymentId}`)
  redirect(
    warn
      ? `/deployments/${deploymentId}?warn=${encodeURIComponent(warn)}`
      : `/deployments/${deploymentId}`
  )
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
  const defaultHubId = hubs.find((h) => h.code === "NAG")?.id

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Deployments", href: "/deployments" },
          { label: "New" },
        ]}
        title="New deployment"
        description="Vehicle list shows only currently-available vehicles (no active deployment)."
        action={
          <Button variant="ghost" render={<Link href="/deployments" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <FormError message={searchParams.error} />

      <Card>
        <form action={createDeployment} className="space-y-5 p-6">
          <SelectField
            label="Rider"
            name="rider_id"
            required
            defaultValue={searchParams.rider}
          >
            <option value="">Select a rider…</option>
            {riders.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.phone}{r.app_rider_id ? ` (${r.app_rider_id})` : ""}
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

          <SelectField
            label="Hub"
            name="hub_id"
            required
            defaultValue={defaultHubId ? String(defaultHubId) : ""}
          >
            <option value="">Select a hub…</option>
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.code} — {h.name}
              </option>
            ))}
          </SelectField>

          <RentalFields today={today} />

          <TextareaField label="Notes" name="notes" />

          <div className="flex items-center justify-end gap-3 border-t pt-5">
            <Button variant="ghost" render={<Link href="/deployments" />}>
              Cancel
            </Button>
            <Button type="submit" size="lg">
              Create deployment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
