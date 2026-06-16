"use client"

import { useRouter, usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export type Granularity = "week" | "month" | "year"

/**
 * Period filter for the Operations Overview report. Drives everything on the
 * page via two URL params: `g` (granularity) and `anchor` (a YYYY-MM-DD date
 * that falls inside the selected period). All date math is UTC-based on the
 * calendar date — the server normalises `anchor` to the period start.
 */
export function PeriodPicker({
  granularity,
  anchor,
  label,
}: {
  granularity: Granularity
  anchor: string
  label: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  function push(g: Granularity, a: string) {
    router.push(`${pathname}?g=${g}&anchor=${a}`)
  }

  function parse(s: string) {
    const [y, m, d] = s.split("-").map(Number)
    return new Date(Date.UTC(y, m - 1, d))
  }
  const toYMD = (d: Date) => d.toISOString().slice(0, 10)

  function shift(dir: -1 | 1) {
    const d = parse(anchor)
    if (granularity === "week") {
      d.setUTCDate(d.getUTCDate() + dir * 7)
    } else if (granularity === "month") {
      d.setUTCMonth(d.getUTCMonth() + dir, 1)
    } else {
      d.setUTCFullYear(d.getUTCFullYear() + dir, 0, 1)
    }
    push(granularity, toYMD(d))
  }

  const tabs: { key: Granularity; label: string }[] = [
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
  ]

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Granularity toggle */}
      <div className="inline-flex rounded-lg border border-border p-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => push(t.key, anchor)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              granularity === t.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Period navigator */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => shift(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-[11rem] text-center text-sm font-medium">
          {label}
        </span>
        <Button variant="outline" size="sm" onClick={() => shift(1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
