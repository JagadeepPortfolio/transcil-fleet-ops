import { createClient } from "@/lib/supabase/server"

/**
 * CANONICAL VS AUDIT TRAIL RULE
 * ============================================================================
 * deployments row holds canonical state; activity_log is the audit trail.
 * Every event insert MUST update the corresponding deployment columns in the
 * same transaction, otherwise the dashboard and the audit trail drift apart.
 *
 * Event type → deployment columns touched:
 *   PAYMENT          none (computed via deployments_enriched view)
 *   DEPOSIT          none (computed via view)
 *   DEPOSIT_REFUND   deposit_refund_status → 'Refunded' / 'Carried Forward'
 *   REPLACEMENT      vehicle_id → new vehicle; optionally battery_number /
 *                    battery_number_2 / charger_cable_number when "Change" picked
 *   EXTENSION        weeks += extra_weeks (due_date auto via GENERATED col)
 *   RETURN           status='RETURNED', return_date, return_reason; also stores
 *                    returned battery_number (+ battery_number_2 for dual) /
 *                    charger_cable_number for verification
 *   REMINDER_CALL    call_status, call_notes
 *   LOCK             lock_status='Locked', lock_date
 *   UNLOCK           lock_status='Unlocked', status='ACTIVE'
 *   DEPLOY_DATE_EDIT deploy_date → newDate (due_date auto via GENERATED col);
 *                    old/new dates + reason stored on the activity_log row;
 *                    also shifts the initial PAYMENT/DEPOSIT rows dated on the
 *                    old deploy_date onto the new date
 *
 * Writes happen through logActivityEvent() only. Do NOT `insert into
 * activity_log` from a component or Server Action directly.
 * ============================================================================
 */

export type ActivityEventInput =
  | {
      type: "PAYMENT"
      eventDate: string
      amountInr: number
      paymentMode: string
      paymentCategory?: string
      weekNumber?: number
      transactionId?: string
      additionalTransactionId?: string
      notes?: string
    }
  | {
      type: "DEPOSIT"
      eventDate: string
      amountInr: number
      paymentMode: string
      transactionId?: string
      notes?: string
    }
  | {
      type: "DEPOSIT_REFUND"
      eventDate: string
      amountInr: number
      paymentMode: string
      transactionId?: string
      refundStatus: "Refunded" | "Carried Forward"
      notes?: string
    }
  | {
      type: "REPLACEMENT"
      eventDate: string
      oldVehicleId: string
      newVehicleId: string
      oldVtd: string
      newVtd: string
      reason?: string
      // When the new vehicle's battery/charger differ, these carry the new
      // values; they patch the deployment and are recorded for the audit trail.
      batteryNumber?: string
      batteryNumber2?: string
      chargerCableNumber?: string
      notes?: string
    }
  | {
      type: "EXTENSION"
      eventDate: string
      extraWeeks: number
      notes?: string
    }
  | {
      type: "RETURN"
      eventDate: string
      reason?: string
      batteryNumber?: string
      batteryNumber2?: string
      chargerCableNumber?: string
      notes?: string
    }
  | {
      type: "REMINDER_CALL"
      eventDate: string
      callOutcome: string
      notes?: string
    }
  | { type: "LOCK"; eventDate: string; notes?: string }
  | { type: "UNLOCK"; eventDate: string; notes?: string }
  | {
      type: "DEPLOY_DATE_EDIT"
      eventDate: string
      oldDate: string
      newDate: string
      reason: string
      notes?: string
    }

export async function logActivityEvent(
  deploymentId: string,
  event: ActivityEventInput
) {
  const supabase = createClient()

  // 1) Insert activity_log row
  const insertPayload: Record<string, unknown> = {
    deployment_id: deploymentId,
    event_type: event.type,
    event_date: event.eventDate,
    notes: "notes" in event ? event.notes ?? null : null,
  }

  switch (event.type) {
    case "PAYMENT":
      insertPayload.amount_inr = event.amountInr
      insertPayload.payment_mode = event.paymentMode
      insertPayload.payment_category = event.paymentCategory ?? null
      insertPayload.week_number = event.weekNumber ?? null
      insertPayload.transaction_id = event.transactionId ?? null
      insertPayload.additional_transaction_id = event.additionalTransactionId ?? null
      break
    case "DEPOSIT":
      insertPayload.amount_inr = event.amountInr
      insertPayload.payment_mode = event.paymentMode
      insertPayload.transaction_id = event.transactionId ?? null
      break
    case "DEPOSIT_REFUND":
      insertPayload.amount_inr = event.amountInr
      insertPayload.payment_mode = event.paymentMode
      insertPayload.transaction_id = event.transactionId ?? null
      break
    case "REPLACEMENT":
      insertPayload.old_vehicle_id = event.oldVehicleId
      insertPayload.new_vehicle_id = event.newVehicleId
      insertPayload.old_vtd = event.oldVtd
      insertPayload.new_vtd = event.newVtd
      insertPayload.reason = event.reason ?? null
      if (event.batteryNumber !== undefined) insertPayload.battery_number = event.batteryNumber ?? null
      if (event.batteryNumber2 !== undefined) insertPayload.battery_number_2 = event.batteryNumber2 ?? null
      if (event.chargerCableNumber !== undefined) insertPayload.charger_cable_number = event.chargerCableNumber ?? null
      break
    case "EXTENSION":
      insertPayload.extra_weeks = event.extraWeeks
      break
    case "RETURN":
      insertPayload.reason = event.reason ?? null
      insertPayload.battery_number = event.batteryNumber ?? null
      insertPayload.battery_number_2 = event.batteryNumber2 ?? null
      insertPayload.charger_cable_number = event.chargerCableNumber ?? null
      break
    case "REMINDER_CALL":
      insertPayload.call_outcome = event.callOutcome
      break
    case "DEPLOY_DATE_EDIT":
      insertPayload.old_value = event.oldDate
      insertPayload.new_value = event.newDate
      insertPayload.reason = event.reason
      break
    case "LOCK":
    case "UNLOCK":
      break
  }

  const { error: insertErr } = await supabase
    .from("activity_log")
    .insert(insertPayload)
  if (insertErr) throw insertErr

  // 2) Update corresponding deployment columns
  const patch: Record<string, unknown> = {}
  switch (event.type) {
    case "DEPOSIT_REFUND":
      patch.deposit_refund_status = event.refundStatus
      break
    case "REPLACEMENT":
      patch.vehicle_id = event.newVehicleId
      // Update battery/charger only when new values were provided ("Change").
      if (event.batteryNumber !== undefined) patch.battery_number = event.batteryNumber ?? null
      if (event.batteryNumber2 !== undefined) patch.battery_number_2 = event.batteryNumber2 ?? null
      if (event.chargerCableNumber !== undefined) patch.charger_cable_number = event.chargerCableNumber ?? null
      break
    case "EXTENSION": {
      // Read current weeks, add extraWeeks. Single-statement RPC would be
      // better; for v1 we do it as read-modify-write and accept the race.
      const { data: row } = await supabase
        .from("deployments")
        .select("weeks")
        .eq("id", deploymentId)
        .maybeSingle()
      if (row) patch.weeks = ((row as { weeks: number }).weeks) + event.extraWeeks
      break
    }
    case "RETURN":
      patch.status = "RETURNED"
      patch.return_date = event.eventDate
      patch.return_reason = event.reason ?? null
      break
    case "REMINDER_CALL":
      patch.call_status = event.callOutcome
      break
    case "LOCK":
      patch.lock_status = "Locked"
      patch.lock_date = event.eventDate
      patch.status = "LOCKED"
      break
    case "UNLOCK":
      patch.lock_status = "Unlocked"
      // Restore the deployment to ACTIVE — LOCK had set status='LOCKED', so
      // without this the deployment stays stuck LOCKED after an unlock (and the
      // vehicle wrongly reads as available since In-Use derives from ACTIVE).
      patch.status = "ACTIVE"
      break
    case "DEPLOY_DATE_EDIT":
      // due_date is a GENERATED column → recalculates from the new deploy_date.
      patch.deploy_date = event.newDate
      break
    case "PAYMENT":
    case "DEPOSIT":
      // computed via view, nothing to patch
      break
  }

  if (Object.keys(patch).length > 0) {
    const { error: updateErr } = await supabase
      .from("deployments")
      .update(patch)
      .eq("id", deploymentId)
    if (updateErr) throw updateErr
  }

  // 3) DEPLOY_DATE_EDIT side-effect: keep the initial payment/deposit aligned
  // with the deployment's start date. We shift PAYMENT/DEPOSIT rows whose
  // event_date matched the OLD deploy date (i.e. those captured at creation)
  // onto the new date. Later, separately-dated payments are left untouched.
  if (event.type === "DEPLOY_DATE_EDIT") {
    const { error: shiftErr } = await supabase
      .from("activity_log")
      .update({ event_date: event.newDate })
      .eq("deployment_id", deploymentId)
      .in("event_type", ["PAYMENT", "DEPOSIT"])
      .eq("event_date", event.oldDate)
      .is("deleted_at", null)
    if (shiftErr) throw shiftErr
  }
}

export async function listActivityForDeployment(deploymentId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("deployment_id", deploymentId)
    .is("deleted_at", null)
    .order("event_date", { ascending: false })
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}
