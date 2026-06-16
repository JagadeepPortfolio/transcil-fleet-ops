"use client"

import { useRouter, usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export function MonthPicker({ year, month }: { year: number; month: number }) {
  const router = useRouter()
  const pathname = usePathname()

  function go(y: number, m: number) {
    router.push(`${pathname}?year=${y}&month=${m}`)
  }

  function prev() {
    if (month === 1) go(year - 1, 12)
    else go(year, month - 1)
  }

  function next() {
    if (month === 12) go(year + 1, 1)
    else go(year, month + 1)
  }

  const label = new Date(year, month - 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={prev}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[10rem] text-center text-sm font-medium">
        {label}
      </span>
      <Button variant="outline" size="sm" onClick={next}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
