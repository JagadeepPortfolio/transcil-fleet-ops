import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { getOperationsOverview, type Granularity } from "@/lib/db/reports"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { PeriodPicker } from "../_components/period-picker"
import { DeploymentTrendChart } from "@/components/charts/deployment-trend-chart"

export const metadata = {
  title: "Operations Overview · Reports · Transcil Fleet Ops",
}

function istToday(): string {
  // en-CA gives YYYY-MM-DD; pin to IST so the default period is the local one.
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
}

export default async function OperationsOverviewPage({
  searchParams,
}: {
  searchParams: { g?: string; anchor?: string }
}) {
  const g: Granularity =
    searchParams.g === "week" || searchParams.g === "year"
      ? searchParams.g
      : "month"
  const anchor =
    searchParams.anchor && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.anchor)
      ? searchParams.anchor
      : istToday()

  const data = await getOperationsOverview(g, anchor)
  const { counts, collections } = data

  const inr = (v: number) => `₹${v.toLocaleString("en-IN")}`
  const periodWord =
    g === "week" ? "this week" : g === "year" ? "this year" : "this month"

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Operations Overview" },
        ]}
        title="Operations Overview"
        description="Deployments, fleet movement and collections — by week, month or year."
        action={
          <Button variant="ghost" render={<Link href="/reports" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <PeriodPicker granularity={g} anchor={data.anchor} label={data.periodLabel} />

      {/* Deployments trend */}
      <Card className="p-4">
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">
          Total deployments over time — Individual vs 3PL
        </h3>
        <DeploymentTrendChart data={data.trend} />
      </Card>

      {/* Fleet movement */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Fleet movement · {data.periodLabel}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={`New ${periodWord}`}
            value={String(counts.newTotal)}
            sub={`${counts.newIndividual} individual · ${counts.newThreePL} 3PL`}
          />
          <KpiCard label={`Returned ${periodWord}`} value={String(counts.returned)} />
          <KpiCard label={`Replaced ${periodWord}`} value={String(counts.replaced)} />
          <KpiCard
            label="Currently active"
            value={String(counts.activeIndividual + counts.activeThreePL)}
            sub={`${counts.activeIndividual} individual · ${counts.activeThreePL} 3PL`}
          />
        </div>
      </div>

      {/* Individual collections */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Individual collections · {data.periodLabel}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label={`Security deposits ${periodWord}`}
            value={inr(collections.depositsCollected)}
          />
          <KpiCard
            label={`Weekly rent ${periodWord}`}
            value={inr(collections.rentCollected)}
          />
          <KpiCard
            label="Outstanding dues (now)"
            value={inr(collections.outstandingDue)}
            accent={collections.outstandingDue > 0}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Collections cover Individual riders only — 3PL deployments are
          billing-exempt. Outstanding dues is a live total across all active
          Individual deployments, not scoped to the selected period.
        </p>
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
