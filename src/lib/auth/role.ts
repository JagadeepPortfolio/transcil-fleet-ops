import { createClient } from "@/lib/supabase/server"

export type AppRole =
  | "CMD"
  | "HUB_MANAGER"
  | "FIELD_STAFF"
  | "TECHNICIAN"
  | "TECH_SUPERVISOR"

/** Roles allowed to work repairs + view inventory. */
export const TECH_ROLES: AppRole[] = ["CMD", "TECH_SUPERVISOR", "TECHNICIAN"]
/** Roles allowed to manage inventory (add parts, adjust stock, factory returns). */
export const INVENTORY_MANAGER_ROLES: AppRole[] = ["CMD", "TECH_SUPERVISOR"]

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

/**
 * Current user's id, role, and hub — for hub-scoped inserts (repairs, inventory
 * movements) where RLS scopes reads but writes need an explicit hub_id.
 */
export async function getCurrentUserContext(): Promise<{
  id: string
  role: AppRole | null
  hubId: number | null
} | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) return null

  const { data } = await supabase
    .from("app_users")
    .select("role, hub_id")
    .eq("id", uid)
    .maybeSingle()

  const row = data as { role?: AppRole; hub_id?: number | null } | null
  return { id: uid, role: row?.role ?? null, hubId: row?.hub_id ?? null }
}
