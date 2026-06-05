import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  CircleCheck,
  Clock,
  Lock,
  ShieldAlert,
  Truck,
  Users,
} from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { listDeployments } from "@/lib/db/deployments"
import { listAvailableVehicles } from "@/lib/db/vehicles"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { ActionBadge, PayStatusBadge } from "@/components/ui/badge"

export const metadata = {
  title: "Dashboard · Transcil Fleet Ops",
}

export default async function DashboardPage() {
  const supabase = createClient()

  const [
    activeRes,
    lockedRes,
    riderRes,
    vehicleRes,
    availableVehicles,
    deployments,
  ] = await Promise.all([
    supabase
      .from("deployments")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE")
      .is("deleted_at", null),
    supabase
      .from("deployments")
      .select("id", { count: "exact", head: true })
      .eq("status", "LOCKED")
      .is("deleted_at", null),
    supabase
      .from("riders")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    listAvailableVehicles(),
    listDeployments(),
  ])

  const lockNow = deployments.filter((d) => d.action === "LOCK_NOW").length

  const kpis = [
    {
      label: "Active deployments",
      value: activeRes.count ?? 0,
      icon: Truck,
      href: "/deployments",
    },
    {
      label: "Riders",
      value: riderRes.count ?? 0,
      icon: Users,
      href: "/riders",
    },
    {
      label: "Total Vehicles",
      value: vehicleRes.count ?? 0,
      icon: Bike,
      href: "/admin/vehicles",
    },
    {
      label: "Available Vehicles",
      value: availableVehicles.length,
      icon: CircleCheck,
      href: "/admin/vehicles",
    },
    {
      label: "Locked vehicles",
      value: lockedRes.count ?? 0,
      icon: Lock,
      href: "/deployments",
    },
  ]

  const alerts = [
    {
      label: "Lock now",
      value: lockNow,
      icon: ShieldAlert,
      tone: "destructive" as const,
    },
    {
      // Overdue deployments — same set as "Lock now", framed as a status.
      label: "Due Date Crossed",
      value: lockNow,
      icon: AlertTriangle,
      tone: "warning" as const,
    },
  ]

  // Top 5 most urgent: LOCK_NOW first, then AT_RISK, then by days_left ascending.
  const actionPriority: Record<string, number> = {
    LOCK_NOW: 0,
    AT_RISK: 1,
    CALL_TODAY: 2,
    UPCOMING: 3,
    OK: 4,
  }
  const urgent = [...deployments]
    .filter((d) => d.status === "ACTIVE")
    .sort((a, b) => {
      const ap = actionPriority[a.action ?? "OK"] ?? 5
      const bp = actionPriority[b.action ?? "OK"] ?? 5
      if (ap !== bp) return ap - bp
      return (a.days_left ?? 999) - (b.days_left ?? 999)
    })
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Operational overview. Full KPI module lands with Module 8."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="group">
            <Card className="p-5 transition-colors group-hover:border-foreground/20">
              <div className="flex items-start justify-between">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </div>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="text-3xl font-semibold tabular-nums tracking-tight">
                  {value}
                </div>
                <ArrowRight className="size-4 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {alerts.map(({ label, value, icon: Icon, tone }) => (
          <Card
            key={label}
            className={`flex items-center gap-4 p-4 ${
              value > 0
                ? tone === "destructive"
                  ? "border-destructive/30 bg-destructive/5"
                  : tone === "warning"
                    ? "border-warning/30 bg-warning/5"
                    : "border-info/30 bg-info/5"
                : ""
            }`}
          >
            <div
              className={`flex size-10 items-center justify-center rounded-full ${
                tone === "destructive"
                  ? "bg-destructive/10 text-destructive"
                  : tone === "warning"
                    ? "bg-warning/15 text-warning-foreground dark:text-warning"
                    : "bg-info/15 text-info-foreground dark:text-info"
              }`}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </div>
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Most urgent</h2>
          </div>
          <Button
            size="sm"
            variant="ghost"
            render={<Link href="/deployments" />}
          >
            View all <ArrowRight />
          </Button>
        </div>
        {urgent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nothing urgent — everyone is on schedule.
          </div>
        ) : (
          <ul className="divide-y">
            {urgent.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-muted/40"
              >
                <ActionBadge action={d.action} />
                <Link
                  href={`/deployments/${d.id}`}
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {d.rider_name ?? "—"}
                </Link>
                <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                  {d.vtd_no ?? "—"}
                </span>
                <PayStatusBadge status={d.pay_status} />
                <span
                  className={`w-16 text-right text-xs tabular-nums ${
                    d.days_left != null && d.days_left < 0
                      ? "font-semibold text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {d.days_left != null ? `${d.days_left}d` : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
