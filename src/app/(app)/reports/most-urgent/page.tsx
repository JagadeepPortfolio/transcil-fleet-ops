import Link from "next/link"
import { ArrowLeft, Download } from "lucide-react"

import { getMostUrgent } from "@/lib/db/reports"
import { formatDate } from "@/lib/dates"
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

export const metadata = {
  title: "Most Urgent · Reports · Transcil Fleet Ops",
}

export default async function MostUrgentPage() {
  const rows = await getMostUrgent()

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Most Urgent" }]}
        title="Most Urgent"
        description="Active deployments due today or past due — call these riders first."
        action={
          <Button variant="ghost" render={<Link href="/reports" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{rows.length}</span> rider
          {rows.length === 1 ? "" : "s"} due today or overdue to follow up.
        </div>
        <Button render={<Link href="/reports/most-urgent/export" prefetch={false} />}>
          <Download /> Download Excel (CSV)
        </Button>
      </Card>

      <Card className="overflow-hidden p-0">
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rider Name</TableHead>
                <TableHead>VTD / EC No</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Days left</TableHead>
                <TableHead>Customer Mobile No</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-xs text-muted-foreground"
                  >
                    No overdue deployments right now.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/deployments/${r.id}`} className="hover:underline">
                        {r.rider_name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.vtd ?? "—"} / {r.ec_no ?? "—"}
                    </TableCell>
                    <TableCell>{formatDate(r.due_date)}</TableCell>
                    <TableCell
                      className={`text-right font-semibold tabular-nums ${
                        (r.days_left ?? 0) < 0 ? "text-destructive" : "text-warning-foreground"
                      }`}
                    >
                      {r.days_left ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono">{r.phone ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </div>
  )
}
