import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, StickyNote } from "lucide-react"

import { getDeployment } from "@/lib/db/deployments"
import { listActivityForDeployment } from "@/lib/db/activity-log"
import { listAvailableVehicles } from "@/lib/db/vehicles"
import { getCurrentRole } from "@/lib/auth/role"
import { formatDate } from "@/lib/dates"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { EventDialogs } from "./event-dialogs"
import {
  ActionBadge,
  DeploymentStatusBadge,
  PayStatusBadge,
} from "@/components/ui/badge"
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
  title: "Deployment · Transcil Fleet Ops",
}

export default async function DeploymentDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { warn?: string }
}) {
  const d = await getDeployment(params.id)
  if (!d) notFound()

  const [log, availableVehicles, role] = await Promise.all([
    listActivityForDeployment(params.id),
    d.status === "ACTIVE" || d.status === "LOCKED"
      ? listAvailableVehicles()
      : Promise.resolve([]),
    getCurrentRole(),
  ])
  const isCmd = role === "CMD"

  const inr = (v: number | null | undefined) =>
    v != null ? `₹${Number(v).toLocaleString("en-IN")}` : "—"

  const showActions = d.status === "ACTIVE" || d.status === "LOCKED"

  // Return-balance inputs. enriched.total_paid = rent paid + deposit collected,
  // so rent paid alone = total_paid − deposit_collected.
  const rentPaid = (d.total_paid ?? 0) - (d.deposit_collected ?? 0)
  const rentOutstanding = Math.max(0, d.weeks * d.rate_inr - rentPaid)
  const dailyLateRate = Math.round(d.rate_inr / 7)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Deployments", href: "/deployments" },
          { label: d.deployment_code ?? d.rider_name ?? "Deployment" },
        ]}
        title={d.rider_name ?? "Deployment"}
        description={`${d.deployment_code ? `${d.deployment_code} · ` : ""}VTD ${d.vtd_no ?? "—"} · ${d.hub_name ?? "—"}`}
        action={
          <Button variant="ghost" render={<Link href="/deployments" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      {searchParams.warn ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          {searchParams.warn}
        </div>
      ) : null}

      <div className={`flex flex-col gap-6 ${showActions ? "lg:flex-row" : ""}`}>
        {/* Left sidebar — Quick actions (sticky, desktop only) */}
        {showActions ? (
          <aside className="shrink-0 lg:w-48">
            <div className="lg:sticky lg:top-6">
              <Card className="space-y-3 p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quick actions
                </div>
                <EventDialogs
                  deploymentId={d.id}
                  deploymentStatus={d.status}
                  currentVtd={d.vtd_no ?? "—"}
                  currentEc={d.vehicle_serial}
                  availableVehicles={availableVehicles.map((v: { id: string; vtd_no: string; vehicle_id: string | null; colour: string | null }) => ({
                    id: v.id,
                    vtd_no: v.vtd_no,
                    ec: v.vehicle_id,
                    colour: v.colour,
                  }))}
                  isCmd={isCmd}
                  deployDate={d.deploy_date}
                  batteryType={d.battery_type}
                  issuedBattery={d.battery_number}
                  issuedBattery2={d.battery_number_2}
                  issuedCharger={d.charger_cable_number}
                  dueDate={d.due_date}
                  dailyLateRate={dailyLateRate}
                  rentOutstanding={rentOutstanding}
                />
              </Card>
            </div>
          </aside>
        ) : null}

        {/* Right — main content */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Headline status row */}
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Status
            </span>
            <DeploymentStatusBadge status={d.status} />
            <span className="mx-1 text-border">·</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Action
            </span>
            <ActionBadge action={d.action} />
            <span className="mx-1 text-border">·</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Pay
            </span>
            <PayStatusBadge status={d.pay_status} />
            <div className="ml-auto text-sm tabular-nums text-muted-foreground">
              {d.days_left != null ? (
                <>
                  <span
                    className={
                      d.days_left < 0
                        ? "font-semibold text-destructive"
                        : d.days_left === 0
                        ? "font-semibold text-warning-foreground"
                        : "font-semibold text-foreground"
                    }
                  >
                    {d.days_left}
                  </span>{" "}
                  days left
                </>
              ) : null}
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard label="Deploy date" value={formatDate(d.deploy_date)} />
            {d.billing_exempt ? (
              <InfoCard label="Billing" value="3PL — deposit only (no rent)" />
            ) : (
              <>
                <InfoCard label="Due date" value={formatDate(d.due_date)} />
                <InfoCard label="Weeks" value={String(d.weeks)} />
                <InfoCard label="Rate" value={`${inr(d.rate_inr)}/wk`} />
              </>
            )}
            <InfoCard label="Deposit required" value={inr(d.deposit_required_inr)} />
            <InfoCard label="Total due" value={inr(d.total_due)} />
            <InfoCard label="Total collected" value={inr(d.total_collected)} />
            {d.late_fee_collected != null && d.late_fee_collected > 0 ? (
              <InfoCard
                label="Late fee collected"
                value={inr(d.late_fee_collected)}
              />
            ) : null}
            <InfoCard
              label="Balance"
              value={inr(d.balance)}
              accent={d.balance != null && d.balance > 0}
            />
            <InfoCard label="Battery type" value={d.battery_type ?? "—"} />
            {d.battery_type !== "Fixed" ? (
              <InfoCard
                label={d.battery_number_2 ? "Battery no. 1" : "Battery no."}
                value={d.battery_number ?? "—"}
              />
            ) : null}
            {d.battery_number_2 ? (
              <InfoCard label="Battery no. 2" value={d.battery_number_2} />
            ) : null}
            <InfoCard label="Charger cable no." value={d.charger_cable_number ?? "—"} />
          </div>

          {d.notes ? (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <StickyNote className="size-3.5" /> Notes
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm">{d.notes}</div>
            </Card>
          ) : null}

          <div className="space-y-3">
            <h2 className="text-base font-semibold">Activity log</h2>
            <TableContainer className="max-h-none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Weeks</TableHead>
                    <TableHead>Txn ID</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {log.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-xs text-muted-foreground"
                      >
                        No activity yet. Use the quick actions to record a
                        payment, deposit, refund or reminder call.
                      </TableCell>
                    </TableRow>
                  ) : (
                    log.map((e: Record<string, unknown>) => (
                      <TableRow key={e.id as string}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(e.event_date as string)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {e.event_type as string}
                          {e.event_type === "PAYMENT" && e.payment_category ? (
                            <span
                              className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                e.payment_category === "Late fee"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {e.payment_category as string}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {e.amount_inr != null
                            ? `₹${Number(e.amount_inr).toLocaleString("en-IN")}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {e.extra_weeks != null
                            ? `+${e.extra_weeks as number}`
                            : e.week_number != null
                              ? String(e.week_number as number)
                              : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {(e.transaction_id as string) ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {(e.created_by_name as string) ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {e.event_type === "DEPLOY_DATE_EDIT" ? (
                            `${formatDate(e.old_value as string)} → ${formatDate(
                              e.new_value as string
                            )}${e.reason ? ` · ${e.reason as string}` : ""}`
                          ) : e.event_type === "RETURN" &&
                            (e.battery_number || e.battery_number_2 || e.charger_cable_number) ? (
                            <span>
                              Battery {(e.battery_number as string) ?? "—"}
                              {e.battery_number_2
                                ? ` / ${e.battery_number_2 as string}`
                                : ""}{" "}
                              · Charger{" "}
                              {(e.charger_cable_number as string) ?? "—"}
                              {e.reason ? ` · ${e.reason as string}` : ""}
                            </span>
                          ) : (
                            ((e.notes as string) ?? "")
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <Card className="p-4">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-sm font-semibold tabular-nums ${
          accent ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </Card>
  )
}
