"use client"

import * as React from "react"

import { Field, SelectField, TextareaField } from "@/components/ui/form-fields"
import { purposeOptions } from "@/lib/validation/rider"

/**
 * Purpose section with conditional fields:
 *  - a delivery platform → required Store ID / Store Location
 *  - "Others" → a required free-text description
 * Only the relevant inputs render, so only those submit.
 */
export function RiderPurposeFields() {
  const [purpose, setPurpose] = React.useState("")
  const isOther = purpose === "Others"
  const isStore = purpose !== "" && !isOther

  return (
    <div className="space-y-1.5">
      <SelectField
        label="Purpose"
        name="purpose"
        required
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
      >
        <option value="">Select…</option>
        {purposeOptions.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </SelectField>

      {isStore ? (
        <div className="grid gap-5 pt-2 sm:grid-cols-2">
          <Field
            label="Store ID"
            name="store_id"
            required
            hint={`The rider's ID for ${purpose}`}
          />
          <Field label="Store Location" name="store_location" required />
        </div>
      ) : null}

      {isOther ? (
        <div className="pt-2">
          <TextareaField
            label="Describe the purpose"
            name="purpose_other"
            rows={2}
            hint="e.g. personal / non-delivery use"
          />
        </div>
      ) : null}
    </div>
  )
}
