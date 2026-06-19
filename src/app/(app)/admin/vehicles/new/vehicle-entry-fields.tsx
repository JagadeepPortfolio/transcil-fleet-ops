"use client"

import * as React from "react"

import { Field, SelectField } from "@/components/ui/form-fields"
import { businessTypes } from "@/lib/validation/vehicle"

/**
 * New Vehicle entry fields with EC-No-driven autofill.
 *
 * EC No is the primary input. On change (debounced) it looks up the
 * vehicle_reference catalog via /api/vehicle-reference and pre-fills VTD
 * (Device ID), Chassis No, and Colour. All fields stay editable, and an
 * unmatched EC just leaves them for manual entry.
 */
export function VehicleEntryFields() {
  const [ec, setEc] = React.useState("")
  const [vtd, setVtd] = React.useState("")
  const [chassis, setChassis] = React.useState("")
  const [colour, setColour] = React.useState("")
  const [status, setStatus] = React.useState<
    "idle" | "loading" | "matched" | "nomatch"
  >("idle")

  // Debounced reference lookup keyed off the latest EC value.
  React.useEffect(() => {
    const value = ec.trim()
    if (!value) {
      setStatus("idle")
      return
    }
    setStatus("loading")
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/vehicle-reference?ec=${encodeURIComponent(value)}`,
          { signal: ctrl.signal }
        )
        const data = await res.json()
        if (data.found) {
          setVtd(data.device_id ?? "")
          setChassis(data.chassis_no ?? "")
          setColour(data.color ?? "")
          setStatus("matched")
        } else {
          setStatus("nomatch")
        }
      } catch {
        // aborted or network error — leave fields as-is
      }
    }, 300)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [ec])

  return (
    <>
      <Field
        label="EC No"
        name="vehicle_id"
        required
        inputProps={{
          value: ec,
          onChange: (e) => setEc(e.target.value),
          autoComplete: "off",
          placeholder: "EC000001",
        }}
        hint={
          status === "loading"
            ? "Looking up reference…"
            : status === "matched"
              ? "Matched from reference — details filled below (editable)."
              : status === "nomatch"
                ? "No match — enter the details manually."
                : "Type the EC No to auto-fill from the reference catalog."
        }
      />
      <Field
        label="VTD number (Device ID)"
        name="vtd_no"
        required
        inputProps={{
          value: vtd,
          onChange: (e) => setVtd(e.target.value),
        }}
      />
      <Field
        label="Chassis No"
        name="chassis_no"
        inputProps={{
          value: chassis,
          onChange: (e) => setChassis(e.target.value),
        }}
      />
      <Field
        label="Colour"
        name="colour"
        inputProps={{
          value: colour,
          onChange: (e) => setColour(e.target.value),
        }}
      />
      <SelectField label="Business Type" name="business_type" defaultValue="B2C">
        {businessTypes.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </SelectField>
    </>
  )
}
