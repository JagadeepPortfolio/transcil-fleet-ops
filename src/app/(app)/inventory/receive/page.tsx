import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"

import { getCurrentUserContext, INVENTORY_MANAGER_ROLES } from "@/lib/auth/role"
import { listPartNames, logPartMovement } from "@/lib/db/spare-parts"
import { getDefaultHubId } from "@/lib/db/hubs"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { FormError } from "@/components/ui/form-fields"
import { BatchPartEntry } from "../_components/batch-part-entry"

export const metadata = { title: "Received from factory · Inventory · Transcil Fleet Ops" }

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
const label = "block text-xs font-medium text-muted-foreground mb-1"

function istToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
}

async function recordReceipts(formData: FormData) {
  "use server"
  const ctx = await getCurrentUserContext()
  if (!ctx || !ctx.role || !INVENTORY_MANAGER_ROLES.includes(ctx.role)) redirect("/inventory")
  const hubId = ctx.hubId ?? (await getDefaultHubId())
  if (hubId == null) redirect(`/inventory/receive?error=${encodeURIComponent("No hub configured")}`)

  const names = formData.getAll("name").map((v) => String(v).trim())
  const qtys = formData.getAll("qty").map((v) => String(v).trim())
  const partnos = formData.getAll("partno").map((v) => String(v).trim())
  const rawDate = String(formData.get("received_date") ?? "")
  const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : istToday()

  // Build non-empty rows.
  const rows = names
    .map((name, i) => ({ name, qty: qtys[i] ?? "", partno: partnos[i] ?? "" }))
    .filter((r) => r.name.length > 0)
  if (rows.length === 0) redirect(`/inventory/receive?error=${encodeURIComponent("Add at least one part")}`)

  // Existing-parts-only: validate names against the catalog.
  const catalog = await listPartNames()
  const byName = new Map(catalog.map((p) => [p.name.toLowerCase(), p.id]))

  const unknown: string[] = []
  const parsed: { id: string; qty: number; partno: string }[] = []
  for (const r of rows) {
    const id = byName.get(r.name.toLowerCase())
    if (!id) {
      unknown.push(r.name)
      continue
    }
    const qty = Number(r.qty)
    if (!Number.isInteger(qty) || qty < 1) {
      redirect(`/inventory/receive?error=${encodeURIComponent(`Quantity for "${r.name}" must be a whole number ≥ 1`)}`)
    }
    parsed.push({ id, qty, partno: r.partno })
  }
  if (unknown.length > 0) {
    redirect(
      `/inventory/receive?error=${encodeURIComponent(
        `Not in catalog (add via "New part" first): ${unknown.join(", ")}`
      )}`
    )
  }

  const supabase = createClient()
  try {
    for (const p of parsed) {
      await logPartMovement({
        hubId,
        partId: p.id,
        type: "RECEIVED",
        quantityDelta: p.qty,
        reason: "Received from factory",
        eventDate,
      })
      // Set the catalog part number if one was supplied and none is on file yet.
      if (p.partno) {
        await supabase
          .from("spare_parts")
          .update({ part_number: p.partno })
          .eq("id", p.id)
          .is("part_number", null)
      }
    }
  } catch (e) {
    redirect(`/inventory/receive?error=${encodeURIComponent((e as Error).message)}`)
  }

  revalidatePath("/inventory")
  redirect("/inventory")
}

export default async function ReceivePage({ searchParams }: { searchParams: { error?: string } }) {
  const ctx = await getCurrentUserContext()
  if (!ctx || !ctx.role || !INVENTORY_MANAGER_ROLES.includes(ctx.role)) redirect("/inventory")
  const parts = await listPartNames()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Received from factory" }]}
        title="Received from factory"
        description="Log parts received from Calon. Add a row per part."
        action={
          <Button variant="ghost" render={<Link href="/inventory" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />
      <FormError message={searchParams.error} />
      <Card>
        <form action={recordReceipts} className="space-y-5 p-6">
          <div className="w-48">
            <label className={label} htmlFor="received_date">Received date</label>
            <input id="received_date" name="received_date" type="date" defaultValue={istToday()} className={field} />
          </div>
          <BatchPartEntry partNames={parts.map((p) => p.name)} extra={{ name: "partno", label: "Part no. (opt)" }} />
          <div className="flex items-center justify-end gap-3 border-t pt-5">
            <Button variant="ghost" render={<Link href="/inventory" />}>Cancel</Button>
            <Button type="submit" size="lg">Save receipts</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
