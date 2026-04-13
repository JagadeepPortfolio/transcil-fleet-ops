import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Dense admin table primitives. Intentionally opinionated:
 * - Sticky header (`thead` position sticky inside a scroll container)
 * - Zebra striping on tbody tr:nth-child(even)
 * - Tight row height (py-2) so 30+ rows fit on a laptop screen
 *
 * Wrap in a scroll container yourself: `<div className="overflow-x-auto">`
 */
export function Table({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("w-full border-collapse text-sm", className)}
      {...props}
    />
  )
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 bg-muted/70 backdrop-blur-sm text-xs uppercase tracking-wide text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn(
        "divide-y [&_tr:nth-child(even)]:bg-muted/20 [&_tr:hover]:bg-muted/40",
        className
      )}
      {...props}
    />
  )
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors", className)}
      {...props}
    />
  )
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-9 border-b px-3 text-left font-medium whitespace-nowrap",
        className
      )}
      {...props}
    />
  )
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-3 py-2 align-middle whitespace-nowrap", className)}
      {...props}
    />
  )
}

export function TableContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative max-h-[calc(100dvh-220px)] overflow-auto rounded-lg border bg-background",
        className
      )}
      {...props}
    />
  )
}
