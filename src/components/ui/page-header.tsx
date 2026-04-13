import * as React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Breadcrumb {
  label: string
  href?: string
}

export interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Breadcrumb[]
  /** Primary action rendered on the right (desktop) / below (mobile). */
  action?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          {breadcrumbs.map((b, i) => {
            const isLast = i === breadcrumbs.length - 1
            return (
              <React.Fragment key={`${b.label}-${i}`}>
                {b.href && !isLast ? (
                  <Link
                    href={b.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-foreground" : undefined}>
                    {b.label}
                  </span>
                )}
                {!isLast && <ChevronRight className="size-3" />}
              </React.Fragment>
            )
          })}
        </nav>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
