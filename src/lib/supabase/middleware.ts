import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { env } from "@/lib/env"
import type { Database } from "@/lib/db/types"

/**
 * Session refresh helper for top-level middleware.
 *
 * Runs on every request, reads the session cookie, refreshes if needed,
 * and writes the refreshed cookie onto the outgoing response. Without this,
 * server components would eventually see stale / expired sessions.
 *
 * Returns the NextResponse to forward; callers may further mutate it
 * (e.g. redirects).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  // Triggers the session refresh. Don't remove — see comment above.
  const { data: { user } } = await supabase.auth.getUser()

  // Unauthenticated users hitting protected pages → bounced to login.
  // Allow-list public routes explicitly.
  const { pathname } = request.nextUrl
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    pathname === "/favicon.ico"

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return response
}
