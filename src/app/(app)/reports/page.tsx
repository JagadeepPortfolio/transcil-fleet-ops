import Link from "next/link"
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  Clock,
  Building2,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"

export const metadata = {
  title: "Reports · Transcil Fleet Ops",
}

const REPORTS = [
  {
    title: "Daily Activity",
    description:
      "Per-day deployments, customers, and money collected (deposit + weekly rent + late fee). Filter by date range; defaults to today.",
    href: "/reports/daily-activity",
    icon: CalendarRange,
  },
  {
    title: "Monthly Summary",
    description:
      "Revenue, fleet utilization, new deployments vs returns, overdue count. The top-level business snapshot.",
    href: "/reports/monthly-summary",
    icon: CalendarDays,
  },
  {
    title: "Outstanding Balances",
    description:
      "All active deployments with unpaid balances, grouped by ageing bucket (current, 1–7d, 8–14d, 15–30d, 30d+).",
    href: "/reports/outstanding",
    icon: Clock,
  },
  {
    title: "Hub Performance",
    description:
      "Side-by-side comparison of collection rate, utilization, and overdue count per hub.",
    href: "/reports/hub-performance",
    icon: Building2,
  },
]

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Reports"
        description="Key operational reports for leadership review."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const Icon = r.icon
          return (
            <Link key={r.href} href={r.href} className="group">
              <Card className="flex h-full flex-col gap-3 p-5 transition-colors group-hover:border-foreground/20">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">{r.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {r.description}
                  </p>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
