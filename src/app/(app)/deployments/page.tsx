import Link from "next/link"
import { Plus, Truck } from "lucide-react"

import { listDeployments } from "@/lib/db/deployments"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { DeploymentsTable } from "@/components/tables/deployments-table"

export const metadata = {
  title: "Deployments · Transcil Fleet Ops",
}

export default async function DeploymentsPage() {
  const rows = await listDeployments()

  const lockNow = rows.filter((r) => r.action === "LOCK_NOW").length
  const atRisk = rows.filter((r) => r.action === "AT_RISK").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deployments"
        description={`${rows.length} total · ${lockNow} lock now · ${atRisk} at risk, sorted by due date.`}
        action={
          <Button render={<Link href="/deployments/new" />}>
            <Plus /> New deployment
          </Button>
        }
      />

      <DeploymentsTable
        rows={rows}
        emptyState={
          <EmptyState
            icon={<Truck />}
            title="No deployments yet"
            description="Create your first deployment to see it appear here with the live action badge."
            action={
              <Button render={<Link href="/deployments/new" />}>
                <Plus /> New deployment
              </Button>
            }
          />
        }
      />
    </div>
  )
}
