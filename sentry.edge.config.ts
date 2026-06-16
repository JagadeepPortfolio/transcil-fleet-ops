// Sentry init for the Edge runtime — middleware.ts runs here. Loaded by
// instrumentation.ts when NEXT_RUNTIME is "edge". Inert until a DSN is set.
import * as Sentry from "@sentry/nextjs"

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  })
}
