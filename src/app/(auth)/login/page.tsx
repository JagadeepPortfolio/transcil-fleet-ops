import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FormError } from "@/components/ui/form-fields"

export const metadata = {
  title: "Sign in · Transcil Fleet Ops",
}

async function signIn(formData: FormData) {
  "use server"

  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const next = String(formData.get("next") ?? "/dashboard")

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`
    )
  }
  redirect(next)
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string }
}) {
  const error = searchParams.error
  const next = searchParams.next ?? "/dashboard"

  return (
    <Card className="p-6">
      <div className="mb-6 space-y-1">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-xs text-muted-foreground">
          Use your email and password to access fleet operations.
        </p>
      </div>

      <div className="mb-4">
        <FormError message={error} />
      </div>

      <form action={signIn} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          inputProps={{ autoComplete: "email", placeholder: "you@example.com" }}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          inputProps={{ autoComplete: "current-password" }}
        />
        <Button type="submit" size="lg" className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Need access? Contact your CMD.
      </p>
    </Card>
  )
}
