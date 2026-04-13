import { cn } from "@/lib/utils"

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

/**
 * Generic table skeleton used as a Suspense fallback for any data table.
 * Renders `rows` rows of `cols` shimmering cells with a matching header.
 */
export function TableSkeleton({
  rows = 8,
  cols = 6,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="grid gap-3 border-b bg-muted/50 px-4 py-3" style={gridCols(cols)}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-16" />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid items-center gap-3 px-4 py-3" style={gridCols(cols)}>
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function gridCols(n: number): React.CSSProperties {
  return { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }
}
