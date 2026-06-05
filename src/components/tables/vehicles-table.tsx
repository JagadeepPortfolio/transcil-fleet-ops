"use client"

import * as React from "react"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table"
import { Badge } from "@/components/ui/badge"

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

export function VehiclesTable({
  rows,
  emptyState,
}: {
  rows: VehicleRow[]
  emptyState?: React.ReactNode
}) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      filterPlaceholder="Filter by VTD or EC No…"
      emptyState={emptyState}
      getRowHref={(row) => `/admin/vehicles/${row.id}`}
    />
  )
}
