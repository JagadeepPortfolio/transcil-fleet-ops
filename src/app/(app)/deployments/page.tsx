import Link from "next/link"
import { listDeployments } from "@/lib/db/deployments"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "Deployments · Transcil Fleet Ops",
}

const ACTION_STYLES: Record<string, string> = {
  LOCK_NOW: "bg-destructive/10 text-destructive border-destructive/30",
  AT_RISK: "bg-amber-100 text-amber-900 border-amber-200",
  CALL_TODAY: "bg-blue-100 text-blue-900 border-blue-200",
  UPCOMING: "bg-muted text-muted-foreground border-border",
  OK: "bg-emerald-100 text-emerald-900 border-emerald-200",
}

const PAY_STYLES: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-900",
  PARTIAL: "bg-amber-100 text-amber-900",
  OVERDUE: "bg-destructive/10 text-destructive",
  PENDING: "bg-muted text-muted-foreground",
}

export default async function DeploymentsPage() {
  const rows = await listDeployments()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Deployments</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} deployment{rows.length === 1 ? "" : "s"}, sorted by
            due date.
          </p>
        </div>
        <Link
          href="/deployments/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New deployment
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-3 text-left font-medium">Action</th>
              <th className="px-3 py-3 text-left font-medium">Rider</th>
              <th className="px-3 py-3 text-left font-medium">Phone</th>
              <th className="px-3 py-3 text-left font-medium">VTD</th>
              <th className="px-3 py-3 text-left font-medium">Hub</th>
              <th className="px-3 py-3 text-left font-medium">Deploy</th>
              <th className="px-3 py-3 text-left font-medium">Due</th>
              <th className="px-3 py-3 text-right font-medium">Days left</th>
              <th className="px-3 py-3 text-left font-medium">Status</th>
              <th className="px-3 py-3 text-left font-medium">Pay</th>
              <th className="px-3 py-3 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No deployments yet. Create the first one.
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr key={d.id} className="hover:bg-muted/40">
                  <td className="px-3 py-2">
                    {d.action ? (
                      <span
                        className={cn(
                          "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase",
                          ACTION_STYLES[d.action] ?? ""
                        )}
                      >
                        {d.action.replace("_", " ")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/deployments/${d.id}`}
                      className="font-medium hover:underline"
                    >
                      {d.rider_name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {d.rider_phone ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {d.vtd_no ?? "—"}
                  </td>
                  <td className="px-3 py-2">{d.hub_name ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{d.deploy_date}</td>
                  <td className="px-3 py-2 text-xs">{d.due_date}</td>
                  <td className="px-3 py-2 text-right text-xs">
                    {d.days_left ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{d.status}</td>
                  <td className="px-3 py-2">
                    {d.pay_status ? (
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                          PAY_STYLES[d.pay_status] ?? ""
                        )}
                      >
                        {d.pay_status}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {d.balance != null ? `₹${d.balance.toLocaleString("en-IN")}` : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
