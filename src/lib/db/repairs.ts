import { createClient } from "@/lib/supabase/server"
import type { RepairStatus } from "@/lib/validation/repairs"

import { logPartMovement } from "./spare-parts"

// Vehicle repairs. Canonical state lives in vehicle_repairs; repair_events is the
// timeline. service_status on the vehicle is synced by a DB trigger (migration
// 0048) — never write vehicles.service_status from here.

export type RepairListRow = {
  id: string
  status: RepairStatus
  issue_details: string | null
  reported_at: string
  completed_at: string | null
  vehicle_id: string
  vtd_no: string | null
  ec_no: string | null
  deployment_id: string | null
  deployment_code: string | null
}

export async function listRepairs(): Promise<RepairListRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("vehicle_repairs")
    .select("id, status, issue_details, reported_at, completed_at, vehicle_id, deployment_id, vehicles(vtd_no, vehicle_id), deployments(deployment_code)")
    .is("deleted_at", null)
    .order("reported_at", { ascending: false })
  if (error) throw error
  type Raw = {
    id: string
    status: RepairStatus
    issue_details: string | null
    reported_at: string
    completed_at: string | null
    vehicle_id: string
    deployment_id: string | null
    vehicles: { vtd_no: string | null; vehicle_id: string | null } | null
    deployments: { deployment_code: string | null } | null
  }
  return ((data ?? []) as unknown as Raw[]).map((r) => ({
    id: r.id,
    status: r.status,
    issue_details: r.issue_details,
    reported_at: r.reported_at,
    completed_at: r.completed_at,
    vehicle_id: r.vehicle_id,
    vtd_no: r.vehicles?.vtd_no ?? null,
    ec_no: r.vehicles?.vehicle_id ?? null,
    deployment_id: r.deployment_id,
    deployment_code: r.deployments?.deployment_code ?? null,
  }))
}

export async function getRepair(id: string) {
  const supabase = createClient()
  const [repairRes, partsRes, eventsRes] = await Promise.all([
    supabase
      .from("vehicle_repairs")
      .select(
        "id, hub_id, status, issue_details, diagnosis, repair_notes, cost_estimate, cost_discount, reported_at, completed_at, vehicle_id, deployment_id, created_by_name, vehicles(vtd_no, vehicle_id, colour)"
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("repair_parts_used")
      .select("id, quantity, serial_no, notes, created_at, created_by_name, spare_parts(name, unit)")
      .eq("repair_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("repair_events")
      .select("id, event_type, from_status, to_status, note, created_by_name, created_at")
      .eq("repair_id", id)
      .order("created_at", { ascending: false }),
  ])
  if (repairRes.error) throw repairRes.error
  const r = repairRes.data as unknown as
    | {
        id: string
        hub_id: number
        status: RepairStatus
        issue_details: string | null
        diagnosis: string | null
        repair_notes: string | null
        cost_estimate: number | null
        cost_discount: number | null
        reported_at: string
        completed_at: string | null
        vehicle_id: string
        deployment_id: string | null
        created_by_name: string | null
        vehicles: { vtd_no: string | null; vehicle_id: string | null; colour: string | null } | null
      }
    | null
  if (!r) return null

  return {
    repair: r,
    parts: (partsRes.data ?? []) as unknown as {
      id: string
      quantity: number
      serial_no: string | null
      notes: string | null
      created_at: string
      created_by_name: string | null
      spare_parts: { name: string; unit: string } | null
    }[],
    events: (eventsRes.data ?? []) as unknown as {
      id: string
      event_type: string
      from_status: RepairStatus | null
      to_status: RepairStatus | null
      note: string | null
      created_by_name: string | null
      created_at: string
    }[],
  }
}

async function logRepairEvent(
  repairId: string,
  eventType: string,
  opts: { fromStatus?: RepairStatus; toStatus?: RepairStatus; note?: string } = {}
) {
  const supabase = createClient()
  const { error } = await supabase.from("repair_events").insert({
    repair_id: repairId,
    event_type: eventType,
    from_status: opts.fromStatus ?? null,
    to_status: opts.toStatus ?? null,
    note: opts.note ?? null,
  })
  if (error) throw error
}

/** Create a repair ticket (called from the "Vehicle issue" return flow). */
export async function createRepair(input: {
  hubId: number
  vehicleId: string
  deploymentId?: string | null
  issueDetails?: string | null
}): Promise<string> {
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from("vehicle_repairs")
    .insert({
      hub_id: input.hubId,
      vehicle_id: input.vehicleId,
      deployment_id: input.deploymentId ?? null,
      issue_details: input.issueDetails ?? null,
      reported_by: userRes.user?.id ?? null,
      status: "REPORTED",
    })
    .select("id")
    .maybeSingle()
  if (error) throw error
  const id = (data as { id: string }).id
  await logRepairEvent(id, "CREATED", { toStatus: "REPORTED", note: input.issueDetails ?? undefined })
  return id
}

/**
 * On-the-spot minor repair under an ACTIVE deployment. Creates a repair that is
 * born COMPLETED + is_minor (so it never enters the open queue and the 0048
 * trigger leaves the vehicle In Use), records any parts used (decrements stock),
 * and returns the repair id. Caller logs the MINOR_REPAIR timeline event.
 */
export async function logMinorRepair(input: {
  deploymentId: string
  hubId: number
  vehicleId: string
  description: string
  parts: { sparePartId: string; quantity: number; serialNo?: string }[]
}): Promise<string> {
  const supabase = createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from("vehicle_repairs")
    .insert({
      hub_id: input.hubId,
      vehicle_id: input.vehicleId,
      deployment_id: input.deploymentId,
      issue_details: input.description,
      diagnosis: input.description,
      status: "COMPLETED",
      is_minor: true,
      reported_by: userRes.user?.id ?? null,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle()
  if (error) throw error
  const repairId = (data as { id: string }).id

  await logRepairEvent(repairId, "COMPLETED", {
    toStatus: "COMPLETED",
    note: `Minor repair: ${input.description}`,
  })

  for (const p of input.parts) {
    const { error: insErr } = await supabase.from("repair_parts_used").insert({
      repair_id: repairId,
      spare_part_id: p.sparePartId,
      quantity: p.quantity,
      serial_no: p.serialNo ?? null,
    })
    if (insErr) throw insErr
    await logPartMovement({
      hubId: input.hubId,
      partId: p.sparePartId,
      type: "USED",
      quantityDelta: -p.quantity,
      repairId,
      reason: "Used in minor repair",
    })
  }
  return repairId
}

export async function updateRepairStatus(id: string, toStatus: RepairStatus, note?: string) {
  const supabase = createClient()
  const { data: cur } = await supabase
    .from("vehicle_repairs")
    .select("status")
    .eq("id", id)
    .maybeSingle()
  const fromStatus = (cur as { status?: RepairStatus } | null)?.status

  const patch: Record<string, unknown> = { status: toStatus }
  if (toStatus === "COMPLETED") patch.completed_at = new Date().toISOString()
  const { error } = await supabase.from("vehicle_repairs").update(patch).eq("id", id)
  if (error) throw error

  await logRepairEvent(id, toStatus === "COMPLETED" ? "COMPLETED" : "STATUS_CHANGE", {
    fromStatus,
    toStatus,
    note,
  })
}

export async function updateRepairDetails(
  id: string,
  input: { diagnosis?: string; cost_estimate?: number; cost_discount?: number; repair_notes?: string }
) {
  const supabase = createClient()
  const { error } = await supabase
    .from("vehicle_repairs")
    .update({
      diagnosis: input.diagnosis ?? null,
      cost_estimate: input.cost_estimate ?? null,
      cost_discount: input.cost_discount ?? null,
      repair_notes: input.repair_notes ?? null,
    })
    .eq("id", id)
  if (error) throw error
  await logRepairEvent(id, "NOTE", { note: "Diagnosis / details updated" })
}

export async function addRepairNote(id: string, note: string) {
  await logRepairEvent(id, "NOTE", { note })
}

/** Record a part fitted in a repair → decrements that hub's stock via the ledger. */
export async function addPartUsed(input: {
  repairId: string
  sparePartId: string
  quantity: number
  serialNo?: string
  notes?: string
}) {
  const supabase = createClient()
  const { data: repair, error: rErr } = await supabase
    .from("vehicle_repairs")
    .select("hub_id, status")
    .eq("id", input.repairId)
    .is("deleted_at", null)
    .maybeSingle()
  if (rErr) throw rErr
  const rep = repair as { hub_id: number; status: RepairStatus } | null
  if (!rep) throw new Error("Repair not found")
  if (rep.status === "COMPLETED" || rep.status === "CANCELLED") {
    throw new Error("Cannot add parts to a closed repair")
  }

  // Part name for the timeline note.
  const { data: partRow } = await supabase
    .from("spare_parts")
    .select("name")
    .eq("id", input.sparePartId)
    .maybeSingle()
  const partName = (partRow as { name?: string } | null)?.name ?? "part"

  const { error: insErr } = await supabase.from("repair_parts_used").insert({
    repair_id: input.repairId,
    spare_part_id: input.sparePartId,
    quantity: input.quantity,
    serial_no: input.serialNo ?? null,
    notes: input.notes ?? null,
  })
  if (insErr) throw insErr

  // Decrement stock through the single write path (throws if insufficient).
  await logPartMovement({
    hubId: rep.hub_id,
    partId: input.sparePartId,
    type: "USED",
    quantityDelta: -input.quantity,
    repairId: input.repairId,
    reason: "Used in repair",
  })

  await logRepairEvent(input.repairId, "PART_USED", {
    note: `Used ${input.quantity} × ${partName}${input.serialNo ? ` (S/N ${input.serialNo})` : ""}`,
  })
}

/** Remove a mistakenly-recorded part → soft-delete the line and restock inventory. */
export async function removePartUsed(repairPartUsedId: string) {
  const supabase = createClient()
  const { data: row, error: rowErr } = await supabase
    .from("repair_parts_used")
    .select("id, repair_id, spare_part_id, quantity, spare_parts(name)")
    .eq("id", repairPartUsedId)
    .is("deleted_at", null)
    .maybeSingle()
  if (rowErr) throw rowErr
  const r = row as unknown as
    | { id: string; repair_id: string; spare_part_id: string; quantity: number; spare_parts: { name: string } | null }
    | null
  if (!r) throw new Error("Part record not found")

  const { data: rep } = await supabase
    .from("vehicle_repairs")
    .select("hub_id, status")
    .eq("id", r.repair_id)
    .maybeSingle()
  const repair = rep as { hub_id: number; status: RepairStatus } | null
  if (!repair) throw new Error("Repair not found")
  if (repair.status === "COMPLETED" || repair.status === "CANCELLED") {
    throw new Error("Cannot edit parts on a closed repair")
  }

  // Soft-delete the line.
  const { error: delErr } = await supabase
    .from("repair_parts_used")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", r.id)
  if (delErr) throw delErr

  // Restock: compensating movement that reverses the original USED deduction.
  await logPartMovement({
    hubId: repair.hub_id,
    partId: r.spare_part_id,
    type: "ADJUST",
    quantityDelta: r.quantity,
    repairId: r.repair_id,
    reason: "Reversed: part-used removed",
  })

  await logRepairEvent(r.repair_id, "PART_REMOVED", {
    note: `Removed ${r.quantity} × ${r.spare_parts?.name ?? "part"} (restocked)`,
  })
}
