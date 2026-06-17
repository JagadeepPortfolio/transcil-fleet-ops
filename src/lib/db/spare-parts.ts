import { createClient } from "@/lib/supabase/server"

// Spare-parts inventory: catalog, per-hub stock, and the movement ledger.
//
// logPartMovement() is the SINGLE write path for stock changes — it inserts a
// ledger row AND updates the matching stock row's quantity_on_hand, mirroring
// logActivityEvent() for deployments. Never update quantity_on_hand directly.

export type CategoryRow = { id: number; name: string; sort_order: number }

export type StockRow = {
  stock_id: string
  spare_part_id: string
  part_name: string
  unit: string
  part_number: string | null
  category_id: number | null
  category_name: string | null
  quantity_on_hand: number
  reorder_level: number
  low: boolean
}

export type MovementType = "RECEIVED" | "USED" | "ADJUST"

export async function listCategories(): Promise<CategoryRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("spare_part_categories")
    .select("id, name, sort_order")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as CategoryRow[]
}

/** Catalog part names for autocomplete (the "Received / Return" entry screens). */
export async function listPartNames(): Promise<{ id: string; name: string }[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("spare_parts")
    .select("id, name")
    .is("deleted_at", null)
    .order("name", { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as { id: string; name: string }[]
}

export async function createCategory(name: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from("spare_part_categories")
    .insert({ name })
  if (error) throw error
}

/** Per-hub stock joined with catalog + category. Sorted by part name. */
export async function listStockForHub(hubId: number): Promise<StockRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("spare_part_stock")
    .select(
      "id, quantity_on_hand, reorder_level, spare_part_id, spare_parts(name, unit, part_number, category_id, spare_part_categories(name))"
    )
    .eq("hub_id", hubId)
    .is("deleted_at", null)
  if (error) throw error

  type Raw = {
    id: string
    quantity_on_hand: number
    reorder_level: number
    spare_part_id: string
    spare_parts: {
      name: string
      unit: string
      part_number: string | null
      category_id: number | null
      spare_part_categories: { name: string } | null
    } | null
  }
  const rows = ((data ?? []) as unknown as Raw[])
    .filter((r) => r.spare_parts)
    .map((r) => ({
      stock_id: r.id,
      spare_part_id: r.spare_part_id,
      part_name: r.spare_parts!.name,
      unit: r.spare_parts!.unit,
      part_number: r.spare_parts!.part_number,
      category_id: r.spare_parts!.category_id,
      category_name: r.spare_parts!.spare_part_categories?.name ?? null,
      quantity_on_hand: r.quantity_on_hand,
      reorder_level: r.reorder_level,
      low: r.quantity_on_hand <= r.reorder_level,
    }))
  rows.sort((a, b) => a.part_name.localeCompare(b.part_name))
  return rows
}

export type PartDetail = {
  id: string
  name: string
  unit: string
  part_number: string | null
  category_id: number | null
  category_name: string | null
}

export async function getPartWithStock(partId: string, hubId: number) {
  const supabase = createClient()
  const [partRes, stockRes, movesRes] = await Promise.all([
    supabase
      .from("spare_parts")
      .select("id, name, unit, part_number, category_id, spare_part_categories(name)")
      .eq("id", partId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("spare_part_stock")
      .select("id, quantity_on_hand, reorder_level")
      .eq("spare_part_id", partId)
      .eq("hub_id", hubId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("spare_part_movements")
      .select("movement_type, quantity_delta, reason, event_date, created_by_name, created_at")
      .eq("spare_part_id", partId)
      .eq("hub_id", hubId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ])
  if (partRes.error) throw partRes.error
  const partRaw = partRes.data as
    | { id: string; name: string; unit: string; part_number: string | null; category_id: number | null; spare_part_categories: { name: string } | null }
    | null
  if (!partRaw) return null
  const stock = (stockRes.data as { id: string; quantity_on_hand: number; reorder_level: number } | null) ?? null
  return {
    part: {
      id: partRaw.id,
      name: partRaw.name,
      unit: partRaw.unit,
      part_number: partRaw.part_number,
      category_id: partRaw.category_id,
      category_name: partRaw.spare_part_categories?.name ?? null,
    } as PartDetail,
    stock,
    movements: (movesRes.data ?? []) as unknown as {
      movement_type: MovementType
      quantity_delta: number
      reason: string | null
      event_date: string
      created_by_name: string | null
      created_at: string
    }[],
  }
}

/** Factory-return history for a part at a hub (most recent first). */
export async function listFactoryReturnsForPart(partId: string, hubId: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("factory_returns")
    .select("quantity, event_date, reason, created_by_name, created_at")
    .eq("spare_part_id", partId)
    .eq("hub_id", hubId)
    .is("deleted_at", null)
    .order("event_date", { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []) as unknown as {
    quantity: number
    event_date: string
    reason: string | null
    created_by_name: string | null
    created_at: string
  }[]
}

async function getStockRow(hubId: number, partId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("spare_part_stock")
    .select("id, quantity_on_hand")
    .eq("hub_id", hubId)
    .eq("spare_part_id", partId)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) throw error
  return data as { id: string; quantity_on_hand: number } | null
}

/**
 * The single stock write path: append a movement and update quantity_on_hand
 * in the same call. Throws if a USED/ADJUST would drive stock below zero.
 */
export async function logPartMovement(input: {
  hubId: number
  partId: string
  type: MovementType
  quantityDelta: number
  repairId?: string | null
  reason?: string | null
  notes?: string | null
  eventDate?: string
}) {
  const supabase = createClient()
  let stock = await getStockRow(input.hubId, input.partId)
  if (!stock) {
    const { data, error } = await supabase
      .from("spare_part_stock")
      .insert({ hub_id: input.hubId, spare_part_id: input.partId, quantity_on_hand: 0, reorder_level: 0 })
      .select("id, quantity_on_hand")
      .maybeSingle()
    if (error) throw error
    stock = data as { id: string; quantity_on_hand: number }
  }

  const current = stock.quantity_on_hand ?? 0
  const next = current + input.quantityDelta
  if (next < 0) {
    throw new Error(`Not enough stock — only ${current} on hand`)
  }

  const payload: Record<string, unknown> = {
    hub_id: input.hubId,
    spare_part_id: input.partId,
    movement_type: input.type,
    quantity_delta: input.quantityDelta,
    repair_id: input.repairId ?? null,
    reason: input.reason ?? null,
    notes: input.notes ?? null,
  }
  if (input.eventDate) payload.event_date = input.eventDate

  const { error: movErr } = await supabase.from("spare_part_movements").insert(payload)
  if (movErr) throw movErr

  const { error: updErr } = await supabase
    .from("spare_part_stock")
    .update({ quantity_on_hand: next })
    .eq("id", stock.id)
  if (updErr) throw updErr

  return next
}

/** Create a catalog part + a stock row for the given hub (with optional opening qty). */
export async function createPartWithStock(input: {
  name: string
  categoryId?: number
  unit: string
  partNumber?: string
  reorderLevel: number
  openingQty: number
  hubId: number
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("spare_parts")
    .insert({
      name: input.name,
      category_id: input.categoryId ?? null,
      unit: input.unit,
      part_number: input.partNumber || null,
    })
    .select("id")
    .maybeSingle()
  if (error) {
    if (error.message.includes("spare_parts_name_uniq")) {
      throw new Error(`A part named "${input.name}" already exists.`)
    }
    throw error
  }
  const partId = (data as { id: string }).id

  const { error: stockErr } = await supabase
    .from("spare_part_stock")
    .insert({ hub_id: input.hubId, spare_part_id: partId, quantity_on_hand: 0, reorder_level: input.reorderLevel })
  if (stockErr) throw stockErr

  if (input.openingQty > 0) {
    await logPartMovement({
      hubId: input.hubId,
      partId,
      type: "ADJUST",
      quantityDelta: input.openingQty,
      reason: "Opening stock",
    })
  }
  return partId
}

/** Stock-take / manual correction: set on-hand (logs an ADJUST delta) and reorder level. */
export async function setStockLevels(input: {
  hubId: number
  partId: string
  onHand: number
  reorderLevel: number
  reason?: string
}) {
  const supabase = createClient()
  const stock = await getStockRow(input.hubId, input.partId)
  const current = stock?.quantity_on_hand ?? 0
  const delta = input.onHand - current
  if (delta !== 0) {
    await logPartMovement({
      hubId: input.hubId,
      partId: input.partId,
      type: "ADJUST",
      quantityDelta: delta,
      reason: input.reason || "Stock correction",
    })
  }
  // reorder level isn't a movement — update the stock row directly.
  const { error } = await supabase
    .from("spare_part_stock")
    .update({ reorder_level: input.reorderLevel })
    .eq("hub_id", input.hubId)
    .eq("spare_part_id", input.partId)
    .is("deleted_at", null)
  if (error) throw error
}
