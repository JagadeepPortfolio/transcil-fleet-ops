import { z } from "zod"

import { dbUuid } from "./helpers"

// Spare-part / repair form schemas. UUIDs use dbUuid() (invariant #9).

const intNonNeg = z.coerce.number().int("Whole number").min(0, "Cannot be negative")
const intPos = z.coerce.number().int("Whole number").min(1, "Must be at least 1")
const money = z.coerce.number().min(0, "Cannot be negative")
const upper = (v: unknown) => (typeof v === "string" ? v.trim().toUpperCase() : v)

export const REPAIR_STATUSES = [
  "REPORTED",
  "INVESTIGATING",
  "IN_REPAIR",
  "AWAITING_PARTS",
  "COMPLETED",
  "CANCELLED",
] as const
export type RepairStatus = (typeof REPAIR_STATUSES)[number]

export const partCreateSchema = z.object({
  name: z.preprocess(upper, z.string().min(1, "Part name required")),
  category_id: z.coerce.number().int().optional(),
  unit: z.string().trim().min(1).default("piece"),
  part_number: z.string().trim().optional(),
  reorder_level: intNonNeg.default(0),
  opening_qty: intNonNeg.default(0),
})

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Category name required"),
})

export const stockAdjustSchema = z.object({
  on_hand: intNonNeg,
  reorder_level: intNonNeg,
  reason: z.string().trim().optional(),
})

export const partUsedSchema = z.object({
  spare_part_id: dbUuid("Select a part"),
  quantity: intPos,
  serial_no: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export const repairStatusSchema = z.object({
  status: z.enum(REPAIR_STATUSES),
  note: z.string().trim().optional(),
})

export const repairDetailsSchema = z.object({
  diagnosis: z.string().trim().optional(),
  cost_estimate: money.optional(),
  cost_discount: money.optional(),
  repair_notes: z.string().trim().optional(),
})

export const repairNoteSchema = z.object({
  note: z.string().trim().min(1, "Note cannot be empty"),
})
