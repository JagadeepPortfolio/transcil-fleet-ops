import Link from "next/link"
import { Plus, Truck, Search } from "lucide-react"

import {
  listDeployments,
  countDeploymentsByAction,
  type DeploymentStatusFilter,
} from "@/lib/db/deployments"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DeploymentsTable } from "@/components/tables/deployments-table"
import { formatDate } from "@/lib/dates"

export const metadata = {
  title: "Deployments · Transcil Fleet Ops",
}

const PER_PAGE = 50

const STATUS_TABS: { value: DeploymentStatusFilter; label: string }[] = [
  { value: "active_locked", label: "Active + Locked" },
  { value: "active", label: "Active" },
  { value: "locked", label: "Locked" },
  { value: "returned", label: "Returned" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
]

const VALID_STATUS = new Set(STATUS_TABS.map((t) => t.value))

export default async function DeploymentsPage({
  searchParams,
}: {
  searchParams: {
    status?: string
    q?: string
    date?: string
    source?: string
    from?: string
    to?: string
    page?: string
  }
}) {
  const status: DeploymentStatusFilter =
    searchParams.status && VALID_STATUS.has(searchParams.status as DeploymentStatusFilter)
      ? (searchParams.status as DeploymentStatusFilter)
      : "active_locked"
  const q = (searchParams.q ?? "").trim()
  const dateRe = /^\d{4}-\d{2}-\d{2}$/
  const date = searchParams.date && dateRe.test(searchParams.date) ? searchParams.date : ""
  const from = searchParams.from && dateRe.test(searchParams.from) ? searchParams.from : ""
  const to = searchParams.to && dateRe.test(searchParams.to) ? searchParams.to : ""
  const source =
    searchParams.source && ["Individual", "3PL", "Camions"].includes(searchParams.source)
      ? searchParams.source
      : ""
  const page = Math.max(1, Number(searchParams.page) || 1)

  const [{ rows, total }, lockNow, atRisk] = await Promise.all([
    listDeployments({ status, q, date, source, from, to, page, perPage: PER_PAGE }),
    countDeploymentsByAction("LOCK_NOW"),
    countDeploymentsByAction("AT_RISK"),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const fromRow = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const toRow = Math.min(page * PER_PAGE, total)

  // Build a query string preserving status + q + date/source/range drill-downs.
  const link = (next: {
    status?: DeploymentStatusFilter
    q?: string
    date?: string
    source?: string
    from?: string
    to?: string
    page?: number
  }) => {
    const sp = new URLSearchParams()
    const s = next.status ?? status
    if (s !== "active_locked") sp.set("status", s)
    const nq = next.q ?? q
    if (nq) sp.set("q", nq)
    const d = next.date !== undefined ? next.date : date
    if (d) sp.set("date", d)
    const src = next.source !== undefined ? next.source : source
    if (src) sp.set("source", src)
    const f = next.from !== undefined ? next.from : from
    if (f) sp.set("from", f)
    const t = next.to !== undefined ? next.to : to
    if (t) sp.set("to", t)
    const p = next.page ?? 1
    if (p > 1) sp.set("page", String(p))
    const qs = sp.toString()
    return qs ? `/deployments?${qs}` : "/deployments"
  }

  const hasDrill = !!(date || source || from || to)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deployments"
        description={`${total} ${status === "active_locked" ? "active/locked" : "matching"} · ${lockNow} lock now · ${atRisk} at risk, sorted by due date.`}
        action={
          <Button render={<Link href="/deployments/new" />}>
            <Plus /> New deployment
          </Button>
        }
      />

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((t) => (
            <Button
              key={t.value}
              size="sm"
              variant={t.value === status ? "default" : "outline"}
              render={<Link href={link({ status: t.value, page: 1 })} />}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <form className="flex items-center gap-2">
          {status !== "active_locked" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search rider, phone, VTD, EC, code…"
              className="pl-8"
            />
          </div>
          <Button type="submit" size="sm">
            Search
          </Button>
          {q ? (
            <Button size="sm" variant="ghost" render={<Link href={link({ q: "", page: 1 })} />}>
              Clear
            </Button>
          ) : null}
        </form>
      </Card>

      {hasDrill ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {source ? (
              <>
                Source <span className="font-medium text-foreground">{source}</span>
              </>
            ) : null}
            {source && (date || from || to) ? " · " : ""}
            {date ? (
              <>
                Deployed on <span className="font-medium text-foreground">{formatDate(date)}</span>
              </>
            ) : from || to ? (
              <>
                Deployed{" "}
                <span className="font-medium text-foreground">
                  {from ? formatDate(from) : "…"} – {to ? formatDate(to) : "…"}
                </span>
              </>
            ) : null}
          </span>
          <Button
            size="sm"
            variant="ghost"
            render={<Link href={link({ date: "", source: "", from: "", to: "", page: 1 })} />}
          >
            Clear filters
          </Button>
        </div>
      ) : null}

      <DeploymentsTable
        rows={rows}
        emptyState={
          <EmptyState
            icon={<Truck />}
            title={q ? "No deployments match your search" : "No deployments here"}
            description={
              q
                ? "Try a different search term or status filter."
                : "Create your first deployment to see it appear here with the live action badge."
            }
            action={
              <Button render={<Link href="/deployments/new" />}>
                <Plus /> New deployment
              </Button>
            }
          />
        }
      />

      {total > 0 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="tabular-nums">
            Showing {fromRow}–{toRow} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              render={page <= 1 ? undefined : <Link href={link({ page: page - 1 })} />}
            >
              Previous
            </Button>
            <span className="tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              render={page >= totalPages ? undefined : <Link href={link({ page: page + 1 })} />}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
