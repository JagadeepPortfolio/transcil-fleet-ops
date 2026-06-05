import { format, parseISO } from "date-fns"

/**
 * Single source of truth for how dates are shown in the UI: "12 Mar 2026".
 *
 * Accepts a `YYYY-MM-DD` date string (e.g. deploy_date / due_date / event_date)
 * or a full ISO timestamp (e.g. created_at). Date-only strings are parsed via
 * `parseISO`, which yields local midnight and avoids the off-by-one day shift
 * you get from `new Date("2026-03-12")` (which is UTC midnight).
 *
 * Returns an em dash for null/empty so callers don't need their own fallback.
 */
export function formatDate(value?: string | null): string {
  if (!value) return "—"
  const d = value.length === 10 ? parseISO(value) : new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return format(d, "dd MMM yyyy")
}
