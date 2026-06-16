// One-off cleanup for a test deployment. Soft-deletes the deployment, its
// activity_log rows, and (if not used by any other deployment) the rider —
// which frees the vehicle (availability = no ACTIVE, non-deleted deployment).
//
// Usage:
//   node scripts/cleanup-test-deployment.mjs DEP-2026-8            # dry run
//   node scripts/cleanup-test-deployment.mjs DEP-2026-8 --apply    # soft delete
//   node scripts/cleanup-test-deployment.mjs DEP-2026-8 --hard     # PERMANENT
//
// --apply sets deleted_at (reversible). --hard runs a real DELETE that cannot be
// recovered: removing the deployment CASCADE-deletes its activity_log rows, then
// the rider is deleted (kept if used by another deployment). Reads the
// service-role key from .env.local at runtime (never logged).
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

const code = process.argv[2]
const hard = process.argv.includes("--hard")
const apply = process.argv.includes("--apply") || hard
if (!code) {
  console.error("Usage: node scripts/cleanup-test-deployment.mjs <DEPLOYMENT_CODE> [--apply]")
  process.exit(1)
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const nowIso = new Date().toISOString()

// 1) Find the deployment.
const { data: dep, error: depErr } = await sb
  .from("deployments")
  .select("id, deployment_code, status, deleted_at, rider_id, vehicle_id")
  .eq("deployment_code", code)
  .maybeSingle()
if (depErr) throw depErr
if (!dep) {
  console.error(`No deployment with code ${code}`)
  process.exit(1)
}

// Resolve rider + vehicle labels for the report.
const [{ data: rider }, { data: vehicle }, { count: actCount }, { count: riderOtherDeps }] =
  await Promise.all([
    sb.from("riders").select("id, name, phone, deleted_at").eq("id", dep.rider_id).maybeSingle(),
    sb.from("vehicles").select("id, vtd_no, deleted_at").eq("id", dep.vehicle_id).maybeSingle(),
    sb.from("activity_log").select("id", { count: "exact", head: true })
      .eq("deployment_id", dep.id).is("deleted_at", null),
    sb.from("deployments").select("id", { count: "exact", head: true })
      .eq("rider_id", dep.rider_id).neq("id", dep.id).is("deleted_at", null),
  ])

const riderShared = (riderOtherDeps ?? 0) > 0

console.log(`\n=== ${hard ? "HARD DELETE (PERMANENT)" : apply ? "APPLYING soft delete" : "DRY RUN"} cleanup for ${code} ===`)
console.log(`Deployment : ${dep.deployment_code} (${dep.id}) status=${dep.status} deleted_at=${dep.deleted_at ?? "—"}`)
console.log(`Rider      : ${rider?.name ?? "?"} / ${rider?.phone ?? "?"} (${dep.rider_id})`)
console.log(`Vehicle    : ${vehicle?.vtd_no ?? "?"} (${dep.vehicle_id}) — will become AVAILABLE`)
console.log(`Activity   : ${actCount ?? 0} log row(s) to soft-delete`)
console.log(`Rider used by other active deployments? ${riderShared ? "YES — rider will be KEPT" : "no — rider will be soft-deleted"}`)

if (!apply) {
  console.log(`\nDry run only. Re-run with --apply (soft) or --hard (permanent).\n`)
  process.exit(0)
}

if (hard) {
  // PERMANENT. Deleting the deployment CASCADE-removes its activity_log rows
  // (FK ON DELETE CASCADE). Then delete the rider unless shared. Vehicle kept.
  {
    const { error } = await sb.from("deployments").delete().eq("id", dep.id)
    if (error) throw error
    console.log(`  ✓ deployment DELETED (activity_log cascaded; vehicle available)`)
  }
  if (!riderShared) {
    const { error } = await sb.from("riders").delete().eq("id", dep.rider_id)
    if (error) throw error
    console.log(`  ✓ rider DELETED`)
  } else {
    console.log(`  • rider kept (in use elsewhere)`)
  }
  console.log(`\nDone — permanent, not recoverable.\n`)
  process.exit(0)
}

// 2) Soft-delete activity_log rows.
{
  const { error } = await sb.from("activity_log").update({ deleted_at: nowIso })
    .eq("deployment_id", dep.id).is("deleted_at", null)
  if (error) throw error
  console.log(`  ✓ activity_log soft-deleted`)
}

// 3) Soft-delete the deployment (also flip status off ACTIVE for clarity).
{
  const { error } = await sb.from("deployments")
    .update({ deleted_at: nowIso, status: "CANCELLED" }).eq("id", dep.id)
  if (error) throw error
  console.log(`  ✓ deployment soft-deleted (vehicle now available)`)
}

// 4) Soft-delete the rider unless shared.
if (!riderShared) {
  const { error } = await sb.from("riders").update({ deleted_at: nowIso }).eq("id", dep.rider_id)
  if (error) throw error
  console.log(`  ✓ rider soft-deleted`)
} else {
  console.log(`  • rider kept (in use elsewhere)`)
}

console.log(`\nDone.\n`)
