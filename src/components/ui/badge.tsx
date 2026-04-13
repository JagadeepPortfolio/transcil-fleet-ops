import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-border bg-muted text-muted-foreground",
        outline: "border-border bg-background text-foreground",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive",
        warning:
          "border-warning/40 bg-warning/15 text-warning-foreground dark:text-warning",
        info: "border-info/40 bg-info/15 text-info-foreground dark:text-info",
        success:
          "border-success/40 bg-success/15 text-success-foreground dark:text-success",
        muted: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// ----------------------------------------------------------------------------
// Domain-specific wrappers — single source of truth for colors across the app.
// Add a new status here, get it right everywhere.
// ----------------------------------------------------------------------------

const ACTION_VARIANT: Record<
  string,
  VariantProps<typeof badgeVariants>["variant"]
> = {
  LOCK_NOW: "destructive",
  AT_RISK: "warning",
  CALL_TODAY: "info",
  UPCOMING: "muted",
  OK: "success",
}

export function ActionBadge({ action }: { action: string | null | undefined }) {
  if (!action) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <Badge variant={ACTION_VARIANT[action] ?? "default"}>
      {action.replace("_", " ")}
    </Badge>
  )
}

const PAY_VARIANT: Record<
  string,
  VariantProps<typeof badgeVariants>["variant"]
> = {
  PAID: "success",
  PARTIAL: "warning",
  OVERDUE: "destructive",
  PENDING: "muted",
}

export function PayStatusBadge({
  status,
}: {
  status: string | null | undefined
}) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>
  return <Badge variant={PAY_VARIANT[status] ?? "default"}>{status}</Badge>
}

const DEPLOYMENT_VARIANT: Record<
  string,
  VariantProps<typeof badgeVariants>["variant"]
> = {
  ACTIVE: "info",
  RETURNED: "muted",
  LOCKED: "destructive",
  CANCELLED: "muted",
}

export function DeploymentStatusBadge({
  status,
}: {
  status: string | null | undefined
}) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>
  return <Badge variant={DEPLOYMENT_VARIANT[status] ?? "default"}>{status}</Badge>
}

const LOCK_VARIANT: Record<
  string,
  VariantProps<typeof badgeVariants>["variant"]
> = {
  "Not Locked": "muted",
  Locked: "destructive",
  Unlocked: "success",
}

export function LockStatusBadge({
  status,
}: {
  status: string | null | undefined
}) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>
  return <Badge variant={LOCK_VARIANT[status] ?? "default"}>{status}</Badge>
}
