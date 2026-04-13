import { z } from "zod"

export const riderSources = [
  "Walk-in",
  "Reference",
  "Social Media",
  "Dealer",
  "App",
  "Other",
] as const

export const riderCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Phone must be exactly 10 digits"),
  source: z.enum(riderSources),
  app_rider_id: z.string().trim().max(50).optional().or(z.literal("")),
  location_id: z.coerce.number().int().positive("Select a location"),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
})

export type RiderCreateInput = z.infer<typeof riderCreateSchema>
