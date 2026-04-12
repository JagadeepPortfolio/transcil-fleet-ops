import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

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
    <div className="rounded-lg border bg-background p-6 shadow-sm">
      <div className="mb-6 space-y-1">
        <h1 className="text-xl font-semibold">Transcil Fleet Ops</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your account.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <form action={signIn} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Need access? Contact your CMD.
      </p>
    </div>
  )
}
