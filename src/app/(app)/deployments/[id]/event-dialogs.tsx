"use client"

import * as React from "react"
import { useFormState, useFormStatus } from "react-dom"
import { Dialog } from "@base-ui/react/dialog"
import { ArrowLeftRight, CalendarPlus, CreditCard, Landmark, Lock, LogOut, PhoneCall, Undo2, Unlock, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FormError,
  SelectField,
  TextareaField,
} from "@/components/ui/form-fields"
import { CALL_OUTCOMES, PAYMENT_MODES, RETURN_REASONS, RETURN_REASONS_FULL } from "@/lib/validation/activity"
import {
  type ActionState,
  extendDeploymentAction,
  lockVehicleAction,
  logReminderCallAction,
  recordDepositAction,
  recordPaymentAction,
  refundDepositAction,
  replaceVehicleAction,
  returnVehicleAction,
  unlockVehicleAction,
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

type DialogKey = "payment" | "deposit" | "refund" | "call" | "replace" | "extend" | "return" | "lock" | "unlock" | null

export type AvailableVehicle = { id: string; vtd_no: string; colour: string | null }

const INITIAL: ActionState = { ok: false, error: null }

function today() {
  // ISO date in local time — matches the date inputs that save YYYY-MM-DD
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

export function EventDialogs({
  deploymentId,
  deploymentStatus,
  currentVtd,
  availableVehicles,
}: {
  deploymentId: string
  deploymentStatus: string
  currentVtd: string
  availableVehicles: AvailableVehicle[]
}) {
  const [open, setOpen] = React.useState<DialogKey>(null)
  const close = React.useCallback(() => setOpen(null), [])

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("payment")}>
          <CreditCard /> Record payment
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("deposit")}>
          <Landmark /> Record deposit
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("refund")}>
          <Undo2 /> Refund deposit
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("call")}>
          <PhoneCall /> Log reminder call
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("replace")}>
          <ArrowLeftRight /> Replace vehicle
        </Button>
        <Button variant="ghost" className="w-full justify-start" onClick={() => setOpen("extend")}>
          <CalendarPlus /> Extend
        </Button>
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
        availableVehicles={availableVehicles}
        open={open === "replace"}
        onClose={close}
      />
      <ExtensionDialog
        deploymentId={deploymentId}
        open={open === "extend"}
        onClose={close}
      />
      <ReturnDialog
        deploymentId={deploymentId}
        open={open === "return"}
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
        <Dialog.Popup className="fixed left-1/2 top-[10vh] z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl outline-none data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 transition-[opacity,transform]">
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
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
          <div className="px-5 py-4">{children}</div>
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
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Week #"
            name="week_number"
            type="number"
            hint="Which week this payment covers (1–52)"
            inputProps={{ min: 1, max: 52, step: 1 }}
          />
          <Field
            label="Transaction ID"
            name="transaction_id"
            hint="UPI ref, receipt no, bank ref… leave blank for cash"
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
          label="Transaction ID"
          name="transaction_id"
          hint="UPI ref, receipt no, bank ref…"
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
          label="Transaction ID"
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
  availableVehicles,
  open,
  onClose,
}: {
  deploymentId: string
  currentVtd: string
  availableVehicles: AvailableVehicle[]
  open: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    replaceVehicleAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Replace vehicle"
      description={`Swapping out ${currentVtd}. Pick a new vehicle — the deployment record and activity log update together.`}
    >
      <form action={formAction} className="space-y-4">
        <FormError message={state.error} />
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
              {v.vtd_no}{v.colour ? ` — ${v.colour}` : ""}
            </option>
          ))}
        </SelectField>
        <SelectField label="Reason" name="reason">
          <option value="">No reason specified</option>
          {RETURN_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </SelectField>
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
  open,
  onClose,
}: {
  deploymentId: string
  open: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    extendDeploymentAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Extend deployment"
      description="Add extra weeks to this deployment. The due date recalculates automatically."
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
            label="Extra weeks"
            name="extra_weeks"
            type="number"
            required
            inputProps={{ min: 1, max: 52, step: 1 }}
          />
        </div>
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
  open,
  onClose,
}: {
  deploymentId: string
  open: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    returnVehicleAction.bind(null, deploymentId),
    INITIAL
  )
  useCloseOnSuccess(state, onClose)

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
          defaultValue={today()}
        />
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
