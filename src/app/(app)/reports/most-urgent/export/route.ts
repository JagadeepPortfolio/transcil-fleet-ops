import { getMostUrgent } from "@/lib/db/reports"
import { formatDate } from "@/lib/dates"

// CSV export of the Most Urgent list (overdue active deployments). UTF-8 BOM so
// Excel renders names correctly; same columns/order/sort as the on-screen table.
export async function GET() {
  const rows = await getMostUrgent()

  const headers = ["Rider Name", "EC No", "Due Date", "Days left", "Customer Mobile No"]
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const lines = [headers.join(",")]
  for (const r of rows) {
    lines.push(
      [r.rider_name, r.ec_no, formatDate(r.due_date), r.days_left, r.phone]
        .map(esc)
        .join(",")
    )
  }
  const BOM = "﻿"
  const csv = BOM + lines.join("\r\n")

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="most-urgent-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
