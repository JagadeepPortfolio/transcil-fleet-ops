import Link from "next/link"
import { notFound } from "next/navigation"
import { getRider } from "@/lib/db/riders"
import { createClient } from "@/lib/supabase/server"
import { format } from "date-fns"

export const metadata = {
  title: "Rider · Transcil Fleet Ops",
}

export default async function RiderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const rider = await getRider(params.id)
  if (!rider) notFound()

  // Show this rider's deployments from the enriched view.
  const supabase = createClient()
  const { data: deployments } = await supabase
    .from("deployments_enriched")
    .select(
      "id, deploy_date, due_date, weeks, rate_inr, status, pay_status, balance, vtd_no, hub_name"
    )
    .eq("rider_id", rider.id)
    .order("deploy_date", { ascending: false })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{rider.name}</h1>
          <p className="text-sm text-muted-foreground">
            {rider.phone} · {rider.source ?? "—"}
          </p>
        </div>
        <Link
          href="/riders"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to list
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard label="Address" value={rider.address ?? "—"} />
        <InfoCard
          label="Added"
          value={format(new Date(rider.created_at), "dd MMM yyyy")}
        />
        <InfoCard
          label="Photo"
          value={rider.photo_url ?? "Not uploaded"}
          mono
        />
        <InfoCard
          label="ID proof"
          value={rider.id_proof_url ?? "Not uploaded"}
          mono
        />
      </div>

      {rider.notes ? (
        <div className="rounded-lg border bg-background p-5">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            Notes
          </div>
          <div className="mt-2 whitespace-pre-wrap text-sm">{rider.notes}</div>
        </div>
      ) : null}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Deployments</h2>
          <Link
            href={`/deployments/new?rider=${rider.id}`}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            New deployment
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Deploy</th>
                <th className="px-3 py-2 text-left font-medium">Due</th>
                <th className="px-3 py-2 text-left font-medium">VTD</th>
                <th className="px-3 py-2 text-left font-medium">Hub</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!deployments || deployments.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-xs text-muted-foreground"
                  >
                    No deployments yet.
                  </td>
                </tr>
              ) : (
                deployments.map((d: Record<string, unknown>) => (
                  <tr key={d.id as string} className="hover:bg-muted/40">
                    <td className="px-3 py-2">{d.deploy_date as string}</td>
                    <td className="px-3 py-2">{d.due_date as string}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {(d.vtd_no as string) ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {(d.hub_name as string) ?? "—"}
                    </td>
                    <td className="px-3 py-2">{d.status as string}</td>
                    <td className="px-3 py-2">
                      {(d.pay_status as string) ?? "—"}
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

function InfoCard({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-sm ${mono ? "font-mono text-xs break-all" : ""}`}
      >
        {value}
      </div>
    </div>
  )
}
