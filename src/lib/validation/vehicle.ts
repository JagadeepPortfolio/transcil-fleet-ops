import { z } from "zod"

export const vehicleCreateSchema = z.object({
  vtd_no: z.string().trim().min(3, "VTD number is required").max(40),
  vehicle_id: z.string().trim().max(40).optional().or(z.literal("")),
  vehicle_type_id: z.coerce.number().int().positive("Pick a vehicle type"),
  colour: z.string().trim().max(40).optional().or(z.literal("")),
})

export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>
