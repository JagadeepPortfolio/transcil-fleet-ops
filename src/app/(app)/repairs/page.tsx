import Link from "next/link"
import { redirect } from "next/navigation"

import { getCurrentUserContext } from "@/lib/auth/role"
import { listRepairs } from "@/lib/db/repairs"
import type { RepairStatus } from "@/lib/validation/repairs"
import { formatDate } from "@/lib/dates"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata = { title: "Repairs · Transcil Fleet Ops" }

export function statusPill(status: RepairStatus): string {
  const map: Record<RepairStatus, string> = {
    REPORTED: "bg-muted text-muted-foreground",
    INVESTIGATING: "bg-info/10 text-info",
    IN_REPAIR: "bg-warning/15 text-warning-foreground",
    AWAITING_PARTS: "bg-destructive/10 text-destructive",
    IN_FACTORY: "bg-info/10 text-info",
    COMPLETED: "bg-success/15 text-success-foreground",
    CANCELLED: "bg-muted text-muted-foreground line-through",
  }
  return map[status]
}

export default async function RepairsPage() {
  const ctx = await getCurrentUserContext()
  if (!ctx) redirect("/dashboard")
  const repairs = await listRepairs()
  const open = repairs.filter((r) => r.status !== "COMPLETED" && r.status !== "CANCELLED")

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Repairs"
        description={`${open.length} open · ${repairs.length} total`}
      />

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle (VTD)</TableHead>
              <TableHead>EC No</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead>Reported from</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repairs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <Link href={`/repairs/${r.id}`} className="hover:underline">
                    {r.vtd_no ?? "—"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.ec_no ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.business_type ?? "—"}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {r.issue_details ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(r.reported_at)}</TableCell>
                <TableCell>
                  {r.deployment_code ? (
                    <Link
                      href={`/deployments/${r.deployment_id}`}
                      className="font-mono text-xs hover:underline"
                    >
                      {r.deployment_code}
                    </Link>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${statusPill(r.status)}`}>
                    {r.status.replace("_", " ")}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {repairs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No repairs yet. A repair ticket is created automatically when a vehicle is
                  returned with reason &ldquo;Vehicle issue&rdquo;.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}
