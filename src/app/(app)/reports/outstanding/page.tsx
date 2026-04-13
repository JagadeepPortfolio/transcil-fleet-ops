import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { getOutstandingBalances, type AgeingBucket } from "@/lib/db/reports"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { ActionBadge, PayStatusBadge } from "@/components/ui/badge"
import { OutstandingDonut } from "@/components/charts/outstanding-donut"
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
  title: "Outstanding Balances · Reports · Transcil Fleet Ops",
}

const BUCKET_LABELS: Record<AgeingBucket, string> = {
  current: "Current (not overdue)",
  "1_7": "1–7 days overdue",
  "8_14": "8–14 days overdue",
  "15_30": "15–30 days overdue",
  "30_plus": "30+ days overdue",
}

const BUCKET_ORDER: AgeingBucket[] = [
  "30_plus",
  "15_30",
  "8_14",
  "1_7",
  "current",
]

const BUCKET_TONE: Record<AgeingBucket, string> = {
  "30_plus": "border-destructive/30 bg-destructive/5",
  "15_30": "border-destructive/20 bg-destructive/3",
  "8_14": "border-warning/30 bg-warning/5",
  "1_7": "border-warning/20 bg-warning/3",
  current: "",
}

const BUCKET_COLORS: Record<AgeingBucket, string> = {
  "30_plus": "#ef4444",
  "15_30": "#f97316",
  "8_14": "#eab308",
  "1_7": "#a3a3a3",
  current: "#3b82f6",
}

export default async function OutstandingPage() {
  const rows = await getOutstandingBalances()

  const inr = (v: number | null | undefined) =>
    v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—"

  // Group by bucket
  const buckets = BUCKET_ORDER.map((key) => ({
    key,
    label: BUCKET_LABELS[key],
    rows: rows.filter((r) => r.bucket === key),
    total: rows
      .filter((r) => r.bucket === key)
      .reduce((s, r) => s + (r.balance ?? 0), 0),
  })).filter((b) => b.rows.length > 0)

  const grandTotal = rows.reduce((s, r) => s + (r.balance ?? 0), 0)

  const donutData = BUCKET_ORDER.map((key) => ({
    name: BUCKET_LABELS[key],
    value: rows
      .filter((r) => r.bucket === key)
      .reduce((s, r) => s + (r.balance ?? 0), 0),
    color: BUCKET_COLORS[key],
  }))

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Outstanding Balances" },
        ]}
        title="Outstanding Balances"
        description="Active deployments with unpaid balances, grouped by how overdue they are."
        action={
          <Button variant="ghost" render={<Link href="/reports" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      {/* Summary cards + donut chart */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-4">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Total outstanding
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-destructive">
              {inr(grandTotal)}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {rows.length} deployments
            </div>
          </Card>
          {BUCKET_ORDER.filter((b) => rows.some((r) => r.bucket === b)).map(
            (b) => {
              const count = rows.filter((r) => r.bucket === b).length
              const total = rows
                .filter((r) => r.bucket === b)
                .reduce((s, r) => s + (r.balance ?? 0), 0)
              return (
                <Card key={b} className={`p-4 ${BUCKET_TONE[b]}`}>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {BUCKET_LABELS[b]}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {inr(total)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {count} deployment{count !== 1 ? "s" : ""}
                  </div>
                </Card>
              )
            }
          )}
        </div>
        <Card className="p-4">
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">
            Distribution by ageing
          </h3>
          <OutstandingDonut buckets={donutData} />
        </Card>
      </div>

      {/* Detailed table per bucket */}
      {buckets.map((bucket) => (
        <div key={bucket.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{bucket.label}</h2>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {inr(bucket.total)}
            </span>
          </div>
          <TableContainer className="max-h-none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rider</TableHead>
                  <TableHead>VTD</TableHead>
                  <TableHead>Hub</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Pay</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bucket.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/deployments/${r.id}`}
                        className="font-medium hover:underline"
                      >
                        {r.rider_name ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.vtd_no ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.hub_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.due_date}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs tabular-nums ${
                          r.days_left != null && r.days_left < 0
                            ? "font-semibold text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {r.days_left != null ? `${r.days_left}d` : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={r.action} />
                    </TableCell>
                    <TableCell>
                      <PayStatusBadge status={r.pay_status} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold tabular-nums text-destructive">
                      {inr(r.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      ))}

      {rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No outstanding balances — all active deployments are fully paid.
        </Card>
      ) : null}
    </div>
  )
}
