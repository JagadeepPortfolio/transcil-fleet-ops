"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Bike, LayoutDashboard, Package, Search, Truck, Users, Wrench } from "lucide-react"

import { cn } from "@/lib/utils"

type Role = "CMD" | "HUB_MANAGER" | "FIELD_STAFF" | "TECHNICIAN" | "TECH_SUPERVISOR"

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  cmdOnly?: boolean
  roles?: Role[]
}

const ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Riders", href: "/riders", icon: Users },
  { label: "Vehicles", href: "/admin/vehicles", icon: Bike },
  { label: "Deploys", href: "/deployments", icon: Truck },
  { label: "Repairs", href: "/repairs", icon: Wrench },
  { label: "Stock", href: "/inventory", icon: Package, roles: ["CMD", "TECH_SUPERVISOR", "TECHNICIAN"] },
  { label: "Reports", href: "/reports", icon: BarChart3 },
]

/**
 * Bottom-fixed tab bar for mobile (hidden at md+). Mirrors the sidebar nav
 * with shorter labels so icons stay legible. A dedicated Search tab triggers
 * the global Cmd+K palette so the same muscle memory works on touch.
 */
export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname() ?? ""
  const items = ITEMS.filter(
    (n) => (!n.cmdOnly || role === "CMD") && (!n.roles || n.roles.includes(role))
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch border-t bg-background/95 backdrop-blur md:hidden">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        )
      })}
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(
            new KeyboardEvent("keydown", { key: "k", metaKey: true })
          )
        }}
        className="flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
      >
        <Search className="size-5" />
        Search
      </button>
    </nav>
  )
}
