import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { listRidersWithoutActiveDeployment } from "@/lib/db/riders"
import { listAvailableVehicles } from "@/lib/db/vehicles"
import { listHubs } from "@/lib/db/hubs"
import { logActivityEvent } from "@/lib/db/activity-log"
import { deploymentCreateSchema } from "@/lib/validation/deployment"
import { paymentSchema, depositSchema } from "@/lib/validation/activity"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { FormError } from "@/components/ui/form-fields"
import { NewDeploymentForm } from "./new-deployment-form"

export const metadata = {
  title: "New deployment · Transcil Fleet Ops",
}

const THREE_PL_DEPOSIT = 2000

async function createDeployment(formData: FormData) {
  "use server"

  const supabase = createClient()

  // 3PL is derived from the rider's Source (source of truth, not the client):
  // a 3PL deployment has no rent — deposit only — and is billing-exempt.
  const riderId = formData.get("rider_id") as string | null
  let is3PL = false
  if (riderId) {
    const { data: r } = await supabase
      .from("riders")
      .select("source")
      .eq("id", riderId)
      .maybeSingle()
    is3PL = (r as { source?: string } | null)?.source === "3PL"
  }

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
    battery_type: formData.get("battery_type"),
    battery_number: formData.get("battery_number") ?? "",
    battery_number_2: formData.get("battery_number_2") ?? "",
    charger_cable_number: formData.get("charger_cable_number") ?? "",
    notes: formData.get("notes") ?? "",
  })

  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ")
    redirect(`/deployments/new?error=${encodeURIComponent(msg)}`)
  }

  const input = parsed.data

  // Initial payment — always recorded, EXCEPT for 3PL (no rent).
  let payParsed: ReturnType<typeof paymentSchema.safeParse> | null = null
  if (!is3PL) {
    payParsed = paymentSchema.safeParse({
      event_date: input.deploy_date,
      amount_inr: formData.get("payment_amount_inr"),
      payment_mode: formData.get("payment_mode"),
      payment_category: "Billing Cycle",
      week_number: formData.get("payment_week_number") ?? "",
      transaction_id: formData.get("payment_txn_id") ?? "",
    })
    if (!payParsed.success) {
      const msg = payParsed.error.issues.map((i) => i.message).join("; ")
      redirect(
        `/deployments/new?error=${encodeURIComponent(`Initial payment — ${msg}`)}`
      )
    }
  }

  // Deposit. 3PL always collects the fixed ₹2,000 deposit; otherwise it's the
  // requested amount when "new deposit needed" is set.
  const depositRequired = is3PL ? THREE_PL_DEPOSIT : input.deposit_required_inr
  const newDepositNeeded = is3PL ? true : input.new_deposit_needed
  const wantDeposit = newDepositNeeded && depositRequired > 0
  let depParsed: ReturnType<typeof depositSchema.safeParse> | null = null
  if (wantDeposit) {
    depParsed = depositSchema.safeParse({
      event_date: input.deploy_date,
      amount_inr: depositRequired,
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

  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes.user?.id

  const { data: row, error } = await supabase
    .from("deployments")
    .insert({
      rider_id: input.rider_id,
      vehicle_id: input.vehicle_id,
      hub_id: input.hub_id,
      rental_type: is3PL ? "Weekly" : input.rental_type,
      deploy_date: input.deploy_date,
      weeks: is3PL ? 1 : input.weeks,
      rate_inr: is3PL ? 0 : input.rate_inr,
      deposit_required_inr: depositRequired,
      new_deposit_needed: newDepositNeeded,
      billing_exempt: is3PL,
      battery_type: input.battery_type,
      battery_number: input.battery_number ?? null,
      battery_number_2: input.battery_number_2 ?? null,
      charger_cable_number: input.charger_cable_number,
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
  // (start-of-contract ordering), then the first payment (skipped for 3PL).
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
    if (payParsed && payParsed.success) {
      await logActivityEvent(deploymentId, {
        type: "PAYMENT",
        eventDate: payParsed.data.event_date,
        amountInr: payParsed.data.amount_inr,
        paymentMode: payParsed.data.payment_mode,
        paymentCategory: payParsed.data.payment_category,
        weekNumber: payParsed.data.week_number,
        transactionId: payParsed.data.transaction_id,
      })
    }
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
    listRidersWithoutActiveDeployment(),
    listAvailableVehicles(),
    listHubs(),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const defaultHubId = hubs.find((h) => h.name === "Nagole")?.id

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
        <NewDeploymentForm
          riders={riders}
          vehicles={vehicles as Array<Record<string, unknown>>}
          hubs={hubs as Array<{ id: number; code: string; name: string }>}
          today={today}
          defaultHubId={defaultHubId as number | undefined}
          defaultRider={searchParams.rider}
          action={createDeployment}
        />
      </Card>
    </div>
  )
}
