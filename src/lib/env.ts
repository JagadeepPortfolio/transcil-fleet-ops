import { z } from "zod"

/**
 * Env schema validated at module load time.
 * Crashes the app loudly on misconfiguration instead of failing silently
 * at the first request.
 *
 * Only NEXT_PUBLIC_* vars are safe to reference from client components.
 */
// Treat empty strings and common placeholder values in .env.local as absent.
// Optional env vars are frequently committed as empty placeholders; we don't
// want zod to choke on "".
const optionalUrl = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .pipe(z.string().url().optional())

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SENTRY_DSN: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
  APP_ENV: z.enum(["local", "preview", "production"]).default("local"),
})

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
})

const isServer = typeof window === "undefined"

const parsed = isServer
  ? serverSchema.safeParse(process.env)
  : clientSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    })

if (!parsed.success) {
  console.error(
    "Invalid environment variables:",
    parsed.error.flatten().fieldErrors
  )
  throw new Error("Invalid environment variables — see server log")
}

export const env = parsed.data
