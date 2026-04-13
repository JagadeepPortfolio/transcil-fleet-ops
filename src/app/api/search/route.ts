import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Minimal global search feed for the Cmd+K palette.
 *
 * Returns two small lists (riders + deployments) that the client filters
 * locally. Safe because:
 *  - RLS is enforced on both tables — each user only sees their slice.
 *  - The result set is the same data the user already sees in /riders and
 *    /deployments, just concatenated.
 *
 * If the dataset ever grows past ~5k rows we'll paginate or push filtering
 * server-side; until then, local filtering gives zero-latency feedback on
 * every keystroke.
 */
export async function GET() {
  const supabase = createClient()

  const [ridersRes, deploymentsRes] = await Promise.all([
    supabase
      .from("riders")
      .select("id, name, phone")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("deployments_enriched")
      .select("id, rider_name, vtd_no, status, action")
      .order("due_date", { ascending: true }),
  ])

  return NextResponse.json({
    riders: ridersRes.data ?? [],
    deployments: deploymentsRes.data ?? [],
  })
}
