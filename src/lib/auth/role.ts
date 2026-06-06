import { createClient } from "@/lib/supabase/server"

export type AppRole = "CMD" | "HUB_MANAGER" | "FIELD_STAFF"

/**
 * Current user's app role, for server-side role gating in pages/actions.
 *
 * Reads the user id from the session cookie (local, no auth-server round trip —
 * middleware already validated it) then one query for the role. Returns null if
 * unauthenticated or no app_users row.
 */
export async function getCurrentRole(): Promise<AppRole | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) return null

  const { data } = await supabase
    .from("app_users")
    .select("role")
    .eq("id", uid)
    .maybeSingle()

  return ((data as { role?: AppRole } | null)?.role ?? null) as AppRole | null
}
