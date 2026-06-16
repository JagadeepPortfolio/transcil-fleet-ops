import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { ArrowLeft } from "lucide-react"

import { getCurrentUserContext, TECH_ROLES, INVENTORY_MANAGER_ROLES } from "@/lib/auth/role"
import { getPartWithStock, setStockLevels } from "@/lib/db/spare-parts"
import { getDefaultHubId } from "@/lib/db/hubs"
import { stockAdjustSchema } from "@/lib/validation/repairs"
import { formatDate } from "@/lib/dates"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { FormError } from "@/components/ui/form-fields"

export const metadata = { title: "Part · Inventory · Transcil Fleet Ops" }

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
const label = "block text-xs font-medium text-muted-foreground mb-1"

export default async function PartDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { error?: string }
}) {
  const ctx = await getCurrentUserContext()
  if (!ctx || !ctx.role || !TECH_ROLES.includes(ctx.role)) redirect("/dashboard")
  const canManage = INVENTORY_MANAGER_ROLES.includes(ctx.role)
  const hubId = ctx.hubId ?? (await getDefaultHubId())
  if (hubId == null) redirect("/inventory")

  const data = await getPartWithStock(params.id, hubId)
  if (!data) redirect("/inventory")
  const { part, stock, movements } = data

  async function saveStock(formData: FormData) {
    "use server"
    const c = await getCurrentUserContext()
    if (!c || !c.role || !INVENTORY_MANAGER_ROLES.includes(c.role)) redirect(`/inventory/${params.id}`)
    const hid = c.hubId ?? (await getDefaultHubId())
    if (hid == null) redirect(`/inventory/${params.id}`)
    const parsed = stockAdjustSchema.safeParse({
      on_hand: formData.get("on_hand"),
      reorder_level: formData.get("reorder_level"),
      reason: formData.get("reason") || undefined,
    })
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ")
      redirect(`/inventory/${params.id}?error=${encodeURIComponent(msg)}`)
    }
    try {
      await setStockLevels({
        hubId: hid,
        partId: params.id,
        onHand: parsed.data.on_hand,
        reorderLevel: parsed.data.reorder_level,
        reason: parsed.data.reason,
      })
    } catch (e) {
      redirect(`/inventory/${params.id}?error=${encodeURIComponent((e as Error).message)}`)
    }
    revalidatePath(`/inventory/${params.id}`)
    revalidatePath("/inventory")
    redirect("/inventory")
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: part.name }]}
        title={part.name}
        description={`${part.category_name ?? "Uncategorised"} · per ${part.unit}`}
        action={
          <Button variant="ghost" render={<Link href="/inventory" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />
      <FormError message={searchParams.error} />

      <div className="flex gap-4">
        <Card className="flex-1 p-4">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">On hand</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{stock?.quantity_on_hand ?? 0}</div>
        </Card>
        <Card className="flex-1 p-4">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Reorder at</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-muted-foreground">{stock?.reorder_level ?? 0}</div>
        </Card>
      </div>

      {canManage ? (
        <Card>
          <form action={saveStock} className="space-y-4 p-6">
            <h3 className="text-sm font-semibold">Stock-take / correction</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="on_hand">Counted on hand</label>
                <input id="on_hand" name="on_hand" type="number" min={0} defaultValue={stock?.quantity_on_hand ?? 0} className={field} />
              </div>
              <div>
                <label className={label} htmlFor="reorder_level">Reorder at</label>
                <input id="reorder_level" name="reorder_level" type="number" min={0} defaultValue={stock?.reorder_level ?? 0} className={field} />
              </div>
            </div>
            <div>
              <label className={label} htmlFor="reason">Reason (optional)</label>
              <input id="reason" name="reason" className={field} placeholder="e.g. Monthly stock-take" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              The difference vs current on-hand is logged as an adjustment in the movement ledger.
            </p>
            <div className="flex justify-end border-t pt-4">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Recent movements</h3>
        <Card className="divide-y">
          {movements.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No movements yet.</div>
          ) : (
            movements.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <span className="font-medium">{m.movement_type}</span>
                  {m.reason ? <span className="text-muted-foreground"> · {m.reason}</span> : null}
                  <div className="text-[11px] text-muted-foreground">
                    {formatDate(m.event_date)} · {m.created_by_name ?? "—"}
                  </div>
                </div>
                <span className={`font-mono tabular-nums ${m.quantity_delta < 0 ? "text-destructive" : "text-foreground"}`}>
                  {m.quantity_delta > 0 ? "+" : ""}{m.quantity_delta}
                </span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
