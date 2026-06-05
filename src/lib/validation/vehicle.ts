import { z } from "zod"

export const vehicleCreateSchema = z.object({
  vtd_no: z.string().trim().min(3, "VTD number is required").max(40),
  vehicle_id: z.string().trim().min(1, "EC No is required").max(40),
  chassis_no: z.string().trim().max(60).optional().or(z.literal("")),
  colour: z.string().trim().max(40).optional().or(z.literal("")),
})

export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>

// Editing keeps the full set of fields (type + hub stay adjustable here even
// though new vehicles default them — see admin/vehicles/new/page.tsx).
export const vehicleUpdateSchema = vehicleCreateSchema.extend({
  vehicle_type_id: z.coerce.number().int().positive("Pick a vehicle type"),
  hub_id: z.coerce.number().int().positive("Pick a hub"),
})

export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>
