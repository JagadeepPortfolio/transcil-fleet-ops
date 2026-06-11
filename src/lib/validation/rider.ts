import { z } from "zod"
import { up, upperOptional } from "./helpers"

export const riderSources = ["Individual", "3PL", "Camions"] as const

export const emergencyRelationships = [
  "Father",
  "Brother",
  "Mother",
  "Guardian",
] as const

export const purposeOptions = [
  "Big Basket",
  "Zepto",
  "Swiggy",
  "Swiggy Instamart",
  "Zomato",
  "Blinkit",
  "Amazon",
  "Flipkart Minute",
  "Amazon One",
  "Others",
] as const


export const riderCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120).transform(up),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Phone must be exactly 10 digits"),
  alt_phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Alternate number must be exactly 10 digits")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  source: z.enum(riderSources),
  app_rider_id: upperOptional(50),
  current_location: z
    .string()
    .trim()
    .min(2, "Current location is required")
    .max(200)
    .transform(up),
  emergency_contact_relationship: z.enum(emergencyRelationships, {
    message: "Pick a relationship",
  }),
  emergency_contact_name: z
    .string()
    .trim()
    .min(2, "Emergency contact name is required")
    .max(120)
    .transform(up),
  emergency_contact_number: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Emergency contact number must be 10 digits"),
  purpose: z.enum(purposeOptions, { message: "Select a purpose" }),
  store_id: upperOptional(80),
  store_name: upperOptional(120),
  store_location: upperOptional(160),
  purpose_other: upperOptional(300),
  address: z.string().trim().min(5, "Address is required").max(500).transform(up),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
}).superRefine((v, ctx) => {
  if (v.purpose === "Others") {
    if (!v.purpose_other)
      ctx.addIssue({ path: ["purpose_other"], code: z.ZodIssueCode.custom, message: "Describe the purpose" })
  } else {
    if (!v.store_id)
      ctx.addIssue({ path: ["store_id"], code: z.ZodIssueCode.custom, message: "Store ID is required" })
    if (!v.store_name)
      ctx.addIssue({ path: ["store_name"], code: z.ZodIssueCode.custom, message: "Store name is required" })
    if (!v.store_location)
      ctx.addIssue({ path: ["store_location"], code: z.ZodIssueCode.custom, message: "Store location is required" })
  }
})

export type RiderCreateInput = z.infer<typeof riderCreateSchema>
