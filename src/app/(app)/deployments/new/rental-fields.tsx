"use client"

import * as React from "react"

import { Field, SelectField } from "@/components/ui/form-fields"
import { rentalTypes } from "@/lib/validation/deployment"

// Monthly is a fixed 4-week term. The rate is shown to staff as a ₹/month
// figure (default ₹6500) but stored as the weekly-equivalent (₹1625) so the
// contract total — weeks × rate_inr — works out to the monthly amount.
// Weekly bills ₹1799/week over an editable number of weeks.
const WEEKLY_DEFAULT = "1799"
const MONTHLY_DEFAULT = "6500"
const MONTHLY_WEEKS = 4

export function RentalFields({ today }: { today: string }) {
  const [rentalType, setRentalType] =
    React.useState<(typeof rentalTypes)[number]>("Weekly")
  const [weeklyRate, setWeeklyRate] = React.useState(WEEKLY_DEFAULT)
  const [monthlyRate, setMonthlyRate] = React.useState(MONTHLY_DEFAULT)
  const [weeks, setWeeks] = React.useState(String(MONTHLY_WEEKS))

  const isMonthly = rentalType === "Monthly"

  // What actually gets stored in deployments.rate_inr (always ₹/week).
  const weeklyEquivalent = isMonthly
    ? String((Number(monthlyRate) || 0) / MONTHLY_WEEKS)
    : weeklyRate
  const submittedWeeks = isMonthly ? String(MONTHLY_WEEKS) : weeks

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as (typeof rentalTypes)[number]
    setRentalType(next)
    if (next === "Monthly") setWeeks(String(MONTHLY_WEEKS))
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
    </>
  )
}
