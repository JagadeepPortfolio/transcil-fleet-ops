import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { getCurrentUserContext, TECH_ROLES } from "@/lib/auth/role"
import { getPartWithStock, listFactoryReturnsForPart } from "@/lib/db/spare-parts"
import { getDefaultHubId } from "@/lib/db/hubs"
import { formatDate } from "@/lib/dates"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"

export const metadata = { title: "Part · Inventory · Transcil Fleet Ops" }

export default async function PartDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getCurrentUserContext()
  if (!ctx || !ctx.role || !TECH_ROLES.includes(ctx.role)) redirect("/dashboard")
  const hubId = ctx.hubId ?? (await getDefaultHubId())
  if (hubId == null) redirect("/inventory")

  const data = await getPartWithStock(params.id, hubId)
  if (!data) redirect("/inventory")
  const { part, stock, movements } = data
  const returns = await listFactoryReturnsForPart(params.id, hubId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: part.name }]}
        title={part.name}
        description={`${part.category_name ?? "Uncategorised"} · per ${part.unit}${part.part_number ? ` · ${part.part_number}` : ""}`}
        action={
          <Button variant="ghost" render={<Link href="/inventory" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <Card className="w-fit p-4">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">On hand</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{stock?.quantity_on_hand ?? 0}</div>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Stock movements</h3>
        <Card className="divide-y">
          {movements.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No movements yet.</div>
          ) : (
            movements.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <span className="font-medium">
                    {m.movement_type === "RECEIVED" ? "Received" : m.movement_type === "USED" ? "Used in repair" : "Adjustment"}
                  </span>
                  {m.reason && m.movement_type !== "USED" ? (
                    <span className="text-muted-foreground"> · {m.reason}</span>
                  ) : null}
                  {m.ec_no ? (
                    <span className="text-muted-foreground">
                      {" "}· EC {m.ec_no}{m.vtd_no ? ` (VTD ${m.vtd_no})` : ""}
                    </span>
                  ) : null}
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

      <div>
        <h3 className="mb-2 text-sm font-semibold">Returned to factory</h3>
        <Card className="divide-y">
          {returns.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">None recorded.</div>
          ) : (
            returns.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <span className="font-medium">Returned to factory</span>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDate(r.event_date)} · {r.created_by_name ?? "—"}
                  </div>
                </div>
                <span className="font-mono tabular-nums text-muted-foreground">{r.quantity}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
