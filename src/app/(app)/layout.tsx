import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/shell/sidebar"
import { Header } from "@/components/shell/header"

/**
 * Auth-gated shell for all /(app) routes.
 *
 * Middleware (src/middleware.ts) is the primary gate that refreshes the
 * session cookie and redirects unauthenticated users to /login. This layout
 * is the belt-and-braces check: if a request somehow reaches here without a
 * session (race at the middleware boundary, stale cache), bounce again.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("app_users")
    .select("role, full_name, hub_id")
    .eq("id", user.id)
    .maybeSingle()

  const role = (profile?.role ?? "FIELD_STAFF") as
    | "CMD"
    | "HUB_MANAGER"
    | "FIELD_STAFF"

  return (
    <div className="flex min-h-dvh bg-muted/30">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header userEmail={user.email ?? null} role={role} />
        <main className="flex-1 overflow-x-auto p-6">{children}</main>
      </div>
    </div>
  )
}
