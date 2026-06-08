"use client"

import * as React from "react"

import { Field, SelectField } from "@/components/ui/form-fields"
import { batteryTypes } from "@/lib/validation/deployment"

/**
 * Accessories handed over at deployment. Battery type drives the battery-number
 * inputs:
 *   Fixed  → no battery number (built-in / non-removable)
 *   Single → one battery number
 *   Dual   → two battery numbers
 * The charger cable number is always captured.
 */
export function AccessoryFields() {
  const [batteryType, setBatteryType] =
    React.useState<(typeof batteryTypes)[number]>("Single")

  const isSingle = batteryType === "Single"
  const isDual = batteryType === "Dual"

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Accessories handed over
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Battery type"
          name="battery_type"
          required
          value={batteryType}
          onChange={(e) =>
            setBatteryType(e.target.value as (typeof batteryTypes)[number])
          }
        >
          {batteryTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>

        <Field
          label="Charger cable number"
          name="charger_cable_number"
          required
        />
      </div>

      {isSingle || isDual ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={isDual ? "Battery number 1" : "Battery number"}
            name="battery_number"
            required
          />
          {isDual ? (
            <Field
              label="Battery number 2"
              name="battery_number_2"
              required
            />
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Fixed battery — no battery number required.
        </p>
      )}
    </div>
  )
}
