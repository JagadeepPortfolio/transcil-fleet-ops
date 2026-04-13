import { LogOut } from "lucide-react"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CommandPaletteTrigger } from "@/components/shell/command-palette-trigger"

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
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Badge variant={role === "CMD" ? "info" : "muted"}>
          {roleLabel(role)}
        </Badge>
      </div>
      <div className="hidden flex-1 justify-center md:flex">
        <CommandPaletteTrigger />
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {userEmail}
        </span>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut /> Sign out
          </Button>
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
