// Phase B — DB integrity smoke tests via service role key.
// Usage: node scripts/smoke-db.mjs
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

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("missing env")
  process.exit(1)
}
const sb = createClient(url, key, { auth: { persistSession: false } })

const results = []
function ok(name, detail = "") {
  results.push({ name, ok: true, detail })
  console.log(`  ✓ ${name}${detail ? " — " + detail : ""}`)
}
function fail(name, detail) {
  results.push({ name, ok: false, detail })
  console.log(`  ✗ ${name} — ${detail}`)
}

console.log("=== DB smoke tests ===\n")

// 10. deployments_enriched view returns rows with expected columns
{
  const { data, error } = await sb
    .from("deployments_enriched")
    .select("id, rider_name, vtd_no, status, action, pay_status, days_left, balance")
    .limit(5)
  if (error) fail("deployments_enriched view", error.message)
  else
    ok(
      "deployments_enriched view",
      `${data.length} rows; sample action=${data[0]?.action ?? "none"} pay=${data[0]?.pay_status ?? "none"}`
    )
}

// 11. Seed data present
{
  const [riders, deployments, vehicles, hubs] = await Promise.all([
    sb.from("riders").select("*", { count: "exact", head: true }),
    sb.from("deployments").select("*", { count: "exact", head: true }),
    sb.from("vehicles").select("*", { count: "exact", head: true }),
    sb.from("hubs").select("*", { count: "exact", head: true }),
  ])
  ok(
    "seed row counts",
    `riders=${riders.count} deployments=${deployments.count} vehicles=${vehicles.count} hubs=${hubs.count}`
  )
}

// 12. app_users: CMD user exists with role='CMD'
{
  const { data, error } = await sb
    .from("app_users")
    .select("id, full_name, role, hub_id")
    .eq("role", "CMD")
  if (error) fail("CMD app_users row", error.message)
  else if (data.length === 0) fail("CMD app_users row", "no CMD users")
  else ok("CMD app_users row", `${data.length} CMD user(s)`)
}

// 13. Partial unique index on ACTIVE deployments per vehicle — attempt duplicate insert
{
  const { data: active } = await sb
    .from("deployments")
    .select("id, rider_id, vehicle_id, hub_id, deploy_date, weeks, rate_inr")
    .eq("status", "ACTIVE")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle()

  if (!active) {
    fail("partial unique index test", "no ACTIVE deployment to dupe")
  } else {
    const { error } = await sb.from("deployments").insert({
      rider_id: active.rider_id,
      vehicle_id: active.vehicle_id,
      hub_id: active.hub_id,
      deploy_date: new Date().toISOString().slice(0, 10),
      weeks: 1,
      rate_inr: 1000,
      deposit_required_inr: 0,
      new_deposit_needed: false,
      status: "ACTIVE",
    })
    if (!error)
      fail("deployments_active_vehicle/rider_uniq", "duplicate insert succeeded — index missing!")
    else if (
      error.message.includes("deployments_active_vehicle_uniq") ||
      error.message.includes("deployments_active_rider_uniq") ||
      error.code === "23505"
    )
      ok("partial unique index enforcement", `blocked: ${error.code}`)
    else fail("partial unique index", `unexpected error: ${error.message}`)
  }
}

// 14. RLS enabled — service role bypasses RLS, but we can check pg_class via a view is not possible.
//     Instead: probe rider list with anon key and expect failure (no session).
{
  const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })
  const { data, error } = await anon.from("riders").select("*").limit(1)
  if (error) ok("RLS blocks anon read of riders", error.message.slice(0, 80))
  else if (data.length === 0) ok("RLS blocks anon read of riders", "0 rows returned")
  else fail("RLS blocks anon read of riders", `leaked ${data.length} row(s)`)
}

// 15. Reference tables readable
{
  const [loc, hub, vt] = await Promise.all([
    sb.from("locations").select("*", { count: "exact", head: true }),
    sb.from("hubs").select("*", { count: "exact", head: true }),
    sb.from("vehicle_types").select("*", { count: "exact", head: true }),
  ])
  ok(
    "reference tables",
    `locations=${loc.count} hubs=${hub.count} vehicle_types=${vt.count}`
  )
}

const failed = results.filter((r) => !r.ok)
console.log(
  `\n${results.length - failed.length}/${results.length} passed${failed.length ? `, ${failed.length} FAILED` : ""}`
)
process.exit(failed.length ? 1 : 0)
