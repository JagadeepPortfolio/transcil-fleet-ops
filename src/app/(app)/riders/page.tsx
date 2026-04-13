import Link from "next/link"
import { Plus, Users } from "lucide-react"

import { listRiders } from "@/lib/db/riders"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { RidersTable } from "@/components/tables/riders-table"

export const metadata = {
  title: "Riders · Transcil Fleet Ops",
}

export default async function RidersPage() {
  const riders = await listRiders()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riders"
        description={`${riders.length} rider${riders.length === 1 ? "" : "s"} on file.`}
        action={
          <Button render={<Link href="/riders/new" />}>
            <Plus /> New rider
          </Button>
        }
      />

      <RidersTable
        rows={riders}
        emptyState={
          <EmptyState
            icon={<Users />}
            title="No riders yet"
            description="Add your first rider to start logging deployments against them."
            action={
              <Button render={<Link href="/riders/new" />}>
                <Plus /> New rider
              </Button>
            }
          />
        }
      />
    </div>
  )
}
