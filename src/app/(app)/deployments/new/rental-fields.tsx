"use client"

import * as React from "react"

import {
  CheckboxField,
  Field,
  SelectField,
} from "@/components/ui/form-fields"
import { rentalTypes } from "@/lib/validation/deployment"
import { PAYMENT_MODES } from "@/lib/validation/activity"

// Monthly is a fixed 4-week term. The rate is shown to staff as a ₹/month
// figure (default ₹6500) but stored as the weekly-equivalent (₹1625) so the
// contract total — weeks × rate_inr — works out to the monthly amount.
// Weekly bills ₹1799/week over an editable number of weeks.
const WEEKLY_DEFAULT = "1799"
const MONTHLY_DEFAULT = "6500"
const MONTHLY_WEEKS = 4
const WEEKLY_WEEKS = 1
const DEPOSIT_DEFAULT = "2000"

/**
 * Owns every field whose value or visibility reacts to another input:
 *  - rate / weeks         ← rental type
 *  - initial payment amt  ← rental type (defaults to the cash amount due)
 *  - deposit collection   ← "New deposit needed" checkbox
 *
 * The initial PAYMENT is always recorded; the DEPOSIT is recorded only when
 * a new deposit is needed. The server action (page.tsx) reads these fields.
 */
export function RentalFields({ today }: { today: string }) {
  const [rentalType, setRentalType] =
    React.useState<(typeof rentalTypes)[number]>("Weekly")
  const [weeklyRate, setWeeklyRate] = React.useState(WEEKLY_DEFAULT)
  const [monthlyRate, setMonthlyRate] = React.useState(MONTHLY_DEFAULT)
  const [weeks, setWeeks] = React.useState(String(WEEKLY_WEEKS))
  const [depositNeeded, setDepositNeeded] = React.useState(true)

  const isMonthly = rentalType === "Monthly"

  // Cash amount due for the period (shown to staff). Also the default for the
  // initial payment field.
  const cashRate = isMonthly ? monthlyRate : weeklyRate
  // What actually gets stored in deployments.rate_inr (always ₹/week).
  const weeklyEquivalent = isMonthly
    ? String((Number(monthlyRate) || 0) / MONTHLY_WEEKS)
    : weeklyRate
  const submittedWeeks = isMonthly ? String(MONTHLY_WEEKS) : weeks

  // Initial payment amount: defaults to the cash rate, but staff can override.
  // `paymentEdited` tracks whether they've typed, so it keeps tracking the
  // rate default until they take over.
  const [paymentEdited, setPaymentEdited] = React.useState(false)
  const [paymentAmount, setPaymentAmount] = React.useState(WEEKLY_DEFAULT)
  const effectivePayment = paymentEdited ? paymentAmount : cashRate

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as (typeof rentalTypes)[number]
    setRentalType(next)
    setWeeks(String(next === "Monthly" ? MONTHLY_WEEKS : WEEKLY_WEEKS))
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Rental type"
          name="rental_type"
          required
          value={rentalType}
          onChange={handleTypeChange}
        >
          {rentalTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>

        <Field
          label="Deploy date"
          name="deploy_date"
          type="date"
          defaultValue={today}
          required
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Weeks"
          name="weeks"
          type="number"
          required
          inputProps={{
            min: 1,
            max: 52,
            value: submittedWeeks,
            onChange: (e) => setWeeks(e.target.value),
            readOnly: isMonthly,
          }}
          hint={isMonthly ? "Fixed at 4 weeks for monthly rentals." : undefined}
        />

        {/* Display-only rate. The stored ₹/week value rides in the hidden
            input below so monthly stores 1625, not 6500. */}
        <Field
          label={isMonthly ? "Rate (₹/month)" : "Rate (₹/week)"}
          name="rate_display"
          type="number"
          required
          inputProps={{
            min: 0,
            step: "0.01",
            value: isMonthly ? monthlyRate : weeklyRate,
            onChange: (e) =>
              isMonthly
                ? setMonthlyRate(e.target.value)
                : setWeeklyRate(e.target.value),
          }}
          hint={
            isMonthly
              ? `Stored as ₹${weeklyEquivalent}/week × 4 weeks.`
              : undefined
          }
        />
      </div>

      <input type="hidden" name="rate_inr" value={weeklyEquivalent} />

      {/* ── Initial payment (always recorded) ────────────────────────────── */}
      <fieldset className="space-y-4 rounded-lg border bg-muted/30 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Initial payment
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Amount collected (₹)"
            name="payment_amount_inr"
            type="number"
            required
            inputProps={{
              min: 0,
              step: "0.01",
              inputMode: "decimal",
              value: effectivePayment,
              onChange: (e) => {
                setPaymentEdited(true)
                setPaymentAmount(e.target.value)
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
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Week #"
            name="payment_week_number"
            type="number"
            defaultValue="1"
            inputProps={{ min: 1, max: 52, step: 1 }}
            hint="Which week this payment covers."
          />
          <Field
            label="Transaction ID (UTR)"
            name="payment_txn_id"
            hint="UPI/bank ref — leave blank for cash."
          />
        </div>
      </fieldset>

      {/* ── Deposit ──────────────────────────────────────────────────────── */}
      <fieldset className="space-y-4 rounded-lg border bg-muted/30 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Deposit
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Deposit required (₹)"
            name="deposit_required_inr"
            type="number"
            inputProps={{ min: 0, step: "0.01" }}
            defaultValue={DEPOSIT_DEFAULT}
          />
          <div className="flex items-end">
            <CheckboxField
              label="New deposit needed"
              name="new_deposit_needed"
              checked={depositNeeded}
              onChange={(e) => setDepositNeeded(e.target.checked)}
              hint="Uncheck if carried forward from a prior deployment."
            />
          </div>
        </div>
        {depositNeeded ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label="Deposit payment mode" name="deposit_mode" required>
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
              name="deposit_txn_id"
              hint="UPI/bank ref — leave blank for cash."
            />
          </div>
        ) : null}
      </fieldset>
    </>
  )
}
