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
  type_name: string | null
  hub_name: string | null
  active_rider: string | null
  active_days_left: number | null
}

const columns: ColumnDef<VehicleRow>[] = [
  {
    accessorKey: "vtd_no",
    header: "VTD",
    cell: ({ row }) => (
      <Link
        href={`/admin/vehicles/${row.original.id}`}
        className="font-mono text-xs font-medium hover:underline"
      >
        {row.original.vtd_no}
      </Link>
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
      return <Badge variant="success">Available</Badge>
    },
  },
]

type AvailabilityFilter = "all" | "available" | "in_use"

const AVAILABILITY_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "in_use", label: "In use" },
]

export function VehiclesTable({
  rows,
  emptyState,
}: {
  rows: VehicleRow[]
  emptyState?: React.ReactNode
}) {
  const [availability, setAvailability] =
    React.useState<AvailabilityFilter>("all")

  // Availability is derived: a vehicle with an active rider is "In use",
  // otherwise "Available" (matches the Availability column).
  const filtered = React.useMemo(() => {
    if (availability === "all") return rows
    return rows.filter((r) =>
      availability === "in_use" ? !!r.active_rider : !r.active_rider
    )
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
                  opt.value === "in_use" ? !!r.active_rider : !r.active_rider
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
        getRowHref={(row) => `/admin/vehicles/${row.id}`}
      />
    </div>
  )
}
