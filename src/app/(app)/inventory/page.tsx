import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, AlertTriangle } from "lucide-react"

import { getCurrentUserContext, TECH_ROLES, INVENTORY_MANAGER_ROLES } from "@/lib/auth/role"
import { listStockForHub } from "@/lib/db/spare-parts"
import { resolveHubId } from "@/lib/db/hubs"
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

  const hubId = ctx.hubId ?? (await resolveHubId("NAG"))
  const stock = hubId != null ? await listStockForHub(hubId) : []
  const lowCount = stock.filter((s) => s.low).length

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Spare-parts inventory"
        description="Per-hub stock. Low-stock rows are flagged."
        action={
          canManage ? (
            <Button render={<Link href="/inventory/new" />}>
              <Plus /> Add part
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-4 text-sm">
        <Card className="flex-1 p-4">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Parts tracked</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{stock.length}</div>
        </Card>
        <Card className="flex-1 p-4">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Low / out of stock</div>
          <div className={`mt-1 text-lg font-semibold tabular-nums ${lowCount > 0 ? "text-destructive" : ""}`}>
            {lowCount}
          </div>
        </Card>
      </div>

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">Reorder at</TableHead>
              <TableHead className="text-right">Status</TableHead>
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
                <TableCell className="text-right tabular-nums text-muted-foreground">{s.reorder_level}</TableCell>
                <TableCell className="text-right">
                  {s.low ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                      <AlertTriangle className="size-3" /> Low
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">OK</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {stock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No parts yet. {canManage ? "Add your first part to get started." : ""}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}
