import { z } from "zod"
import { dbUuid, up } from "./helpers"

export const rentalTypes = ["Weekly", "Monthly"] as const

export const batteryTypes = ["Fixed", "Single", "Dual"] as const

const optionalBattery = z
  .string()
  .trim()
  .max(60)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v.toUpperCase() : undefined))

export const deploymentCreateSchema = z
  .object({
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
    // Battery type drives how many battery numbers are required:
    //   Fixed  → none, Single → battery_number, Dual → both.
    battery_type: z.enum(batteryTypes, { message: "Pick a battery type" }),
    battery_number: optionalBattery,
    battery_number_2: optionalBattery,
    charger_cable_number: z
      .string()
      .trim()
      .min(1, "Charger cable number is required")
      .max(60)
      .transform(up),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.battery_type === "Single" || data.battery_type === "Dual") {
      if (!data.battery_number) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["battery_number"],
          message: "Battery number is required",
        })
      }
    }
    if (data.battery_type === "Dual" && !data.battery_number_2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["battery_number_2"],
        message: "Second battery number is required",
      })
    }
  })

export type DeploymentCreateInput = z.infer<typeof deploymentCreateSchema>
