// Dev seed — mirrors supabase/seed.sql but drives it via supabase-js
// (service role) so it can run against the remote project without needing
// direct Postgres access. Idempotent: ON CONFLICT DO NOTHING semantics.
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function lookupId(table, col, val) {
  const { data, error } = await sb.from(table).select("id").eq(col, val).maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`no ${table} where ${col}=${val}`)
  return data.id
}

async function upsert(table, rows) {
  const { error } = await sb.from(table).upsert(rows, { onConflict: "id", ignoreDuplicates: true })
  if (error) throw new Error(`${table}: ${error.message}`)
  console.log(`  ✓ ${table}: ${rows.length} row(s) upserted`)
}

console.log("=== Seeding dev data ===\n")

// Vehicles
const [vtStd, vtPro, vtScooter] = await Promise.all([
  lookupId("vehicle_types", "name", "E-Bike Standard"),
  lookupId("vehicle_types", "name", "E-Bike Pro"),
  lookupId("vehicle_types", "name", "E-Scooter"),
])

await upsert("vehicles", [
  {
    id: "10000000-0000-0000-0000-000000000001",
    vtd_no: "VTD-DEV-001",
    vehicle_id: "HYD-EB-001",
    vehicle_type_id: vtStd,
    colour: "White",
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    vtd_no: "VTD-DEV-002",
    vehicle_id: "HYD-EB-002",
    vehicle_type_id: vtPro,
    colour: "Red",
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    vtd_no: "VTD-DEV-003",
    vehicle_id: "HYD-ES-001",
    vehicle_type_id: vtScooter,
    colour: "Black",
  },
])

// Riders
const [locHyd, locSec, locCyb, locWgl] = await Promise.all([
  lookupId("locations", "name", "Hyderabad"),
  lookupId("locations", "name", "Secunderabad"),
  lookupId("locations", "name", "Cyberabad"),
  lookupId("locations", "name", "Warangal"),
])

await upsert("riders", [
  {
    id: "20000000-0000-0000-0000-000000000001",
    name: "Ravi Kumar",
    phone: "9000000001",
    source: "Individual",
    location_id: locHyd,
    address: "Kukatpally, Hyderabad",
  },
  {
    id: "20000000-0000-0000-0000-000000000002",
    name: "Suresh Reddy",
    phone: "9000000002",
    source: "Individual",
    location_id: locSec,
    address: "Tarnaka, Secunderabad",
  },
  {
    id: "20000000-0000-0000-0000-000000000003",
    name: "Arjun Varma",
    phone: "9000000003",
    source: "3PL",
    location_id: locCyb,
    address: "Gachibowli, Cyberabad",
  },
  {
    id: "20000000-0000-0000-0000-000000000004",
    name: "Mahesh Goud",
    phone: "9000000004",
    source: "Camions",
    location_id: locWgl,
    address: "Hanamkonda, Warangal",
  },
  {
    id: "20000000-0000-0000-0000-000000000005",
    name: "Kiran Rao",
    phone: "9000000005",
    source: "Individual",
    location_id: locHyd,
    address: "LB Nagar, Hyderabad",
  },
])

// Deployments — one OK (recent), one LOCK_NOW (overdue)
const [hubHyd, hubSec] = await Promise.all([
  lookupId("hubs", "code", "HYD"),
  lookupId("hubs", "code", "SEC"),
])

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

await upsert("deployments", [
  {
    id: "30000000-0000-0000-0000-000000000001",
    rider_id: "20000000-0000-0000-0000-000000000001",
    vehicle_id: "10000000-0000-0000-0000-000000000001",
    hub_id: hubHyd,
    deploy_date: daysAgo(2),
    weeks: 4,
    rate_inr: 1500,
    deposit_required_inr: 3000,
    new_deposit_needed: true,
    status: "ACTIVE",
  },
  {
    id: "30000000-0000-0000-0000-000000000002",
    rider_id: "20000000-0000-0000-0000-000000000002",
    vehicle_id: "10000000-0000-0000-0000-000000000002",
    hub_id: hubSec,
    deploy_date: daysAgo(10),
    weeks: 1,
    rate_inr: 1800,
    deposit_required_inr: 3500,
    new_deposit_needed: true,
    status: "ACTIVE",
  },
])

console.log("\n✓ Seed complete")
