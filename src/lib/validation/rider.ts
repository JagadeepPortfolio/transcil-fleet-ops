import { z } from "zod"

export const riderSources = ["Individual", "3PL", "Camions"] as const

export const riderCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Phone must be exactly 10 digits"),
  source: z.enum(riderSources),
  app_rider_id: z.string().trim().max(50).optional().or(z.literal("")),
  current_location: z
    .string()
    .trim()
    .min(2, "Current location is required")
    .max(200),
  alt_contact_name: z.string().trim().max(120).optional().or(z.literal("")),
  alt_contact_number: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Alternate number must be exactly 10 digits")
    .optional()
    .or(z.literal("")),
  purpose: z.string().trim().max(200).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
})

export type RiderCreateInput = z.infer<typeof riderCreateSchema>
