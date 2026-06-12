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
  searchParams: { status?: string; q?: string; page?: string }
}) {
  const status: DeploymentStatusFilter =
    searchParams.status && VALID_STATUS.has(searchParams.status as DeploymentStatusFilter)
      ? (searchParams.status as DeploymentStatusFilter)
      : "active_locked"
  const q = (searchParams.q ?? "").trim()
  const page = Math.max(1, Number(searchParams.page) || 1)

  const [{ rows, total }, lockNow, atRisk] = await Promise.all([
    listDeployments({ status, q, page, perPage: PER_PAGE }),
    countDeploymentsByAction("LOCK_NOW"),
    countDeploymentsByAction("AT_RISK"),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const fromRow = total === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const toRow = Math.min(page * PER_PAGE, total)

  // Build a query string preserving status + q, for tab/pagination links.
  const link = (next: { status?: DeploymentStatusFilter; q?: string; page?: number }) => {
    const sp = new URLSearchParams()
    const s = next.status ?? status
    if (s !== "active_locked") sp.set("status", s)
    const nq = next.q ?? q
    if (nq) sp.set("q", nq)
    const p = next.page ?? 1
    if (p > 1) sp.set("page", String(p))
    const qs = sp.toString()
    return qs ? `/deployments?${qs}` : "/deployments"
  }

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
