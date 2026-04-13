"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table"
import type { RiderRow } from "@/lib/db/riders"

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
    accessorKey: "created_at",
    header: "Added",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {format(new Date(row.original.created_at), "dd MMM yyyy")}
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
