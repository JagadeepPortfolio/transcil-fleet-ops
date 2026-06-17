import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, PackagePlus, Undo2 } from "lucide-react"

import { getCurrentUserContext, TECH_ROLES, INVENTORY_MANAGER_ROLES } from "@/lib/auth/role"
import { listStockForHub } from "@/lib/db/spare-parts"
import { getDefaultHubId } from "@/lib/db/hubs"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata = { title: "Inventory · Transcil Fleet Ops" }

export default async function InventoryPage() {
  const ctx = await getCurrentUserContext()
  if (!ctx || !ctx.role || !TECH_ROLES.includes(ctx.role)) redirect("/dashboard")
  const canManage = ctx.role ? INVENTORY_MANAGER_ROLES.includes(ctx.role) : false

  const hubId = ctx.hubId ?? (await getDefaultHubId())
  const stock = hubId != null ? await listStockForHub(hubId) : []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Spare-parts inventory"
        description="Per-hub stock. On-hand is driven by factory receipts and repair usage."
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button render={<Link href="/inventory/receive" />}>
                <PackagePlus /> Received from factory
              </Button>
              <Button variant="outline" render={<Link href="/inventory/return-to-factory" />}>
                <Undo2 /> Return to Factory
              </Button>
              <Button variant="ghost" render={<Link href="/inventory/new" />}>
                <Plus /> New part
              </Button>
            </div>
          ) : undefined
        }
      />

      <Card className="w-fit p-4">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Parts tracked</div>
        <div className="mt-1 text-lg font-semibold tabular-nums">{stock.length}</div>
      </Card>

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">On hand</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock.map((s) => (
              <TableRow key={s.stock_id}>
                <TableCell className="font-medium">
                  <Link href={`/inventory/${s.spare_part_id}`} className="hover:underline">
                    {s.part_name}
                  </Link>
                  <span className="ml-1 text-[10px] text-muted-foreground">({s.unit})</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.category_name ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{s.quantity_on_hand}</TableCell>
              </TableRow>
            ))}
            {stock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                  No parts yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}
