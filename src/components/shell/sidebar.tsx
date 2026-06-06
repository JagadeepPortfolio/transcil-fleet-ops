"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Bike, CircleHelp, LayoutDashboard, Truck, Users } from "lucide-react"

import { cn } from "@/lib/utils"

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  cmdOnly?: boolean
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Riders", href: "/riders", icon: Users },
  { label: "Vehicles", href: "/admin/vehicles", icon: Bike },
  { label: "Deployments", href: "/deployments", icon: Truck },
  { label: "Reports", href: "/reports", icon: BarChart3 },
]

export function Sidebar({
  role,
}: {
  role: "CMD" | "HUB_MANAGER" | "FIELD_STAFF"
}) {
  const pathname = usePathname() ?? ""
  const items = NAV.filter((n) => !n.cmdOnly || role === "CMD")

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/transcil-icon.png"
            alt=""
            width={28}
            height={28}
            className="size-6 object-contain"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Transcil</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Fleet Ops
            </div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="border-t px-3 py-3">
        <Link
          href="/help"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/help")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          )}
        >
          <CircleHelp className={cn("size-4 shrink-0", pathname.startsWith("/help") ? "text-foreground" : "text-muted-foreground")} />
          Help & Guide
        </Link>
      </div>
    </aside>
  )
}
