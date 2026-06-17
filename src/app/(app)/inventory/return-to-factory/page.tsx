import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"

import { getCurrentUserContext, INVENTORY_MANAGER_ROLES } from "@/lib/auth/role"
import { listPartNames } from "@/lib/db/spare-parts"
import { getDefaultHubId } from "@/lib/db/hubs"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { FormError } from "@/components/ui/form-fields"
import { BatchPartEntry } from "../_components/batch-part-entry"

export const metadata = { title: "Return to Factory · Inventory · Transcil Fleet Ops" }

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
const label = "block text-xs font-medium text-muted-foreground mb-1"

function istToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
}

async function recordReturns(formData: FormData) {
  "use server"
  const ctx = await getCurrentUserContext()
  if (!ctx || !ctx.role || !INVENTORY_MANAGER_ROLES.includes(ctx.role)) redirect("/inventory")
  const hubId = ctx.hubId ?? (await getDefaultHubId())
  if (hubId == null) redirect(`/inventory/return-to-factory?error=${encodeURIComponent("No hub configured")}`)

  const names = formData.getAll("name").map((v) => String(v).trim())
  const qtys = formData.getAll("qty").map((v) => String(v).trim())
  const rawDate = String(formData.get("event_date") ?? "")
  const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : istToday()

  const rows = names
    .map((name, i) => ({ name, qty: qtys[i] ?? "" }))
    .filter((r) => r.name.length > 0)
  if (rows.length === 0) redirect(`/inventory/return-to-factory?error=${encodeURIComponent("Add at least one part")}`)

  const catalog = await listPartNames()
  const byName = new Map(catalog.map((p) => [p.name.toLowerCase(), p.id]))

  const unknown: string[] = []
  const parsed: { id: string; qty: number }[] = []
  for (const r of rows) {
    const id = byName.get(r.name.toLowerCase())
    if (!id) {
      unknown.push(r.name)
      continue
    }
    const qty = Number(r.qty)
    if (!Number.isInteger(qty) || qty < 1) {
      redirect(`/inventory/return-to-factory?error=${encodeURIComponent(`Quantity for "${r.name}" must be a whole number ≥ 1`)}`)
    }
    parsed.push({ id, qty })
  }
  if (unknown.length > 0) {
    redirect(
      `/inventory/return-to-factory?error=${encodeURIComponent(`Not in catalog: ${unknown.join(", ")}`)}`
    )
  }

  const supabase = createClient()
  const { error } = await supabase.from("factory_returns").insert(
    parsed.map((p) => ({
      hub_id: hubId,
      spare_part_id: p.id,
      quantity: p.qty,
      event_date: eventDate,
      reason: "Returned to factory",
    }))
  )
  if (error) redirect(`/inventory/return-to-factory?error=${encodeURIComponent(error.message)}`)

  revalidatePath("/inventory")
  redirect("/inventory")
}

export default async function ReturnToFactoryPage({ searchParams }: { searchParams: { error?: string } }) {
  const ctx = await getCurrentUserContext()
  if (!ctx || !ctx.role || !INVENTORY_MANAGER_ROLES.includes(ctx.role)) redirect("/inventory")
  const parts = await listPartNames()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Return to Factory" }]}
        title="Return to Factory"
        description="Log defective / returned parts sent back to Calon. This does not change on-hand stock."
        action={
          <Button variant="ghost" render={<Link href="/inventory" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />
      <FormError message={searchParams.error} />
      <Card>
        <form action={recordReturns} className="space-y-5 p-6">
          <div className="w-48">
            <label className={label} htmlFor="event_date">Return date</label>
            <input id="event_date" name="event_date" type="date" defaultValue={istToday()} className={field} />
          </div>
          <BatchPartEntry partNames={parts.map((p) => p.name)} />
          <div className="flex items-center justify-end gap-3 border-t pt-5">
            <Button variant="ghost" render={<Link href="/inventory" />}>Cancel</Button>
            <Button type="submit" size="lg">Save returns</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
