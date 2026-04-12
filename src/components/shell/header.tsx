import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

async function signOut() {
  "use server"
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export function Header({
  userEmail,
  role,
}: {
  userEmail: string | null
  role: string
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="text-sm font-medium text-muted-foreground">
        {roleLabel(role)}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{userEmail}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  )
}

function roleLabel(role: string) {
  switch (role) {
    case "CMD":
      return "CMD · full access"
    case "HUB_MANAGER":
      return "Hub Manager"
    case "FIELD_STAFF":
      return "Field Staff"
    default:
      return role
  }
}
