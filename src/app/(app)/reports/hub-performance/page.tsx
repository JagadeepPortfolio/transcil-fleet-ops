import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { getHubPerformance } from "@/lib/db/reports"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { MonthPicker } from "../monthly-summary/month-picker"
import { HubComparisonChart } from "@/components/charts/hub-comparison-chart"
import { HubOverdueChart } from "@/components/charts/hub-overdue-chart"
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
  title: "Hub Performance · Reports · Transcil Fleet Ops",
}

export default async function HubPerformancePage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string }
}) {
  const now = new Date()
  const year = searchParams.year ? Number(searchParams.year) : now.getFullYear()
  const month = searchParams.month
    ? Number(searchParams.month)
    : now.getMonth() + 1

  const hubs = await getHubPerformance(year, month)

  const monthLabel = new Date(year, month - 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  })

  const inr = (v: number) => `₹${v.toLocaleString("en-IN")}`

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Hub Performance" },
        ]}
        title="Hub Performance"
        description={`Comparing hubs for ${monthLabel}`}
        action={
          <Button variant="ghost" render={<Link href="/reports" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <MonthPicker year={year} month={month} />

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            Collection & Utilization rates
          </h3>
          <HubComparisonChart
            hubs={hubs.map((h) => ({
              name: h.hubName,
              collectionPct: h.collectionPct,
              utilizationPct: h.utilizationPct,
              overdueCount: h.overdueCount,
            }))}
          />
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            Active vs Overdue deployments
          </h3>
          <HubOverdueChart
            hubs={hubs.map((h) => ({
              name: h.hubName,
              active: h.activeDeployments - h.overdueCount,
              overdue: h.overdueCount,
            }))}
          />
        </Card>
      </div>

      {/* Hub summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hubs.map((hub) => (
          <Card key={hub.hubId} className="p-4">
            <h3 className="text-sm font-semibold">{hub.hubName}</h3>
            <div className="mt-2 grid grid-cols-2 gap-y-2 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Active
                </div>
                <div className="text-base font-semibold tabular-nums">
                  {hub.activeDeployments}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Overdue
                </div>
                <div
                  className={`text-base font-semibold tabular-nums ${
                    hub.overdueCount > 0 ? "text-destructive" : ""
                  }`}
                >
                  {hub.overdueCount}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Collected
                </div>
                <div className="text-base font-semibold tabular-nums">
                  {inr(hub.totalCollected)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Collection %
                </div>
                <div className="text-base font-semibold tabular-nums">
                  {hub.collectionPct}%
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Detailed comparison table */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Detailed comparison</h2>
        <TableContainer className="max-h-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hub</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead className="text-right">Total Due</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Collection %</TableHead>
                <TableHead className="text-right">Utilization %</TableHead>
                <TableHead className="text-right">Avg Days Left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hubs.map((hub) => (
                <TableRow key={hub.hubId}>
                  <TableCell className="font-medium">{hub.hubName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {hub.activeDeployments}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      hub.overdueCount > 0 ? "font-semibold text-destructive" : ""
                    }`}
                  >
                    {hub.overdueCount}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {inr(hub.totalDue)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {inr(hub.totalCollected)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${
                      hub.collectionPct < 50 && hub.activeDeployments > 0
                        ? "font-semibold text-destructive"
                        : ""
                    }`}
                  >
                    {hub.collectionPct}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {hub.utilizationPct}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {hub.avgDaysLeft != null ? `${hub.avgDaysLeft}d` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      {hubs.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No hubs found. Add hubs via the Supabase dashboard to see performance data.
        </Card>
      ) : null}
    </div>
  )
}
