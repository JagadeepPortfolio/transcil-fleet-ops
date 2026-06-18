import Link from "next/link"
import { redirect } from "next/navigation"

import { getCurrentRole } from "@/lib/auth/role"
import { listRecentAudit } from "@/lib/db/audit"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { AuditList } from "@/components/audit-list"

export const metadata = { title: "Audit log · Admin · Transcil Fleet Ops" }

const TABS = [
  { key: "", label: "All" },
  { key: "riders", label: "Riders" },
  { key: "vehicles", label: "Vehicles" },
  { key: "deployments", label: "Deployments" },
]

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { table?: string }
}) {
  if ((await getCurrentRole()) !== "CMD") redirect("/dashboard")

  const table = ["riders", "vehicles", "deployments"].includes(searchParams.table ?? "")
    ? searchParams.table
    : undefined
  const entries = await listRecentAudit({ table, limit: 300 })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Admin" }, { label: "Audit log" }]}
        title="Audit log"
        description="Recent changes to riders, vehicles and deployments — who changed what, and when. CMD-only."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = (table ?? "") === t.key
          return (
            <Button
              key={t.key}
              size="sm"
              variant={active ? "default" : "outline"}
              render={<Link href={t.key ? `/admin/audit?table=${t.key}` : "/admin/audit"} />}
            >
              {t.label}
            </Button>
          )
        })}
      </div>

      <AuditList entries={entries} showRecord />
    </div>
  )
}
