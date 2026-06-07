"use client"

import * as React from "react"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table"
import type { RiderRow } from "@/lib/db/riders"
import { formatDate } from "@/lib/dates"

const columns: ColumnDef<RiderRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/riders/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.phone}</span>
    ),
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.source ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "purpose",
    header: "Purpose",
    cell: ({ row }) => {
      const r = row.original
      return (
        <span className="text-muted-foreground">
          {r.purpose ?? "—"}
          {r.store_name ? (
            <span className="text-xs"> · {r.store_name}</span>
          ) : null}
        </span>
      )
    },
  },
  {
    accessorKey: "emergency_contact_name",
    header: "Emergency contact",
    cell: ({ row }) => {
      const r = row.original
      if (!r.emergency_contact_name && !r.emergency_contact_number) return "—"
      return (
        <div className="text-xs">
          <div>
            {r.emergency_contact_name ?? "—"}
            {r.emergency_contact_relationship ? (
              <span className="text-muted-foreground">
                {" "}
                ({r.emergency_contact_relationship})
              </span>
            ) : null}
          </div>
          {r.emergency_contact_number ? (
            <div className="font-mono text-muted-foreground">
              {r.emergency_contact_number}
            </div>
          ) : null}
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "Added",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
]

export function RidersTable({
  rows,
  emptyState,
}: {
  rows: RiderRow[]
  emptyState?: React.ReactNode
}) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      filterPlaceholder="Filter by name or phone…"
      emptyState={emptyState}
      getRowHref={(row) => `/riders/${row.id}`}
    />
  )
}
