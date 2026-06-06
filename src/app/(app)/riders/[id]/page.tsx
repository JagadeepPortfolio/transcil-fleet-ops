import Link from "next/link"
import { notFound } from "next/navigation"
import { formatDate } from "@/lib/dates"
import { ArrowLeft, Plus, StickyNote } from "lucide-react"

import { getRider } from "@/lib/db/riders"
import { createClient } from "@/lib/supabase/server"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import {
  DeploymentStatusBadge,
  PayStatusBadge,
} from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

  const supabase = createClient()
  const { data: deployments } = await supabase
    .from("deployments_enriched")
    .select(
      "id, deployment_code, deploy_date, due_date, weeks, rate_inr, status, pay_status, balance, vtd_no, hub_name"
    )
    .eq("rider_id", rider.id)
    .order("deploy_date", { ascending: false })

  const rows = (deployments ?? []) as Array<{
    id: string
    deployment_code: string | null
    deploy_date: string
    due_date: string
    vtd_no: string | null
    hub_name: string | null
    status: string
    pay_status: string | null
  }>

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Riders", href: "/riders" },
          { label: rider.name },
        ]}
        title={rider.name}
        description={`${rider.phone} · ${rider.source ?? "—"}${rider.app_rider_id ? ` · Rider ID: ${rider.app_rider_id}` : ""}`}
        action={
          <Button variant="ghost" render={<Link href="/riders" />}>
            <ArrowLeft /> Back
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard label="Current location" value={rider.current_location ?? "—"} />
        <InfoCard label="Purpose" value={rider.purpose ?? "—"} />
        <InfoCard
          label="Alt contact"
          value={
            rider.alt_contact_name || rider.alt_contact_number
              ? `${rider.alt_contact_name ?? "—"}${
                  rider.alt_contact_number ? ` · ${rider.alt_contact_number}` : ""
                }`
              : "—"
          }
        />
        <InfoCard label="Address" value={rider.address ?? "—"} />
        <InfoCard
          label="Added"
          value={formatDate(rider.created_at)}
        />
        <InfoCard label="Added by" value={rider.created_by_name ?? "—"} />
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
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <StickyNote className="size-3.5" /> Notes
          </div>
          <div className="mt-2 whitespace-pre-wrap text-sm">{rider.notes}</div>
        </Card>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Deployments</h2>
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/deployments/new?rider=${rider.id}`} />}
          >
            <Plus /> New deployment
          </Button>
        </div>
        <TableContainer className="max-h-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Deploy</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>VTD</TableHead>
                <TableHead>Hub</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-xs text-muted-foreground"
                  >
                    No deployments yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link
                        href={`/deployments/${d.id}`}
                        className="font-mono text-xs font-medium hover:underline"
                      >
                        {d.deployment_code ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(d.deploy_date)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(d.due_date)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {d.vtd_no ?? "—"}
                    </TableCell>
                    <TableCell>{d.hub_name ?? "—"}</TableCell>
                    <TableCell>
                      <DeploymentStatusBadge status={d.status} />
                    </TableCell>
                    <TableCell>
                      <PayStatusBadge status={d.pay_status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
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
    <Card className="p-4">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-sm ${mono ? "break-all font-mono text-xs" : ""}`}
      >
        {value}
      </div>
    </Card>
  )
}
