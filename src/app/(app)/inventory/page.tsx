import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, PackagePlus, Undo2 } from "lucide-react"

import { getCurrentUserContext, TECH_ROLES, INVENTORY_MANAGER_ROLES } from "@/lib/auth/role"
import { listStockForHub } from "@/lib/db/spare-parts"
import { getDefaultHubId } from "@/lib/db/hubs"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { InventoryBrowser } from "./_components/inventory-browser"

export const metadata = { title: "Inventory · Transcil Fleet Ops" }

export default async function InventoryPage() {
  const ctx = await getCurrentUserContext()
  if (!ctx || !ctx.role || !TECH_ROLES.includes(ctx.role)) redirect("/dashboard")
  const canManage = ctx.role ? INVENTORY_MANAGER_ROLES.includes(ctx.role) : false

  const hubId = ctx.hubId ?? (await getDefaultHubId())
  const stock = hubId != null ? await listStockForHub(hubId) : []

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Spare-parts inventory"
        description="Per-hub stock. On-hand is driven by factory receipts and repair usage."
      />

      <div className={`flex flex-col gap-6 ${canManage ? "lg:flex-row" : ""}`}>
        {/* Left sidebar — Quick actions (sticky, desktop only), matching deployments */}
        {canManage ? (
          <aside className="shrink-0 lg:w-56">
            <div className="lg:sticky lg:top-6">
              <Card className="space-y-3 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quick actions
                </div>
                <Button variant="ghost" className="w-full justify-start" render={<Link href="/inventory/receive" />}>
                  <PackagePlus /> Received from factory
                </Button>
                <Button variant="ghost" className="w-full justify-start" render={<Link href="/inventory/return-to-factory" />}>
                  <Undo2 /> Return to Factory
                </Button>
                <Button variant="ghost" className="w-full justify-start" render={<Link href="/inventory/new" />}>
                  <Plus /> New part
                </Button>
              </Card>
            </div>
          </aside>
        ) : null}

        <div className="min-w-0 flex-1">
          <InventoryBrowser stock={stock} />
        </div>
      </div>
    </div>
  )
}
