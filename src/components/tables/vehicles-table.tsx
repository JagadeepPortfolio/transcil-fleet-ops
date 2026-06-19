"use client"

import * as React from "react"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table"
import { VehicleStatusBadge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type VehicleRow = {
  id: string
  vtd_no: string
  vehicle_id: string | null
  chassis_no: string | null
  colour: string | null
  business_type: string
  service_status: string
  /** Derived rollup from vehicles_enriched: In Use / Locked / Under Repair / In Factory / Available. */
  effective_status: string
  type_name: string | null
  hub_name: string | null
  created_by_name: string | null
  active_rider: string | null
  active_days_left: number | null
}

const STATUS_RANK: Record<string, number> = {
  Available: 0,
  "In Use": 1,
  Locked: 2,
  "Under Repair": 3,
  "In Factory": 4,
}

// Columns depend on canManage: only CMD gets an editable (linked) VTD.
function makeColumns(canManage: boolean): ColumnDef<VehicleRow>[] {
  return [
  {
    accessorKey: "vtd_no",
    header: "VTD",
    cell: ({ row }) =>
      canManage ? (
        <Link
          href={`/admin/vehicles/${row.original.id}`}
          className="font-mono text-xs font-medium hover:underline"
        >
          {row.original.vtd_no}
        </Link>
      ) : (
        <span className="font-mono text-xs font-medium">
          {row.original.vtd_no}
        </span>
      ),
  },
  {
    accessorKey: "vehicle_id",
    header: "EC No",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.vehicle_id ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "chassis_no",
    header: "Chassis No",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.chassis_no ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "type_name",
    header: "Type",
    cell: ({ row }) => row.original.type_name ?? "—",
  },
  {
    accessorKey: "hub_name",
    header: "Hub",
    cell: ({ row }) => row.original.hub_name ?? "—",
  },
  {
    accessorKey: "colour",
    header: "Colour",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.colour ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "business_type",
    header: "Business",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.business_type ?? "—"}</span>
    ),
  },
  {
    accessorKey: "created_by_name",
    header: "Added by",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.created_by_name ?? "—"}
      </span>
    ),
  },
  {
    id: "availability",
    // Sort key for the derived status (Available first). Excluded from text search.
    accessorFn: (row) => STATUS_RANK[row.effective_status] ?? 5,
    enableGlobalFilter: false,
    header: "Status",
    cell: ({ row }) => {
      const r = row.original
      return (
        <div className="flex items-center gap-2">
          <VehicleStatusBadge status={r.effective_status} />
          {r.effective_status === "In Use" && r.active_rider ? (
            <span className="text-xs text-muted-foreground">
              {r.active_rider} · {r.active_days_left ?? "—"}d left
            </span>
          ) : null}
        </div>
      )
    },
  },
  ]
}

type AvailabilityFilter = "all" | "available" | "in_use"

const AVAILABILITY_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "in_use", label: "In use" },
]

export function VehiclesTable({
  rows,
  emptyState,
  canManage = false,
}: {
  rows: VehicleRow[]
  emptyState?: React.ReactNode
  /** CMD only — enables links into the edit pages and row click-through. */
  canManage?: boolean
}) {
  const [availability, setAvailability] =
    React.useState<AvailabilityFilter>("all")

  const columns = React.useMemo(() => makeColumns(canManage), [canManage])

  // Derived from the single effective_status rollup.
  const isInUse = (r: VehicleRow) => r.effective_status === "In Use"
  const isAvailable = (r: VehicleRow) => r.effective_status === "Available"
  const filtered = React.useMemo(() => {
    if (availability === "all") return rows
    return rows.filter((r) => (availability === "in_use" ? isInUse(r) : isAvailable(r)))
  }, [rows, availability])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Availability:
        </span>
        {AVAILABILITY_OPTIONS.map((opt) => {
          const active = availability === opt.value
          const count =
            opt.value === "all"
              ? rows.length
              : rows.filter((r) =>
                  opt.value === "in_use" ? isInUse(r) : isAvailable(r)
                ).length
          return (
            <Button
              key={opt.value}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => setAvailability(opt.value)}
            >
              {opt.label}
              <span className="ml-1 tabular-nums opacity-70">{count}</span>
            </Button>
          )
        })}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        filterPlaceholder="Filter by VTD or EC No…"
        defaultSorting={[{ id: "availability", desc: false }]}
        // Only the true "no vehicles at all" case shows the empty state; a
        // filter that excludes everything falls through to "No rows match".
        emptyState={rows.length === 0 ? emptyState : undefined}
        getRowHref={canManage ? (row) => `/admin/vehicles/${row.id}` : undefined}
      />
    </div>
  )
}
