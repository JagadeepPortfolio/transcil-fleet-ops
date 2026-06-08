"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Field,
  SelectField,
  TextareaField,
} from "@/components/ui/form-fields"
import { PAYMENT_MODES } from "@/lib/validation/activity"
import { RentalFields } from "./rental-fields"
import { AccessoryFields } from "./accessory-fields"

type RiderOpt = {
  id: string
  name: string
  phone: string
  app_rider_id: string | null
  source: string | null
}
type HubOpt = { id: number; code: string; name: string }

const THREE_PL_DEPOSIT = "2000"

/**
 * New-deployment form. Lives client-side so the rent section can react to the
 * selected rider's Source: a 3PL rider gets a deposit-only deployment (no
 * weekly rent), everyone else gets the normal rental + initial-payment flow.
 * The server action re-derives 3PL from the rider's source (source of truth).
 */
export function NewDeploymentForm({
  riders,
  vehicles,
  hubs,
  today,
  defaultHubId,
  defaultRider,
  action,
}: {
  riders: RiderOpt[]
  vehicles: Array<Record<string, unknown>>
  hubs: HubOpt[]
  today: string
  defaultHubId?: number
  defaultRider?: string
  action: (formData: FormData) => void | Promise<void>
}) {
  const [riderId, setRiderId] = React.useState(defaultRider ?? "")
  const is3PL = riders.find((r) => r.id === riderId)?.source === "3PL"

  return (
    <form action={action} className="space-y-5 p-6">
      <SelectField
        label="Rider"
        name="rider_id"
        required
        value={riderId}
        onChange={(e) => setRiderId(e.target.value)}
      >
        <option value="">Select a rider…</option>
        {riders.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} — {r.phone}
            {r.source === "3PL" ? " · 3PL" : ""}
            {r.app_rider_id ? ` (${r.app_rider_id})` : ""}
          </option>
        ))}
      </SelectField>

      <SelectField label="Vehicle" name="vehicle_id" required>
        <option value="">Select a vehicle…</option>
        {vehicles.length === 0 ? (
          <option disabled value="">
            No vehicles available — add some under Admin → Vehicles
          </option>
        ) : (
          vehicles.map((v) => (
            <option key={v.id as string} value={v.id as string}>
              {(v.vtd_no as string) ?? ""}
              {v.vehicle_id ? ` · ${v.vehicle_id as string}` : ""}
              {v.colour ? ` · ${v.colour as string}` : ""}
            </option>
          ))
        )}
      </SelectField>

      <SelectField
        label="Hub"
        name="hub_id"
        required
        defaultValue={defaultHubId ? String(defaultHubId) : ""}
      >
        <option value="">Select a hub…</option>
        {hubs.map((h) => (
          <option key={h.id} value={h.id}>
            {h.code} — {h.name}
          </option>
        ))}
      </SelectField>

      <AccessoryFields />

      {is3PL ? <ThreePLDeposit today={today} /> : <RentalFields today={today} />}

      <TextareaField label="Notes" name="notes" />

      <div className="flex items-center justify-end gap-3 border-t pt-5">
        <Button variant="ghost" render={<Link href="/deployments" />}>
          Cancel
        </Button>
        <Button type="submit" size="lg">
          Create deployment
        </Button>
      </div>
    </form>
  )
}

/**
 * 3PL deployments: no weekly rent, only a fixed ₹2,000 deposit. The hidden
 * inputs keep the deployment schema satisfied (rate 0, 1 week) while the server
 * marks the row billing_exempt and skips the initial payment.
 */
function ThreePLDeposit({ today }: { today: string }) {
  return (
    <>
      <input type="hidden" name="rental_type" value="Weekly" />
      <input type="hidden" name="weeks" value="1" />
      <input type="hidden" name="rate_inr" value="0" />
      <input type="hidden" name="new_deposit_needed" value="on" />
      <input
        type="hidden"
        name="deposit_required_inr"
        value={THREE_PL_DEPOSIT}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Deploy date"
          name="deploy_date"
          type="date"
          defaultValue={today}
          required
        />
      </div>

      <fieldset className="space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
          3PL — deposit only
        </legend>
        <p className="text-xs text-muted-foreground">
          Third-Party Logistics account: <b>no weekly rent</b>. Only the
          security deposit is collected.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Deposit (₹)"
            name="deposit_display"
            type="number"
            inputProps={{ value: THREE_PL_DEPOSIT, readOnly: true }}
          />
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
        </div>
        <Field
          label="Transaction ID (UTR)"
          name="deposit_txn_id"
          required
          hint="UPI / app reference number."
        />
      </fieldset>
    </>
  )
}
