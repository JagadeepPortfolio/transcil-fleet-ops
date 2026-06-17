"use client"

import * as React from "react"
import { useFormState, useFormStatus } from "react-dom"
import { Dialog } from "@base-ui/react/dialog"
import { ArrowLeftRight, CalendarCog, CalendarPlus, CreditCard, Landmark, Lock, LogOut, PhoneCall, Undo2, Unlock, Wrench, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  CheckboxField,
  Field,
  FormError,
  SelectField,
  TextareaField,
} from "@/components/ui/form-fields"
import { BatchPartEntry } from "@/app/(app)/inventory/_components/batch-part-entry"
import { CALL_OUTCOMES, PAYMENT_MODES, paymentCategories, RETURN_REASONS_FULL } from "@/lib/validation/activity"
import { rentalTypes } from "@/lib/validation/deployment"
import {
  type ActionState,
  editDeployDateAction,
  extendDeploymentAction,
  lockVehicleAction,
  logReminderCallAction,
  recordDepositAction,
  recordPaymentAction,
  refundDepositAction,
  replaceVehicleAction,
  returnVehicleAction,
  unlockVehicleAction,
  logMinorRepairAction,
} from "./actions"

/**
 * Session 12 — collection loop UI.
 *
 * Four buttons on the deployment detail page, each opening its own dialog
 * with a compact form. Submitting runs a Server Action (actions.ts), which
 * validates with zod, delegates to logActivityEvent(), and revalidates the
 * detail + list + dashboard paths.
 *
 * Dialog state lives locally. When the action returns `{ ok: true }` we
 * close the dialog via an effect watching the useFormState tuple. Errors
 * render inline in the same form.
 */

type DialogKey = "payment" | "deposit" | "refund" | "call" | "replace" | "extend" | "return" | "lock" | "unlock" | "editDate" | "minorRepair" | null

export type AvailableVehicle = { id: string; vtd_no: string; ec: string | null; colour: string | null }

const INITIAL: ActionState = { ok: false, error: null }

// Temporarily disabled — Record/Refund deposit are hidden from the action bar.
// Flip to true to restore (and re-enable the guards in actions.ts).
const DEPOSITS_ENABLED = false

function today() {
  // ISO date in local time — matches the date inputs that save YYYY-MM-DD
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function EventDialogs({
  deploymentId,
  deploymentStatus,
  currentVtd,
  currentEc,
  availableVehicles,
  isCmd = false,
  deployDate,
  batteryType,
  issuedBattery,
  issuedBattery2,
  issuedCharger,
  dueDate,
  dailyLateRate = 0,
  rentOutstanding = 0,
  rateInr = 0,
  canLogRepair = false,
  stockPartNames = [],
}: {
  deploymentId: string
  deploymentStatus: string
  currentVtd: string
  currentEc?: string | null
  availableVehicles: AvailableVehicle[]
  /** Tech staff — enables the "Log minor repair" quick action. */
  canLogRepair?: boolean
  /** In-stock part names at the deployment's hub, for the minor-repair parts autocomplete. */
  stockPartNames?: string[]
  /** CMD-only controls (e.g. edit deploy date). */
  isCmd?: boolean
  /** Current deploy_date (YYYY-MM-DD), for the edit-date dialog. */
  deployDate?: string
  /** Issued accessory numbers, shown as a reference on the Return dialog. */
  batteryType?: string | null
  issuedBattery?: string | null
  issuedBattery2?: string | null
  issuedCharger?: string | null
  /** Return-balance inputs. */
  dueDate?: string
  dailyLateRate?: number
  rentOutstanding?: number
  rateInr?: number
}) {
  const [open, setOpen] = React.useState<DialogKey>(null)
  const close = React.useCallback(() => setOpen(null), [])

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("payment")}>
          <CreditCard /> Record payment
        </Button>
        {DEPOSITS_ENABLED ? (
          <>
            <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("deposit")}>
              <Landmark /> Record deposit
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("refund")}>
              <Undo2 /> Refund deposit
            </Button>
          </>
        ) : null}
        <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("call")}>
          <PhoneCall /> Log reminder call
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("replace")}>
          <ArrowLeftRight /> Replace vehicle
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("extend")}>
          <CalendarPlus /> Extend
        </Button>
        {canLogRepair && (deploymentStatus === "ACTIVE" || deploymentStatus === "LOCKED") ? (
          <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("minorRepair")}>
            <Wrench /> Log minor repair
          </Button>
        ) : null}
        <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("return")}>
          <LogOut /> Return vehicle
        </Button>
        {deploymentStatus === "ACTIVE" ? (
          <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("lock")}>
            <Lock /> Lock vehicle
          </Button>
        ) : null}
        {deploymentStatus === "LOCKED" ? (
          <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("unlock")}>
            <Unlock /> Unlock vehicle
          </Button>
        ) : null}
        {isCmd ? (
          <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("editDate")}>
            <CalendarCog /> Edit deploy date
          </Button>
        ) : null}
      </div>

      <PaymentDialog
        deploymentId={deploymentId}
        open={open === "payment"}
        onClose={close}
      />
      <DepositDialog
        deploymentId={deploymentId}
        open={open === "deposit"}
        onClose={close}
      />
      <RefundDialog
        deploymentId={deploymentId}
        open={open === "refund"}
        onClose={close}
      />
      <ReminderCallDialog
        deploymentId={deploymentId}
        open={open === "call"}
        onClose={close}
      />
      <ReplacementDialog
        deploymentId={deploymentId}
        currentVtd={currentVtd}
        currentEc={currentEc}
        availableVehicles={availableVehicles}
        batteryType={batteryType}
        issuedBattery={issuedBattery}
        issuedBattery2={issuedBattery2}
        issuedCharger={issuedCharger}
        open={open === "replace"}
        onClose={close}
      />
      <ExtensionDialog
        deploymentId={deploymentId}
        rateInr={rateInr}
        dueDate={dueDate}
        open={open === "extend"}
        onClose={close}
      />
      <ReturnDialog
        deploymentId={deploymentId}
        batteryType={batteryType}
        issuedBattery={issuedBattery}
        issuedBattery2={issuedBattery2}
        issuedCharger={issuedCharger}
        dueDate={dueDate}
        dailyLateRate={dailyLateRate}
        rentOutstanding={rentOutstanding}
        open={open === "return"}
        onClose={close}
      />
      <MinorRepairDialog
        deploymentId={deploymentId}
        stockPartNames={stockPartNames}
        open={open === "minorRepair"}
        onClose={close}
      />
      <LockDialog
        deploymentId={deploymentId}
        open={open === "lock"}
        onClose={close}
      />
      <UnlockDialog
        deploymentId={deploymentId}
        open={open === "unlock"}
        onClose={close}
      />
      {isCmd ? (
        <EditDeployDateDialog
          deploymentId={deploymentId}
          currentDeployDate={deployDate ?? ""}
          open={open === "editDate"}
          onClose={close}
        />
      ) : null}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  Shared dialog shell
// ─────────────────────────────────────────────────────────────────────────

function DialogShell({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity" />
        <Dialog.Popup className="fixed left-1/2 top-[8vh] z-50 flex max-h-[84vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl outline-none data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 transition-[opacity,transform]">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4">
            <div>
              <Dialog.Title className="text-sm font-semibold">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              render={
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              }
            />
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  )
}

function useCloseOnSuccess(state: ActionState, onClose: () => void) {
  React.useEffect(() => {
    if (state.ok) onClose()
  }, [state.ok, onClose])
}

// ─────────────────────────────────────────────────────────────────────────
//  MINOR REPAIR (on-the-spot, under active deployment)
// ─────────────────────────────────────────────────────────────────────────

function MinorRepairDialog({
  deploymentId,
  stockPartNames,
  open,
  onClose,
}: {
  deploymentId: string
  stockPartNames: string[]
  open: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    logMinorRepairAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Log minor repair"
      description="On-the-spot fix under the active deployment. Saved to the vehicle's repair history; does not change vehicle status."
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <Field label="Repair date" name="event_date" type="date" required defaultValue={today()} />
        <TextareaField
          label="What was repaired"
          name="description"
          required
          hint="e.g. tightened brake cable, fixed loose mirror"
        />
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted-foreground">
            Parts used (optional)
          </div>
          <BatchPartEntry
            partNames={stockPartNames}
            extra={{ name: "serial_no", label: "Serial no. (opt)" }}
            optional
          />
        </div>
        <div className="flex justify-end pt-2">
          <SubmitButton label="Save repair" />
        </div>
      </form>
    </DialogShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  PAYMENT
// ─────────────────────────────────────────────────────────────────────────

function PaymentDialog({
  deploymentId,
  open,
  onClose,
}: {
  deploymentId: string
  open: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    recordPaymentAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Record payment"
      description="Weekly rent collection. Txn ID is required for the payment to count toward Total Paid."
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Event date"
            name="event_date"
            type="date"
            required
            defaultValue={today()}
          />
          <Field
            label="Amount (₹)"
            name="amount_inr"
            type="number"
            required
            inputProps={{ min: 0, step: "0.01", inputMode: "decimal" }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Payment mode" name="payment_mode" required>
            <option value="" disabled>
              Choose…
            </option>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </SelectField>
          <SelectField label="Payment for" name="payment_category" required>
            {paymentCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Week #"
            name="week_number"
            type="number"
            hint="Which week this payment covers (1–52)"
            inputProps={{ min: 1, max: 52, step: 1 }}
          />
          <Field
            label="Transaction ID (UTR)"
            name="transaction_id"
            required
            hint="UPI / app reference number"
          />
        </div>
        <Field
          label="Additional Txn ID"
          name="additional_transaction_id"
          hint="Optional — use for split payments"
        />
        <TextareaField label="Notes" name="notes" rows={2} />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton label="Record payment" />
        </div>
      </form>
    </DialogShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  DEPOSIT
// ─────────────────────────────────────────────────────────────────────────

function DepositDialog({
  deploymentId,
  open,
  onClose,
}: {
  deploymentId: string
  open: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    recordDepositAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Record deposit"
      description="Security deposit collected for this deployment. Tracked separately from weekly rent."
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Event date"
            name="event_date"
            type="date"
            required
            defaultValue={today()}
          />
          <Field
            label="Amount (₹)"
            name="amount_inr"
            type="number"
            required
            inputProps={{ min: 0, step: "0.01", inputMode: "decimal" }}
          />
        </div>
        <SelectField label="Payment mode" name="payment_mode" required>
          <option value="" disabled>
            Choose…
          </option>
          {PAYMENT_MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </SelectField>
        <Field
          label="Transaction ID (UTR)"
          name="transaction_id"
          required
          hint="UPI / app reference number"
        />
        <TextareaField label="Notes" name="notes" rows={2} />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton label="Record deposit" />
        </div>
      </form>
    </DialogShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  DEPOSIT_REFUND
// ─────────────────────────────────────────────────────────────────────────

function RefundDialog({
  deploymentId,
  open,
  onClose,
}: {
  deploymentId: string
  open: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    refundDepositAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Refund deposit"
      description="Choose 'Refunded' if cash went back, or 'Carried Forward' if the deposit is moving to a new deployment."
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Event date"
            name="event_date"
            type="date"
            required
            defaultValue={today()}
          />
          <Field
            label="Amount (₹)"
            name="amount_inr"
            type="number"
            required
            inputProps={{ min: 0, step: "0.01", inputMode: "decimal" }}
          />
        </div>
        <SelectField label="Payment mode" name="payment_mode" required>
          <option value="" disabled>
            Choose…
          </option>
          {PAYMENT_MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </SelectField>
        <SelectField label="Refund status" name="refund_status" required>
          <option value="" disabled>
            Choose…
          </option>
          <option value="Refunded">Refunded (cash returned)</option>
          <option value="Carried Forward">Carried forward (new deployment)</option>
        </SelectField>
        <Field
          label="Transaction ID (UTR)"
          name="transaction_id"
          hint="For carry-forward, reuse the CARRY-xxx ref on both sides"
        />
        <TextareaField label="Notes" name="notes" rows={2} />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton label="Refund deposit" />
        </div>
      </form>
    </DialogShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  REMINDER_CALL
// ─────────────────────────────────────────────────────────────────────────

function ReminderCallDialog({
  deploymentId,
  open,
  onClose,
}: {
  deploymentId: string
  open: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    logReminderCallAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Log reminder call"
      description="Captures the outcome of a pre-due call. Flips the deployment's call status so it disappears from 'Call today' on the dashboard."
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <Field
          label="Call date"
          name="event_date"
          type="date"
          required
          defaultValue={today()}
        />
        <SelectField label="Outcome" name="call_outcome" required>
          <option value="" disabled>
            Choose…
          </option>
          {CALL_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </SelectField>
        <TextareaField
          label="Notes"
          name="notes"
          rows={3}
          hint="What the rider said — extending, returning, not reachable, etc."
        />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton label="Log call" />
        </div>
      </form>
    </DialogShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  REPLACEMENT
// ─────────────────────────────────────────────────────────────────────────

function ReplacementDialog({
  deploymentId,
  currentVtd,
  currentEc,
  availableVehicles,
  batteryType,
  issuedBattery,
  issuedBattery2,
  issuedCharger,
  open,
  onClose,
}: {
  deploymentId: string
  currentVtd: string
  currentEc?: string | null
  availableVehicles: AvailableVehicle[]
  batteryType?: string | null
  issuedBattery?: string | null
  issuedBattery2?: string | null
  issuedCharger?: string | null
  open: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    replaceVehicleAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

  const [batteryMode, setBatteryMode] = React.useState<"Same" | "Change">("Same")
  const isFixed = batteryType === "Fixed"
  const isDual = batteryType === "Dual"
  const change = batteryMode === "Change"

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Replace vehicle"
      description={`Swapping out ${currentVtd}. Pick a new vehicle — the deployment record and activity log update together.`}
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Current vehicle — VTD <span className="font-mono">{currentVtd}</span> · EC <span className="font-mono">{currentEc ?? "—"}</span>
        </div>
        <Field
          label="Event date"
          name="event_date"
          type="date"
          required
          defaultValue={today()}
        />
        <SelectField label="New vehicle" name="new_vehicle_id" required>
          <option value="" disabled>
            Pick a vehicle…
          </option>
          {availableVehicles.map((v) => (
            <option key={v.id} value={v.id}>
              VTD {v.vtd_no} · EC {v.ec ?? "—"}{v.colour ? ` · ${v.colour}` : ""}
            </option>
          ))}
        </SelectField>
        <SelectField label="Reason" name="reason">
          <option value="">No reason specified</option>
          <option value="Vehicle Issue">Vehicle Issue</option>
          <option value="Others">Others</option>
        </SelectField>
        <p className="text-[11px] text-muted-foreground">
          Choosing <strong>Vehicle Issue</strong> sends the replaced vehicle into the repair flow.
        </p>

        {/* Carries the battery type so the server requires the right fields. */}
        <input type="hidden" name="battery_type" value={batteryType ?? "Single"} />
        <SelectField
          label="Battery & charger"
          name="battery_mode"
          required
          value={batteryMode}
          onChange={(e) => setBatteryMode(e.target.value as "Same" | "Change")}
          hint={
            change
              ? "Enter the new vehicle's battery & charger numbers."
              : `Keeping current — Battery ${issuedBattery ?? "—"}${issuedBattery2 ? ` / ${issuedBattery2}` : ""} · Charger ${issuedCharger ?? "—"}.`
          }
        >
          <option value="Same">Same — keep current</option>
          <option value="Change">Change — enter new</option>
        </SelectField>

        {change ? (
          <div className="grid grid-cols-2 gap-3">
            {!isFixed ? (
              <Field
                label={isDual ? "New battery no. 1" : "New battery no."}
                name="battery_number"
                required
              />
            ) : null}
            {isDual ? (
              <Field label="New battery no. 2" name="battery_number_2" required />
            ) : null}
            <Field label="New charger cable no." name="charger_cable_number" required />
          </div>
        ) : null}

        <TextareaField label="Notes" name="notes" rows={2} />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton label="Replace vehicle" />
        </div>
      </form>
    </DialogShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  EXTENSION
// ─────────────────────────────────────────────────────────────────────────

function ExtensionDialog({
  deploymentId,
  rateInr = 0,
  dueDate,
  open,
  onClose,
}: {
  deploymentId: string
  rateInr?: number
  dueDate?: string
  open: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    extendDeploymentAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

  const [rentalType, setRentalType] =
    React.useState<(typeof rentalTypes)[number]>("Weekly")
  const [count, setCount] = React.useState("1")
  const isMonthly = rentalType === "Monthly"
  const n = Math.max(0, parseInt(count || "0", 10) || 0)
  const extraWeeks = isMonthly ? n * 4 : n

  const [collect, setCollect] = React.useState(true)
  const [amountEdited, setAmountEdited] = React.useState(false)
  const [amount, setAmount] = React.useState("")
  const computed = extraWeeks * rateInr
  const amountValue = amountEdited ? amount : computed ? String(computed) : ""

  const newDue = dueDate && extraWeeks > 0 ? addDaysISO(dueDate, extraWeeks * 7) : null
  const inr = (v: number) => `₹${v.toLocaleString("en-IN")}`

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Extend deployment"
      description="Extend by weeks or months (1 month = 4 weeks). The due date extends from the current due date; collect the extra rent right here."
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Event date"
            name="event_date"
            type="date"
            required
            defaultValue={today()}
          />
          <SelectField
            label="Extend by"
            name="rental_type"
            required
            value={rentalType}
            onChange={(e) => {
              setRentalType(e.target.value as (typeof rentalTypes)[number])
              setCount("1")
            }}
          >
            {rentalTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </SelectField>
        </div>
        <Field
          label={isMonthly ? "Number of months" : "Number of weeks"}
          name="count_display"
          type="number"
          required
          inputProps={{
            min: 1,
            max: isMonthly ? 12 : 52,
            step: 1,
            value: count,
            onChange: (e) => setCount(e.target.value),
          }}
          hint={
            isMonthly
              ? `Each month = 4 weeks. Adds ${extraWeeks} week${extraWeeks === 1 ? "" : "s"} to the term.`
              : undefined
          }
        />
        {/* The server reads extra_weeks; monthly is converted to weeks here. */}
        <input type="hidden" name="extra_weeks" value={String(extraWeeks)} />

        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Due date{" "}
          <span className="font-mono">{dueDate ?? "—"}</span>
          {newDue ? (
            <>
              {" → "}
              <span className="font-mono font-semibold text-foreground">{newDue}</span>{" "}
              (+{extraWeeks} wk{extraWeeks === 1 ? "" : "s"})
            </>
          ) : null}
          {computed ? <> · extra rent {inr(computed)}</> : null}
        </div>

        <fieldset className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <CheckboxField
            label="Collect payment now"
            name="collect_payment"
            checked={collect}
            onChange={(e) => setCollect(e.target.checked)}
            hint="Record the extra rent here — no need to open Record Payment separately."
          />
          {collect ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Amount (₹)"
                  name="amount_inr"
                  type="number"
                  required
                  inputProps={{
                    min: 0,
                    step: "0.01",
                    inputMode: "decimal",
                    value: amountValue,
                    onChange: (e) => {
                      setAmountEdited(true)
                      setAmount(e.target.value)
                    },
                  }}
                />
                <SelectField label="Payment mode" name="payment_mode" required>
                  <option value="" disabled>
                    Choose…
                  </option>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Week #"
                  name="week_number"
                  type="number"
                  inputProps={{ min: 1, max: 52, step: 1 }}
                  hint="Which week this covers (optional)."
                />
                <Field
                  label="Transaction ID (UTR)"
                  name="transaction_id"
                  required
                  hint="UPI / app reference number."
                />
              </div>
            </>
          ) : null}
        </fieldset>

        <TextareaField
          label="Notes"
          name="notes"
          rows={2}
          hint="Reason for extension, new agreed terms, etc."
        />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton label="Extend" />
        </div>
      </form>
    </DialogShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  RETURN
// ─────────────────────────────────────────────────────────────────────────

function ReturnDialog({
  deploymentId,
  batteryType,
  issuedBattery,
  issuedBattery2,
  issuedCharger,
  dueDate,
  dailyLateRate = 0,
  rentOutstanding = 0,
  open,
  onClose,
}: {
  deploymentId: string
  batteryType?: string | null
  issuedBattery?: string | null
  issuedBattery2?: string | null
  issuedCharger?: string | null
  dueDate?: string
  dailyLateRate?: number
  rentOutstanding?: number
  open: boolean
  onClose: () => void
}) {
  // Null/legacy deployments are treated as Single (one battery number).
  const isFixed = batteryType === "Fixed"
  const isDual = batteryType === "Dual"
  const [state, formAction] = useFormState(
    returnVehicleAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

  const [returnDate, setReturnDate] = React.useState(today())
  const daysLate =
    dueDate && returnDate
      ? Math.max(
          0,
          Math.round(
            (Date.parse(returnDate) - Date.parse(dueDate)) / 86_400_000
          )
        )
      : 0
  const lateFee = daysLate * dailyLateRate
  const totalToCollect = rentOutstanding + lateFee
  const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Return vehicle"
      description="Marks this deployment as RETURNED. The vehicle becomes available for new deployments."
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <Field
          label="Return date"
          name="event_date"
          type="date"
          required
          inputProps={{
            value: returnDate,
            onChange: (e) => setReturnDate(e.target.value),
          }}
        />
        <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rent outstanding</span>
            <span className="font-medium tabular-nums">
              {inr(rentOutstanding)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Late fee{" "}
              {daysLate > 0
                ? `(${daysLate} day${daysLate === 1 ? "" : "s"} × ${inr(dailyLateRate)})`
                : "(on time)"}
            </span>
            <span className="font-medium tabular-nums">{inr(lateFee)}</span>
          </div>
          <div className="flex justify-between border-t border-amber-200 pt-1 font-semibold text-foreground">
            <span>Total to collect</span>
            <span className="tabular-nums">{inr(totalToCollect)}</span>
          </div>
          <p className="pt-1 text-[11px] leading-snug text-muted-foreground">
            Collect via Record Payment — rent as <b>Billing Cycle</b>, the late
            charge as <b>Late fee</b>. This is informational; returning does not
            auto-charge.
          </p>
        </div>
        <SelectField label="Return reason" name="reason" required>
          <option value="" disabled>
            Choose…
          </option>
          {RETURN_REASONS_FULL.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </SelectField>
        {/* Tells the server how many returned battery numbers to require. */}
        <input type="hidden" name="battery_type" value={batteryType ?? "Single"} />
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Issued at deployment — Battery type:{" "}
          <span className="font-mono">{batteryType ?? "—"}</span>
          {!isFixed ? (
            <>
              {" "}· Battery{isDual ? " 1" : ""}:{" "}
              <span className="font-mono">{issuedBattery ?? "—"}</span>
            </>
          ) : null}
          {isDual ? (
            <>
              {" "}· Battery 2:{" "}
              <span className="font-mono">{issuedBattery2 ?? "—"}</span>
            </>
          ) : null}{" "}
          · Charger: <span className="font-mono">{issuedCharger ?? "—"}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {!isFixed ? (
            <Field
              label={isDual ? "Returned battery no. 1" : "Returned battery no."}
              name="battery_number"
              required
              hint="For records"
            />
          ) : null}
          {isDual ? (
            <Field
              label="Returned battery no. 2"
              name="battery_number_2"
              required
              hint="For records"
            />
          ) : null}
          <Field
            label="Returned charger cable no."
            name="charger_cable_number"
            required
            hint="For records"
          />
        </div>
        <TextareaField
          label="Notes"
          name="notes"
          rows={2}
          hint="Any details — outstanding balance, vehicle condition, etc."
        />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton label="Return vehicle" />
        </div>
      </form>
    </DialogShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  LOCK
// ─────────────────────────────────────────────────────────────────────────

function LockDialog({
  deploymentId,
  open,
  onClose,
}: {
  deploymentId: string
  open: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    lockVehicleAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Lock vehicle"
      description="Anti-fraud lock for overdue riders. Disables the vehicle remotely. Deployment status flips to LOCKED."
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <Field
          label="Lock date"
          name="event_date"
          type="date"
          required
          defaultValue={today()}
        />
        <TextareaField
          label="Notes"
          name="notes"
          rows={3}
          hint="Reason for lock — overdue amount, failed contact attempts, etc."
        />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton label="Lock vehicle" />
        </div>
      </form>
    </DialogShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  UNLOCK
// ─────────────────────────────────────────────────────────────────────────

function UnlockDialog({
  deploymentId,
  open,
  onClose,
}: {
  deploymentId: string
  open: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    unlockVehicleAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Unlock vehicle"
      description="Re-enables the vehicle after the rider has resolved the issue (paid dues, etc.)."
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <Field
          label="Unlock date"
          name="event_date"
          type="date"
          required
          defaultValue={today()}
        />
        <TextareaField
          label="Notes"
          name="notes"
          rows={3}
          hint="Resolution details — payment received, dispute settled, etc."
        />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton label="Unlock vehicle" />
        </div>
      </form>
    </DialogShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  DEPLOY_DATE_EDIT (CMD only)
// ─────────────────────────────────────────────────────────────────────────

function EditDeployDateDialog({
  deploymentId,
  currentDeployDate,
  open,
  onClose,
}: {
  deploymentId: string
  currentDeployDate: string
  open: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    editDeployDateAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Edit deploy date"
      description="Correct the deployment's start date. Due date recalculates, and the initial payment/deposit (recorded on the old date) move to the new date. The change is logged on the timeline with your reason."
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Current date"
            name="current_date_display"
            type="date"
            defaultValue={currentDeployDate}
            inputProps={{ readOnly: true, disabled: true }}
          />
          <Field
            label="New deploy date"
            name="new_deploy_date"
            type="date"
            required
            defaultValue={currentDeployDate}
          />
        </div>
        <TextareaField
          label="Reason"
          name="reason"
          rows={2}
          hint="Why the date is being corrected (required for the audit trail)."
        />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton label="Save new date" />
        </div>
      </form>
    </DialogShell>
  )
}
