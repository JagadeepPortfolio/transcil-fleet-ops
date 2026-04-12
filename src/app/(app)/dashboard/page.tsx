import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Dashboard · Transcil Fleet Ops",
}

export default async function DashboardPage() {
  const supabase = createClient()

  // Cheap summary counts so the shell has something to show on day 1.
  const [activeRes, riderRes, vehicleRes] = await Promise.all([
    supabase
      .from("deployments")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE")
      .is("deleted_at", null),
    supabase
      .from("riders")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
  ])

  const cards = [
    { label: "Active Deployments", value: activeRes.count ?? 0 },
    { label: "Riders", value: riderRes.count ?? 0 },
    { label: "Vehicles", value: vehicleRes.count ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Operational overview. More KPI cards land with Module 8.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border bg-background p-5 shadow-sm"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {c.label}
            </div>
            <div className="mt-2 text-3xl font-semibold">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
