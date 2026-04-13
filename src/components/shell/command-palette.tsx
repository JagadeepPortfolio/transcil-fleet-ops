"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { Search, Truck, Users, Bike, BarChart3, CircleHelp, LayoutDashboard, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type SearchRider = { id: string; name: string; phone: string }
type SearchDeployment = {
  id: string
  rider_name: string | null
  vtd_no: string | null
  status: string
  action: string | null
}
type SearchData = {
  riders: SearchRider[]
  deployments: SearchDeployment[]
}

type PaletteItem = {
  key: string
  label: string
  hint?: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const STATIC_NAVIGATION: PaletteItem[] = [
  { key: "nav-dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "nav-deployments", label: "Deployments", href: "/deployments", icon: Truck },
  { key: "nav-riders", label: "Riders", href: "/riders", icon: Users },
  { key: "nav-reports", label: "Reports", href: "/reports", icon: BarChart3 },
  { key: "nav-vehicles", label: "Vehicles (admin)", href: "/admin/vehicles", icon: Bike },
  { key: "nav-help", label: "Help & Guide", href: "/help", icon: CircleHelp },
]

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [data, setData] = React.useState<SearchData | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  // Global Cmd+K / Ctrl+K binding
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Lazy fetch on first open, refresh on every open so new rows show up.
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetch("/api/search")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setData({ riders: [], deployments: [] })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  // Reset query + focus on open
  React.useEffect(() => {
    if (open) {
      setQuery("")
      setActive(0)
      // base-ui dialog handles focus trapping; a microtask is enough.
      queueMicrotask(() => inputRef.current?.focus())
    }
  }, [open])

  const items = React.useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase()
    const match = (haystack: string | null | undefined) =>
      !q || (haystack ?? "").toLowerCase().includes(q)

    const riderItems: PaletteItem[] =
      data?.riders
        .filter((r) => match(r.name) || match(r.phone))
        .slice(0, 15)
        .map((r) => ({
          key: `rider-${r.id}`,
          label: r.name,
          hint: r.phone,
          href: `/riders/${r.id}`,
          icon: Users,
        })) ?? []

    const deploymentItems: PaletteItem[] =
      data?.deployments
        .filter(
          (d) => match(d.rider_name) || match(d.vtd_no) || match(d.status)
        )
        .slice(0, 15)
        .map((d) => ({
          key: `dep-${d.id}`,
          label: d.rider_name ?? "Deployment",
          hint: `${d.vtd_no ?? "—"} · ${d.status}`,
          href: `/deployments/${d.id}`,
          icon: Truck,
          badge: d.action ?? undefined,
        })) ?? []

    const nav = STATIC_NAVIGATION.filter((n) => match(n.label))

    return [...nav, ...riderItems, ...deploymentItems]
  }, [data, query])

  // Keep active index in bounds when items change
  React.useEffect(() => {
    if (active >= items.length) setActive(0)
  }, [items.length, active])

  // Scroll active into view
  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${active}"]`
    )
    el?.scrollIntoView({ block: "nearest" })
  }, [active])

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, Math.max(0, items.length - 1)))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = items[active]
      if (item) {
        router.push(item.href)
        setOpen(false)
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity" />
        <Dialog.Popup className="fixed left-1/2 top-[15vh] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl outline-none data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 transition-[opacity,transform]">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="size-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search riders, deployments, or navigate…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <kbd className="hidden rounded border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                ESC
              </kbd>
            )}
          </div>

          <div
            ref={listRef}
            className="max-h-[50vh] overflow-y-auto py-2 text-sm"
          >
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                {loading ? "Searching…" : "No matches."}
              </div>
            ) : (
              items.map((it, i) => {
                const Icon = it.icon
                const isActive = i === active
                return (
                  <button
                    key={it.key}
                    type="button"
                    data-index={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      router.push(it.href)
                      setOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
                      isActive ? "bg-accent text-accent-foreground" : ""
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {it.label}
                    </span>
                    {it.hint ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {it.hint}
                      </span>
                    ) : null}
                    {it.badge ? (
                      <Badge variant="outline" className="shrink-0">
                        {it.badge.replace("_", " ")}
                      </Badge>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>

          <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground">
            <span>
              ↑↓ navigate · <kbd className="font-mono">↵</kbd> open
            </span>
            <span>
              <kbd className="font-mono">⌘K</kbd> toggle
            </span>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
