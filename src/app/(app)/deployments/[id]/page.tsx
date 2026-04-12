import Link from "next/link"
import { notFound } from "next/navigation"
import { getDeployment } from "@/lib/db/deployments"
import { listActivityForDeployment } from "@/lib/db/activity-log"

export const metadata = {
  title: "Deployment · Transcil Fleet Ops",
}

export default async function DeploymentDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const d = await getDeployment(params.id)
  if (!d) notFound()

  const log = await listActivityForDeployment(params.id)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {d.rider_name ?? "Deployment"}
          </h1>
          <p className="text-sm text-muted-foreground">
            VTD {d.vtd_no ?? "—"} · {d.hub_name ?? "—"}
          </p>
        </div>
        <Link
          href="/deployments"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to list
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Status" value={d.status} />
        <InfoCard
          label="Action"
          value={d.action ? d.action.replace("_", " ") : "—"}
        />
        <InfoCard label="Pay status" value={d.pay_status ?? "—"} />
        <InfoCard
          label="Days left"
          value={d.days_left != null ? String(d.days_left) : "—"}
        />
        <InfoCard label="Deploy date" value={d.deploy_date} />
        <InfoCard label="Due date" value={d.due_date} />
        <InfoCard label="Weeks" value={String(d.weeks)} />
        <InfoCard
          label="Rate"
          value={`₹${Number(d.rate_inr).toLocaleString("en-IN")}/wk`}
        />
        <InfoCard
          label="Deposit required"
          value={`₹${Number(d.deposit_required_inr).toLocaleString("en-IN")}`}
        />
        <InfoCard
          label="Total due"
          value={
            d.total_due != null
              ? `₹${Number(d.total_due).toLocaleString("en-IN")}`
              : "—"
          }
        />
        <InfoCard
          label="Total paid"
          value={
            d.total_paid != null
              ? `₹${Number(d.total_paid).toLocaleString("en-IN")}`
              : "—"
          }
        />
        <InfoCard
          label="Balance"
          value={
            d.balance != null
              ? `₹${Number(d.balance).toLocaleString("en-IN")}`
              : "—"
          }
        />
      </div>

      {d.notes ? (
        <div className="rounded-lg border bg-background p-5">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            Notes
          </div>
          <div className="mt-2 whitespace-pre-wrap text-sm">{d.notes}</div>
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 text-lg font-semibold">Activity log</h2>
        <div className="overflow-hidden rounded-lg border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-3 py-2 text-left font-medium">Event</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium">Txn ID</th>
                <th className="px-3 py-2 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {log.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-xs text-muted-foreground"
                  >
                    No activity yet. Payments and state changes land here when
                    Module 4 ships.
                  </td>
                </tr>
              ) : (
                log.map((e: Record<string, unknown>) => (
                  <tr key={e.id as string}>
                    <td className="px-3 py-2 text-xs">
                      {e.event_date as string}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {e.event_type as string}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {e.amount_inr != null
                        ? `₹${Number(e.amount_inr).toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {(e.transaction_id as string) ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {(e.notes as string) ?? ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  )
}
