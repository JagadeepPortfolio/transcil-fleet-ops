import Link from "next/link"
import { cn } from "@/lib/utils"

type NavItem = { label: string; href: string; cmdOnly?: boolean }

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Deployments", href: "/deployments" },
  { label: "Riders", href: "/riders" },
  { label: "Vehicles", href: "/admin/vehicles", cmdOnly: true },
]

export function Sidebar({
  role,
  pathname,
}: {
  role: "CMD" | "HUB_MANAGER" | "FIELD_STAFF"
  pathname?: string
}) {
  const items = NAV.filter((n) => !n.cmdOnly || role === "CMD")
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-background md:block">
      <div className="border-b px-6 py-5">
        <Link href="/dashboard" className="block">
          <div className="text-sm font-semibold">Transcil</div>
          <div className="text-xs text-muted-foreground">Fleet Ops</div>
        </Link>
      </div>
      <nav className="px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
