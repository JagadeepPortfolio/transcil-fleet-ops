import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

/**
 * CMD-only admin area.
 * The (app) layout already confirmed authentication; this layout adds the
 * role check. Field staff and hub managers get redirected to /dashboard.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("app_users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.role !== "CMD") {
    redirect("/dashboard?error=cmd-only")
  }

  return <>{children}</>
}
