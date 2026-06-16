import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"

import { getCurrentUserContext, TECH_ROLES } from "@/lib/auth/role"
import { getRepair, updateRepairStatus, updateRepairDetails, addRepairNote, addPartUsed } from "@/lib/db/repairs"
import { listStockForHub } from "@/lib/db/spare-parts"
import {
  REPAIR_STATUSES,
  repairStatusSchema,
  repairDetailsSchema,
  repairNoteSchema,
  partUsedSchema,
} from "@/lib/validation/repairs"
import { formatDateTime } from "@/lib/dates"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { FormError } from "@/components/ui/form-fields"
import { statusPill } from "../page"

export const metadata = { title: "Repair · Transcil Fleet Ops" }

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
const label = "block text-xs font-medium text-muted-foreground mb-1"

// Module-scope helpers — referenced (not closed-over) by the inline server
// actions, which only close over the serializable `id` string.
function fail(id: string, msg: string): never {
  redirect(`/repairs/${id}?error=${encodeURIComponent(msg)}`)
}
function finish(id: string): never {
  revalidatePath(`/repairs/${id}`)
  revalidatePath("/repairs")
  revalidatePath("/admin/vehicles")
  redirect(`/repairs/${id}`)
}
async function ensureTech(id: string) {
  const c = await getCurrentUserContext()
  if (!c?.role || !TECH_ROLES.includes(c.role)) fail(id, "Only technicians can do this")
}

export default async function RepairDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const ctx = await getCurrentUserContext()
  if (!ctx) redirect("/dashboard")
  const isTech = !!ctx.role && TECH_ROLES.includes(ctx.role)

  const data = await getRepair(params.id)
  if (!data) redirect("/repairs")
  const { repair, parts, events } = data
  const closed = repair.status === "COMPLETED" || repair.status === "CANCELLED"
  const stock = (await listStockForHub(repair.hub_id)).filter((s) => s.quantity_on_hand > 0)

  async function setStatus(formData: FormData) {
    "use server"
    await ensureTech(params.id)
    const p = repairStatusSchema.safeParse({ status: formData.get("status"), note: formData.get("note") || undefined })
    if (!p.success) fail(params.id, p.error.issues[0].message)
    try {
      await updateRepairStatus(params.id, p.data.status, p.data.note)
    } catch (e) {
      fail(params.id, (e as Error).message)
    }
    finish(params.id)
  }

  async function saveDetails(formData: FormData) {
    "use server"
    await ensureTech(params.id)
    const p = repairDetailsSchema.safeParse({
      diagnosis: formData.get("diagnosis") || undefined,
      cost_estimate: formData.get("cost_estimate") || undefined,
      cost_discount: formData.get("cost_discount") || undefined,
      repair_notes: formData.get("repair_notes") || undefined,
    })
    if (!p.success) fail(params.id, p.error.issues[0].message)
    try {
      await updateRepairDetails(params.id, p.data)
    } catch (e) {
      fail(params.id, (e as Error).message)
    }
    finish(params.id)
  }

  async function addPart(formData: FormData) {
    "use server"
    await ensureTech(params.id)
    const p = partUsedSchema.safeParse({
      spare_part_id: formData.get("spare_part_id"),
      quantity: formData.get("quantity"),
      notes: formData.get("notes") || undefined,
    })
    if (!p.success) fail(params.id, p.error.issues[0].message)
    try {
      await addPartUsed({ repairId: params.id, sparePartId: p.data.spare_part_id, quantity: p.data.quantity, notes: p.data.notes })
    } catch (e) {
      fail(params.id, (e as Error).message)
    }
    finish(params.id)
  }

  async function addNote(formData: FormData) {
    "use server"
    const c = await getCurrentUserContext()
    if (!c) fail(params.id, "Not allowed")
    const p = repairNoteSchema.safeParse({ note: formData.get("note") })
    if (!p.success) fail(params.id, p.error.issues[0].message)
    try {
      await addRepairNote(params.id, p.data.note)
    } catch (e) {
      fail(params.id, (e as Error).message)
    }
    finish(params.id)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Repairs", href: "/repairs" }, { label: repair.vehicles?.vtd_no ?? "Repair" }]}
        title={`Repair · ${repair.vehicles?.vtd_no ?? repair.vehicles?.vehicle_id ?? ""}`}
        description={repair.vehicles?.colour ?? undefined}
        action={
          <Button variant="ghost" render={<Link href="/repairs" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />
      <FormError message={searchParams.error} />

      <div className="flex items-center gap-3">
        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusPill(repair.status)}`}>
          {repair.status.replace("_", " ")}
        </span>
        {repair.deployment_id ? (
          <Link href={`/deployments/${repair.deployment_id}`} className="text-xs text-muted-foreground hover:underline">
            View originating deployment →
          </Link>
        ) : null}
      </div>

      <Card className="p-5">
        <h3 className="mb-1 text-sm font-semibold">Reported issue</h3>
        <p className="text-sm text-muted-foreground">{repair.issue_details || "No details recorded."}</p>
      </Card>

      {isTech && !closed ? (
        <>
          <Card>
            <form action={setStatus} className="flex flex-wrap items-end gap-3 p-5">
              <div className="min-w-[160px] flex-1">
                <label className={label} htmlFor="status">Update status</label>
                <select id="status" name="status" className={field} defaultValue={repair.status}>
                  {REPAIR_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[200px] flex-[2]">
                <label className={label} htmlFor="note">Note (optional)</label>
                <input id="note" name="note" className={field} />
              </div>
              <Button type="submit">Save status</Button>
            </form>
          </Card>

          <Card>
            <form action={saveDetails} className="space-y-4 p-5">
              <h3 className="text-sm font-semibold">Diagnosis &amp; estimate</h3>
              <div>
                <label className={label} htmlFor="diagnosis">Diagnosis</label>
                <textarea id="diagnosis" name="diagnosis" rows={2} className={field} defaultValue={repair.diagnosis ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label} htmlFor="cost_estimate">Repair cost estimate (₹)</label>
                  <input id="cost_estimate" name="cost_estimate" type="number" min={0} step="0.01" className={field} defaultValue={repair.cost_estimate ?? ""} />
                </div>
                <div>
                  <label className={label} htmlFor="cost_discount">Discount (₹)</label>
                  <input id="cost_discount" name="cost_discount" type="number" min={0} step="0.01" className={field} defaultValue={repair.cost_discount ?? ""} />
                </div>
              </div>
              <div>
                <label className={label} htmlFor="repair_notes">Repair notes</label>
                <textarea id="repair_notes" name="repair_notes" rows={2} className={field} defaultValue={repair.repair_notes ?? ""} />
              </div>
              <div className="flex justify-end border-t pt-4">
                <Button type="submit">Save details</Button>
              </div>
            </form>
          </Card>

          <Card>
            <form action={addPart} className="flex flex-wrap items-end gap-3 p-5">
              <div className="min-w-[200px] flex-[2]">
                <label className={label} htmlFor="spare_part_id">Record part used</label>
                <select id="spare_part_id" name="spare_part_id" className={field} required defaultValue="">
                  <option value="" disabled>Select a part in stock…</option>
                  {stock.map((s) => (
                    <option key={s.spare_part_id} value={s.spare_part_id}>
                      {s.part_name} ({s.quantity_on_hand} in stock)
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className={label} htmlFor="quantity">Qty</label>
                <input id="quantity" name="quantity" type="number" min={1} defaultValue={1} className={field} />
              </div>
              <Button type="submit">Add part</Button>
            </form>
            {stock.length === 0 ? (
              <p className="px-5 pb-4 text-[11px] text-muted-foreground">No parts in stock at this hub.</p>
            ) : null}
          </Card>
        </>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Parts used</h3>
        <Card className="divide-y">
          {parts.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">None recorded.</div>
          ) : (
            parts.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 text-sm">
                <span>
                  {p.spare_parts?.name ?? "—"}
                  {p.notes ? <span className="text-muted-foreground"> · {p.notes}</span> : null}
                </span>
                <span className="font-mono tabular-nums">×{p.quantity}</span>
              </div>
            ))
          )}
        </Card>
      </div>

      {!closed ? (
        <Card>
          <form action={addNote} className="flex items-end gap-3 p-5">
            <div className="flex-1">
              <label className={label} htmlFor="notebody">Add a note</label>
              <input id="notebody" name="note" className={field} placeholder="Update for the team…" />
            </div>
            <Button type="submit" variant="outline">Post</Button>
          </form>
        </Card>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Timeline</h3>
        <Card className="divide-y">
          {events.map((e) => (
            <div key={e.id} className="p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {e.event_type === "STATUS_CHANGE" || e.event_type === "COMPLETED"
                    ? `${e.from_status?.replace("_", " ") ?? "—"} → ${e.to_status?.replace("_", " ") ?? "—"}`
                    : e.event_type.replace("_", " ")}
                </span>
                <span className="text-[11px] text-muted-foreground">{formatDateTime(e.created_at)}</span>
              </div>
              {e.note ? <div className="text-muted-foreground">{e.note}</div> : null}
              <div className="text-[11px] text-muted-foreground">{e.created_by_name ?? "—"}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
