import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, PackagePlus, Undo2 } from "lucide-react"

import { getCurrentUserContext, TECH_ROLES, INVENTORY_MANAGER_ROLES } from "@/lib/auth/role"
import { listStockForHub } from "@/lib/db/spare-parts"
import { getDefaultHubId } from "@/lib/db/hubs"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
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

      <div className="flex flex-col gap-6 md:flex-row">
        {canManage ? (
          <div className="flex shrink-0 flex-col gap-2 md:w-56">
            <Button className="w-full justify-start" render={<Link href="/inventory/receive" />}>
              <PackagePlus /> Received from factory
            </Button>
            <Button variant="outline" className="w-full justify-start" render={<Link href="/inventory/return-to-factory" />}>
              <Undo2 /> Return to Factory
            </Button>
            <Button variant="ghost" className="w-full justify-start" render={<Link href="/inventory/new" />}>
              <Plus /> New part
            </Button>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <InventoryBrowser stock={stock} />
        </div>
      </div>
    </div>
  )
}
