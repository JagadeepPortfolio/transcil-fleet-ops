"use client"

import * as React from "react"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export type VehicleRow = {
  id: string
  vtd_no: string
  vehicle_id: string | null
  chassis_no: string | null
  colour: string | null
  service_status: string
  type_name: string | null
  hub_name: string | null
  created_by_name: string | null
  active_rider: string | null
  active_days_left: number | null
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
    header: "Availability",
    cell: ({ row }) => {
      const r = row.original
      if (r.active_rider) {
        return (
          <div className="flex items-center gap-2">
            <Badge variant="destructive">In use</Badge>
            <span className="text-xs text-muted-foreground">
              {r.active_rider} · {r.active_days_left ?? "—"}d left
            </span>
          </div>
        )
      }
      if (r.service_status === "Under Repair")
        return <Badge variant="warning">Under Repair</Badge>
      if (r.service_status === "In Factory")
        return <Badge variant="info">In Factory</Badge>
      return <Badge variant="success">Available</Badge>
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

  // "In use" = has an active rider (derived). "Available" = no active rider AND
  // service status Available (Under Repair / In Factory are excluded).
  const isInUse = (r: VehicleRow) => !!r.active_rider
  const isAvailable = (r: VehicleRow) =>
    !r.active_rider && r.service_status === "Available"
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
        // Only the true "no vehicles at all" case shows the empty state; a
        // filter that excludes everything falls through to "No rows match".
        emptyState={rows.length === 0 ? emptyState : undefined}
        getRowHref={canManage ? (row) => `/admin/vehicles/${row.id}` : undefined}
      />
    </div>
  )
}
