import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { env } from "@/lib/env"
import type { Database } from "@/lib/db/types"

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Reads session from the request cookies; writes refreshed session cookies
 * back out via next/headers.
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Called from a Server Component — cookies are read-only.
            // Middleware is what actually refreshes the session cookie.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch {
            // See note above.
          }
        },
      },
    }
  )
}
