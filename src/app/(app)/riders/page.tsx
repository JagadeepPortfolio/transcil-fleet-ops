import Link from "next/link"
import { listRiders } from "@/lib/db/riders"
import { format } from "date-fns"

export const metadata = {
  title: "Riders · Transcil Fleet Ops",
}

export default async function RidersPage() {
  const riders = await listRiders()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Riders</h1>
          <p className="text-sm text-muted-foreground">
            {riders.length} rider{riders.length === 1 ? "" : "s"} on file.
          </p>
        </div>
        <Link
          href="/riders/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New rider
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Source</th>
              <th className="px-4 py-3 text-left font-medium">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {riders.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No riders yet. Add the first one with the button above.
                </td>
              </tr>
            ) : (
              riders.map((r) => (
                <tr key={r.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/riders/${r.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.source ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(r.created_at), "dd MMM yyyy")}
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
