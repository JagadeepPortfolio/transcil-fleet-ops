import { z } from "zod"
import { dbUuid } from "./helpers"

/**
 * Zod schemas for the Session 12 "collection loop" — the four write flows
 * staff use every day on an active deployment:
 *
 *   PAYMENT          weekly rent collection
 *   DEPOSIT          security deposit collection (typically at start)
 *   DEPOSIT_REFUND   return deposit on contract close / carry-forward
 *   REMINDER_CALL    pre-due reminder call outcome
 *
 * These live alongside `src/lib/db/activity-log.ts :: logActivityEvent`.
 * Server actions parse FormData → one of these schemas → pass to the helper.
 *
 * `transaction_id` is optional for PAYMENT/DEPOSIT/DEPOSIT_REFUND. Cash
 * payments won't have a UPI ref or bank receipt. Rows without a txn ID
 * still won't count toward Total Paid in the `deployments_enriched` view
 * until one is added later.
 */

export const PAYMENT_MODES = ["UPI", "Mobile App"] as const

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")

const moneySchema = z.coerce
  .number({ message: "Enter an amount" })
  .positive("Amount must be greater than zero")

const notesSchema = z
  .string()
  .trim()
  .max(1000, "Notes are too long")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined))

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined))

const requiredTxnId = z
  .string()
  .trim()
  .min(1, "Transaction ID is required")
  .max(60)

export const paymentSchema = z.object({
  event_date: dateSchema,
  amount_inr: moneySchema,
  payment_mode: z.enum(PAYMENT_MODES, { message: "Pick a payment mode" }),
  week_number: z.coerce
    .number()
    .int()
    .min(1, "Week must be 1–52")
    .max(52, "Week must be 1–52")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  transaction_id: requiredTxnId,
  additional_transaction_id: optionalText(60),
  notes: notesSchema,
})
export type PaymentInput = z.infer<typeof paymentSchema>

export const depositSchema = z.object({
  event_date: dateSchema,
  amount_inr: moneySchema,
  payment_mode: z.enum(PAYMENT_MODES, { message: "Pick a payment mode" }),
  transaction_id: requiredTxnId,
  notes: notesSchema,
})
export type DepositInput = z.infer<typeof depositSchema>

export const depositRefundSchema = z.object({
  event_date: dateSchema,
  amount_inr: moneySchema,
  payment_mode: z.enum(PAYMENT_MODES, { message: "Pick a payment mode" }),
  refund_status: z.enum(["Refunded", "Carried Forward"], {
    message: "Pick a refund status",
  }),
  transaction_id: optionalText(60),
  notes: notesSchema,
})
export type DepositRefundInput = z.infer<typeof depositRefundSchema>

/**
 * Values match the `call_status` enum in 0001_extensions_enums.sql.
 * Submitting any of these flips `deployments.call_status` to the chosen
 * value through `logActivityEvent` so the filter on `/deployments` reflects
 * who's been contacted today without a second form.
 */
export const CALL_OUTCOMES = [
  "Called-Will Return",
  "Called-Extending",
  "Called-No Response",
  "Not Required",
] as const

export const reminderCallSchema = z.object({
  event_date: dateSchema,
  call_outcome: z.enum(CALL_OUTCOMES, {
    message: "Pick a call outcome",
  }),
  notes: notesSchema,
})
export type ReminderCallInput = z.infer<typeof reminderCallSchema>

/**
 * REPLACEMENT — rider swaps vehicle mid-deployment.
 *
 * The form picks a new vehicle from the available list. The server action
 * looks up old + new VTDs and delegates to logActivityEvent, which also
 * patches `deployments.vehicle_id` to the new vehicle. The partial unique
 * index guards against swapping to a vehicle that's already in use.
 */
export const RETURN_REASONS = [
  "Vehicle breakdown",
  "Battery issue",
  "Rider request",
  "Upgrade",
  "Damage",
  "Other",
] as const

export const replacementSchema = z.object({
  event_date: dateSchema,
  new_vehicle_id: dbUuid("Pick a replacement vehicle"),
  reason: optionalText(500),
  notes: notesSchema,
})
export type ReplacementInput = z.infer<typeof replacementSchema>

/**
 * EXTENSION — rider continues with the same vehicle beyond the original term.
 *
 * `extra_weeks` is added to `deployments.weeks`; the GENERATED `due_date`
 * column automatically recalculates. logActivityEvent handles the patch.
 */
export const extensionSchema = z.object({
  event_date: dateSchema,
  extra_weeks: z.coerce
    .number({ message: "Enter the number of extra weeks" })
    .int()
    .min(1, "At least 1 week")
    .max(52, "Maximum 52 weeks"),
  notes: notesSchema,
})
export type ExtensionInput = z.infer<typeof extensionSchema>

/**
 * RETURN — rider gives the vehicle back.
 *
 * Flips `deployments.status` to 'RETURNED', sets `return_date` and
 * `return_reason`. After this the deployment disappears from the active
 * lists and the vehicle becomes available again (derived availability).
 */
export const RETURN_REASONS_FULL = [
  "Contract complete",
  "Rider request",
  "Non-payment",
  "Vehicle issue",
  "Rider relocated",
  "Other",
] as const

export const returnSchema = z.object({
  event_date: dateSchema,
  reason: z.enum(RETURN_REASONS_FULL, {
    message: "Pick a return reason",
  }),
  notes: notesSchema,
})
export type ReturnInput = z.infer<typeof returnSchema>

/**
 * LOCK — anti-fraud vehicle lock for overdue deployments.
 * Sets lock_status='Locked', lock_date, status='LOCKED'.
 */
export const lockSchema = z.object({
  event_date: dateSchema,
  notes: notesSchema,
})
export type LockInput = z.infer<typeof lockSchema>

/**
 * UNLOCK — reverse a lock after resolution (rider paid, dispute resolved).
 * Sets lock_status='Unlocked'. Status stays LOCKED until a separate
 * action (e.g. RETURN or manual) changes it — unlock is about the
 * physical vehicle lock, not the deployment lifecycle.
 */
export const unlockSchema = z.object({
  event_date: dateSchema,
  notes: notesSchema,
})
export type UnlockInput = z.infer<typeof unlockSchema>
