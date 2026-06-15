"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Placeholder for the global filter input. */
  filterPlaceholder?: string
  /** Shown when `data.length === 0` (vs. filter-empty). */
  emptyState?: React.ReactNode
  /** Hide the top filter row. */
  hideFilter?: boolean
  /** Initial column sort, e.g. [{ id: "availability", desc: false }]. */
  defaultSorting?: SortingState
  /** Return a URL to navigate to when a row is clicked. Makes the whole row clickable. */
  getRowHref?: (row: TData) => string
  className?: string
}

/**
 * Client-side data table: sortable columns + global text filter.
 * Expects the full dataset up front — suitable up to a few thousand rows.
 * For larger sets, paginate server-side and pass the current page in.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  filterPlaceholder = "Filter…",
  emptyState,
  hideFilter,
  defaultSorting,
  getRowHref,
  className,
}: DataTableProps<TData, TValue>) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>(defaultSorting ?? [])
  const [globalFilter, setGlobalFilter] = React.useState("")

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
  })

  const rowCount = table.getRowModel().rows.length
  const totalCount = data.length

  return (
    <div className={cn("space-y-3", className)}>
      {!hideFilter ? (
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={filterPlaceholder}
              className="pl-8"
            />
          </div>
          <div className="text-xs tabular-nums text-muted-foreground">
            {globalFilter
              ? `${rowCount} of ${totalCount}`
              : `${totalCount} total`}
          </div>
        </div>
      ) : null}

      {totalCount === 0 && emptyState ? (
        emptyState
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    return (
                      <TableHead
                        key={header.id}
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                        className={cn(
                          canSort && "cursor-pointer select-none hover:text-foreground"
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort ? (
                            sorted === "asc" ? (
                              <ArrowUp className="size-3" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3" />
                            ) : (
                              <ArrowUpDown className="size-3 opacity-40" />
                            )
                          ) : null}
                        </span>
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rowCount === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-10 text-center text-xs text-muted-foreground"
                  >
                    No rows match that filter.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const href = getRowHref?.(row.original)
                  return (
                    <TableRow
                      key={row.id}
                      onClick={
                        href
                          ? () => router.push(href)
                          : undefined
                      }
                      className={href ? "cursor-pointer" : undefined}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  )
}
