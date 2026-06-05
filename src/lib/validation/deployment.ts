import { z } from "zod"
import { dbUuid } from "./helpers"

export const rentalTypes = ["Weekly", "Monthly"] as const

export const deploymentCreateSchema = z.object({
  rider_id: dbUuid("Pick a rider"),
  vehicle_id: dbUuid("Pick a vehicle"),
  hub_id: z.coerce.number().int().positive("Pick a hub"),
  rental_type: z.enum(rentalTypes),
  deploy_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  weeks: z.coerce.number().int().min(1).max(52),
  rate_inr: z.coerce.number().nonnegative("Rate cannot be negative"),
  deposit_required_inr: z.coerce
    .number()
    .nonnegative("Deposit cannot be negative")
    .default(0),
  new_deposit_needed: z.coerce.boolean().default(true),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
})

export type DeploymentCreateInput = z.infer<typeof deploymentCreateSchema>
