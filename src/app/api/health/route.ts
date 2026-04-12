import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Minimal DB health check.
 * - Pings Supabase with a trivially-scoped query
 * - Returns 200 when reachable, 503 otherwise
 *
 * Usable from Vercel cron, uptime monitors, load balancers.
 */
export async function GET() {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from("hubs")
      .select("id", { head: true, count: "exact" })
      .limit(1)
    if (error) throw error
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        ts: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
