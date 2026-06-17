"use client"

import * as React from "react"
import Link from "next/link"
import { Search } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Row = {
  stock_id: string
  spare_part_id: string
  part_name: string
  unit: string
  category_name: string | null
  quantity_on_hand: number
}

/** Search + table for the inventory list. Filters the ~200 parts client-side. */
export function InventoryBrowser({ stock }: { stock: Row[] }) {
  const [q, setQ] = React.useState("")
  const query = q.trim().toLowerCase()
  const filtered = query
    ? stock.filter((s) => s.part_name.toLowerCase().includes(query))
    : stock

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search part name…"
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm"
        />
      </div>
      <div className="text-[11px] text-muted-foreground">
        {filtered.length} of {stock.length} parts
      </div>

      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">On hand</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.stock_id}>
                <TableCell className="font-medium">
                  <Link href={`/inventory/${s.spare_part_id}`} className="hover:underline">
                    {s.part_name}
                  </Link>
                  <span className="ml-1 text-[10px] text-muted-foreground">({s.unit})</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.category_name ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{s.quantity_on_hand}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                  {stock.length === 0 ? "No parts yet." : "No parts match your search."}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}
