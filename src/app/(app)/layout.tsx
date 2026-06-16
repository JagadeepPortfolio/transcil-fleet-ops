import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/shell/sidebar"
import { Header } from "@/components/shell/header"
import { CommandPalette } from "@/components/shell/command-palette"
import { MobileNav } from "@/components/shell/mobile-nav"

/**
 * Auth-gated shell for all /(app) routes.
 *
 * Middleware (src/middleware.ts) is the primary gate that refreshes the
 * session cookie and redirects unauthenticated users to /login. This layout
 * is the belt-and-braces check: if a request somehow reaches here without a
 * session (race at the middleware boundary, stale cache), bounce again.
 *
 * Perf: middleware already validated the JWT against the auth server (a
 * network call) on this same request, so here we read the session from the
 * cookie locally via getSession() — no extra round trip to Supabase.
 * getUser() would re-hit the auth server; given the middleware gate that's
 * redundant latency.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const user = session?.user

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
    | "TECHNICIAN"
    | "TECH_SUPERVISOR"

  return (
    <div className="flex min-h-dvh bg-muted/30">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header userEmail={user.email ?? null} role={role} />
        <main className="flex-1 overflow-x-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <CommandPalette />
      <MobileNav role={role} />
    </div>
  )
}
