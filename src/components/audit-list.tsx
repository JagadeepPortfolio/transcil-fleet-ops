import { formatDateTime } from "@/lib/dates"
import { Card } from "@/components/ui/card"
import type { AuditEntry } from "@/lib/db/audit"

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—"
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

const TABLE_LABEL: Record<string, string> = {
  riders: "Rider",
  vehicles: "Vehicle",
  deployments: "Deployment",
}

/** Renders audit entries. With showRecord, also shows the table/record (for the global screen). */
export function AuditList({
  entries,
  showRecord = false,
}: {
  entries: AuditEntry[]
  showRecord?: boolean
}) {
  if (entries.length === 0) {
    return <Card className="p-4 text-sm text-muted-foreground">No changes recorded.</Card>
  }
  return (
    <Card className="divide-y">
      {entries.map((e) => (
        <div key={e.id} className="p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">
              {e.action === "INSERT" ? "Created" : e.action === "DELETE" ? "Deleted" : "Edited"}
              {showRecord ? (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {TABLE_LABEL[e.table_name] ?? e.table_name}{" "}
                  <span className="font-mono">{e.row_id.slice(0, 8)}</span>
                </span>
              ) : null}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatDateTime(e.changed_at)} · {e.actor_name ?? "—"}
            </span>
          </div>
          {e.action === "UPDATE" && e.changes ? (
            <ul className="mt-1 space-y-0.5">
              {Object.entries(e.changes).map(([field, c]) => (
                <li key={field} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{field}</span>: {fmt(c.old)} → {fmt(c.new)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </Card>
  )
}
