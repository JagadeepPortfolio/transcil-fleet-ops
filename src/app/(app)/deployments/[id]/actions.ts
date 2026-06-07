"use server"

import { revalidatePath } from "next/cache"

import { logActivityEvent } from "@/lib/db/activity-log"
import { createClient } from "@/lib/supabase/server"
import { getCurrentRole } from "@/lib/auth/role"
import {
  paymentSchema,
  depositSchema,
  depositRefundSchema,
  reminderCallSchema,
  replacementSchema,
  extensionSchema,
  returnSchema,
  lockSchema,
  unlockSchema,
  deployDateEditSchema,
} from "@/lib/validation/activity"

/**
 * Deployment event Server Actions.
 *
 * Every action follows the same shape: bind(deploymentId), receive prior
 * state + FormData, parse with zod, delegate to logActivityEvent(), and
 * revalidate the detail page so the timeline and `deployments_enriched`
 * totals refresh. UI reads the returned { ok, error } to close the dialog
 * or surface a validation message.
 *
 * Writes go through logActivityEvent only — it enforces the
 * canonical-vs-audit-trail invariant (insert + deployment patch in one
 * call). Do NOT insert into activity_log from here directly.
 */

export type ActionState = { ok: boolean; error?: string | null }

function fieldErrors(parsed: { error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } } }) {
  const errs = parsed.error.flatten().fieldErrors
  const first = Object.entries(errs).find(([, v]) => v && v.length)
  return first ? `${first[0]}: ${first[1]?.[0]}` : "Invalid input"
}

function fd(data: FormData) {
  return Object.fromEntries(data.entries())
}

export async function recordPaymentAction(
  deploymentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = paymentSchema.safeParse(fd(formData))
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed) }

  try {
    await logActivityEvent(deploymentId, {
      type: "PAYMENT",
      eventDate: parsed.data.event_date,
      amountInr: parsed.data.amount_inr,
      paymentMode: parsed.data.payment_mode,
      weekNumber: parsed.data.week_number,
      transactionId: parsed.data.transaction_id,
      additionalTransactionId: parsed.data.additional_transaction_id,
      notes: parsed.data.notes,
    })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  revalidatePath(`/deployments/${deploymentId}`)
  revalidatePath("/deployments")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function recordDepositAction(
  deploymentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = depositSchema.safeParse(fd(formData))
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed) }

  try {
    await logActivityEvent(deploymentId, {
      type: "DEPOSIT",
      eventDate: parsed.data.event_date,
      amountInr: parsed.data.amount_inr,
      paymentMode: parsed.data.payment_mode,
      transactionId: parsed.data.transaction_id,
      notes: parsed.data.notes,
    })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  revalidatePath(`/deployments/${deploymentId}`)
  revalidatePath("/deployments")
  return { ok: true }
}

export async function refundDepositAction(
  deploymentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = depositRefundSchema.safeParse(fd(formData))
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed) }

  try {
    await logActivityEvent(deploymentId, {
      type: "DEPOSIT_REFUND",
      eventDate: parsed.data.event_date,
      amountInr: parsed.data.amount_inr,
      paymentMode: parsed.data.payment_mode,
      refundStatus: parsed.data.refund_status,
      transactionId: parsed.data.transaction_id,
      notes: parsed.data.notes,
    })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  revalidatePath(`/deployments/${deploymentId}`)
  revalidatePath("/deployments")
  return { ok: true }
}

export async function logReminderCallAction(
  deploymentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = reminderCallSchema.safeParse(fd(formData))
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed) }

  try {
    await logActivityEvent(deploymentId, {
      type: "REMINDER_CALL",
      eventDate: parsed.data.event_date,
      callOutcome: parsed.data.call_outcome,
      notes: parsed.data.notes,
    })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  revalidatePath(`/deployments/${deploymentId}`)
  revalidatePath("/deployments")
  return { ok: true }
}

/**
 * REPLACEMENT — rider swaps vehicle mid-deployment.
 *
 * Looks up old + new VTDs from the DB so the activity_log row has
 * human-readable labels. Patches deployments.vehicle_id via
 * logActivityEvent. The partial unique index blocks swapping to a
 * vehicle that already has an ACTIVE deployment.
 */
export async function replaceVehicleAction(
  deploymentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = replacementSchema.safeParse(fd(formData))
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed) }

  const supabase = createClient()

  const [deploymentRes, newVehicleRes] = await Promise.all([
    supabase
      .from("deployments")
      .select("vehicle_id, vehicles(id, vtd_no)")
      .eq("id", deploymentId)
      .maybeSingle(),
    supabase
      .from("vehicles")
      .select("id, vtd_no")
      .eq("id", parsed.data.new_vehicle_id)
      .maybeSingle(),
  ])

  if (deploymentRes.error) return { ok: false, error: deploymentRes.error.message }
  if (newVehicleRes.error) return { ok: false, error: newVehicleRes.error.message }
  if (!deploymentRes.data) return { ok: false, error: "Deployment not found" }
  if (!newVehicleRes.data) return { ok: false, error: "Vehicle not found" }

  const dep = deploymentRes.data as {
    vehicle_id: string
    vehicles: { id: string; vtd_no: string } | null
  }
  const newVehicle = newVehicleRes.data as { id: string; vtd_no: string }

  try {
    await logActivityEvent(deploymentId, {
      type: "REPLACEMENT",
      eventDate: parsed.data.event_date,
      oldVehicleId: dep.vehicles?.id ?? dep.vehicle_id,
      newVehicleId: newVehicle.id,
      oldVtd: dep.vehicles?.vtd_no ?? "—",
      newVtd: newVehicle.vtd_no,
      reason: parsed.data.reason,
      notes: parsed.data.notes,
    })
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes("deployments_active_vehicle_uniq")) {
      return {
        ok: false,
        error: "That vehicle already has an active deployment. Pick another.",
      }
    }
    return { ok: false, error: msg }
  }

  revalidatePath(`/deployments/${deploymentId}`)
  revalidatePath("/deployments")
  revalidatePath("/admin/vehicles")
  return { ok: true }
}

/**
 * EXTENSION — rider extends deployment by N extra weeks.
 *
 * logActivityEvent reads the current `weeks`, adds `extra_weeks`, and
 * patches the deployment. The GENERATED `due_date` column auto-recalculates.
 */
export async function extendDeploymentAction(
  deploymentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = extensionSchema.safeParse(fd(formData))
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed) }

  try {
    await logActivityEvent(deploymentId, {
      type: "EXTENSION",
      eventDate: parsed.data.event_date,
      extraWeeks: parsed.data.extra_weeks,
      notes: parsed.data.notes,
    })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  revalidatePath(`/deployments/${deploymentId}`)
  revalidatePath("/deployments")
  revalidatePath("/dashboard")
  return { ok: true }
}

/**
 * RETURN — rider gives the vehicle back.
 *
 * Flips deployment status to RETURNED, sets return_date and return_reason.
 * The vehicle becomes available again (derived from absence of ACTIVE deployment).
 */
export async function returnVehicleAction(
  deploymentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = returnSchema.safeParse(fd(formData))
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed) }

  try {
    await logActivityEvent(deploymentId, {
      type: "RETURN",
      eventDate: parsed.data.event_date,
      reason: parsed.data.reason,
      batteryNumber: parsed.data.battery_number,
      chargerCableNumber: parsed.data.charger_cable_number,
      notes: parsed.data.notes,
    })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  revalidatePath(`/deployments/${deploymentId}`)
  revalidatePath("/deployments")
  revalidatePath("/dashboard")
  revalidatePath("/admin/vehicles")
  return { ok: true }
}

/**
 * LOCK — anti-fraud vehicle lock for overdue riders.
 *
 * Sets lock_status='Locked', lock_date, and status='LOCKED'.
 */
export async function lockVehicleAction(
  deploymentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = lockSchema.safeParse(fd(formData))
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed) }

  try {
    await logActivityEvent(deploymentId, {
      type: "LOCK",
      eventDate: parsed.data.event_date,
      notes: parsed.data.notes,
    })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  revalidatePath(`/deployments/${deploymentId}`)
  revalidatePath("/deployments")
  revalidatePath("/dashboard")
  return { ok: true }
}

/**
 * UNLOCK — reverse a lock after resolution.
 *
 * Sets lock_status='Unlocked'.
 */
export async function unlockVehicleAction(
  deploymentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = unlockSchema.safeParse(fd(formData))
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed) }

  try {
    await logActivityEvent(deploymentId, {
      type: "UNLOCK",
      eventDate: parsed.data.event_date,
      notes: parsed.data.notes,
    })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  revalidatePath(`/deployments/${deploymentId}`)
  revalidatePath("/deployments")
  revalidatePath("/dashboard")
  return { ok: true }
}

/**
 * DEPLOY_DATE_EDIT — CMD-only correction of a deployment's deploy_date.
 *
 * Records old → new + reason on the activity timeline and patches deploy_date
 * (due_date regenerates) through the single write path. Gated to CMD in addition
 * to the UI hiding the control.
 */
export async function editDeployDateAction(
  deploymentId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if ((await getCurrentRole()) !== "CMD") {
    return { ok: false, error: "Only CMD can edit the deploy date." }
  }

  const parsed = deployDateEditSchema.safeParse(fd(formData))
  if (!parsed.success) return { ok: false, error: fieldErrors(parsed) }

  const supabase = createClient()
  const { data: dep, error: readErr } = await supabase
    .from("deployments")
    .select("deploy_date")
    .eq("id", deploymentId)
    .maybeSingle()
  if (readErr) return { ok: false, error: readErr.message }
  if (!dep) return { ok: false, error: "Deployment not found" }

  const oldDate = (dep as { deploy_date: string }).deploy_date
  const newDate = parsed.data.new_deploy_date
  if (oldDate === newDate) {
    return { ok: false, error: "New date is the same as the current date." }
  }

  const today = new Date().toISOString().slice(0, 10)
  try {
    await logActivityEvent(deploymentId, {
      type: "DEPLOY_DATE_EDIT",
      eventDate: today,
      oldDate,
      newDate,
      reason: parsed.data.reason,
    })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  revalidatePath(`/deployments/${deploymentId}`)
  revalidatePath("/deployments")
  revalidatePath("/dashboard")
  return { ok: true }
}
