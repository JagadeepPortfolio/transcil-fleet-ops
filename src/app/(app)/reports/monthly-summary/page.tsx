import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { getMonthlySummary } from "@/lib/db/reports"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { MonthPicker } from "./month-picker"
import { RevenueBarChart } from "@/components/charts/revenue-bar-chart"
import { UtilizationDonut } from "@/components/charts/utilization-donut"
import { DeploymentFlowChart } from "@/components/charts/deployment-flow-chart"

export const metadata = {
  title: "Monthly Summary · Reports · Transcil Fleet Ops",
}

export default async function MonthlySummaryPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string }
}) {
  const now = new Date()
  const year = searchParams.year ? Number(searchParams.year) : now.getFullYear()
  const month = searchParams.month ? Number(searchParams.month) : now.getMonth() + 1

  const summary = await getMonthlySummary(year, month)

  const monthLabel = new Date(year, month - 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  })

  const inr = (v: number) => `₹${v.toLocaleString("en-IN")}`

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Monthly Summary" },
        ]}
        title="Monthly Summary"
        description={monthLabel}
        action={
          <Button variant="ghost" render={<Link href="/reports" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <MonthPicker year={year} month={month} />

      {/* Revenue & Collection */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Revenue & Collection
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Due (active)" value={inr(summary.totalDue)} />
          <KpiCard
            label="Collected this month"
            value={inr(summary.totalCollected)}
            sub={`${summary.paymentCount} payments`}
          />
          <KpiCard
            label="Collection rate"
            value={`${summary.collectionPct}%`}
            accent={summary.collectionPct < 50}
          />
          <KpiCard
            label="Overdue now"
            value={String(summary.overdueCount)}
            accent={summary.overdueCount > 0}
          />
        </div>
        <Card className="mt-4 p-4">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            Collected vs Due
          </h3>
          <RevenueBarChart
            collected={summary.totalCollected}
            due={summary.totalDue}
            depositsCollected={summary.depositsCollected}
            depositsRefunded={summary.depositsRefunded}
          />
        </Card>
      </div>

      {/* Fleet & Deployments */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Fleet & Deployments
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Active deployments"
            value={String(summary.activeDeployments)}
          />
          <KpiCard
            label="New this month"
            value={String(summary.newDeployments)}
          />
          <KpiCard label="Returns this month" value={String(summary.returns)} />
          <KpiCard
            label="Fleet utilization"
            value={`${summary.utilizationPct}%`}
            sub={`${summary.deployedVehicles} / ${summary.totalVehicles} vehicles`}
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              Deployment activity
            </h3>
            <DeploymentFlowChart
              active={summary.activeDeployments}
              newThisMonth={summary.newDeployments}
              returns={summary.returns}
              overdue={summary.overdueCount}
            />
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              Fleet utilization
            </h3>
            <UtilizationDonut
              deployed={summary.deployedVehicles}
              available={summary.totalVehicles - summary.deployedVehicles}
            />
          </Card>
        </div>
      </div>

      {/* Deposits */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Deposits
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Collected this month"
            value={inr(summary.depositsCollected)}
          />
          <KpiCard
            label="Refunded this month"
            value={inr(summary.depositsRefunded)}
          />
          <KpiCard
            label="Net deposit movement"
            value={inr(summary.depositsCollected - summary.depositsRefunded)}
          />
          <KpiCard
            label="All-time deployments"
            value={String(summary.totalDeployments)}
          />
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <Card className="p-4">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-semibold tabular-nums ${
          accent ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>
      ) : null}
    </Card>
  )
}
