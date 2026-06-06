"use client"

import * as React from "react"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/ui/data-table"
import { ActionBadge, DeploymentStatusBadge, PayStatusBadge } from "@/components/ui/badge"
import type { DeploymentEnrichedRow } from "@/lib/db/deployments"
import { formatDate } from "@/lib/dates"

type Row = DeploymentEnrichedRow

const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <DeploymentStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => <ActionBadge action={row.original.action} />,
  },
  {
    accessorKey: "deployment_code",
    header: "Code",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium">
        {row.original.deployment_code ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "rider_name",
    header: "Rider",
    cell: ({ row }) => (
      <Link
        href={`/deployments/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.rider_name ?? "—"}
      </Link>
    ),
  },
  {
    accessorKey: "rider_phone",
    header: "Phone",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.rider_phone ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "vtd_no",
    header: "VTD / EC No",
    cell: ({ row }) => (
      <div className="leading-tight">
        <div className="font-mono text-xs">{row.original.vtd_no ?? "—"}</div>
        <div className="font-mono text-[11px] text-muted-foreground">
          EC: {row.original.vehicle_serial ?? "—"}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "hub_name",
    header: "Hub",
    cell: ({ row }) => row.original.hub_name ?? "—",
  },
  {
    accessorKey: "deploy_date",
    header: "Deploy",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.original.deploy_date)}
      </span>
    ),
  },
  {
    accessorKey: "due_date",
    header: "Due",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.original.due_date)}
      </span>
    ),
  },
  {
    accessorKey: "days_left",
    header: () => <span className="block text-right">Days left</span>,
    cell: ({ row }) => {
      const d = row.original.days_left
      return (
        <span
          className={`block text-right text-xs tabular-nums ${
            d != null && d < 0
              ? "font-semibold text-destructive"
              : d === 0
              ? "font-semibold text-warning-foreground"
              : "text-muted-foreground"
          }`}
        >
          {d ?? "—"}
        </span>
      )
    },
    sortingFn: (a, b) => {
      const av = a.original.days_left ?? Number.MAX_SAFE_INTEGER
      const bv = b.original.days_left ?? Number.MAX_SAFE_INTEGER
      return av - bv
    },
  },
  {
    accessorKey: "pay_status",
    header: "Pay",
    cell: ({ row }) => <PayStatusBadge status={row.original.pay_status} />,
  },
  {
    accessorKey: "balance",
    header: () => <span className="block text-right">Balance</span>,
    cell: ({ row }) => (
      <span className="block text-right font-mono text-xs tabular-nums">
        {row.original.balance != null
          ? `₹${row.original.balance.toLocaleString("en-IN")}`
          : "—"}
      </span>
    ),
  },
]

export function DeploymentsTable({
  rows,
  emptyState,
}: {
  rows: Row[]
  emptyState?: React.ReactNode
}) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      filterPlaceholder="Filter by rider, phone, VTD…"
      emptyState={emptyState}
    />
  )
}
