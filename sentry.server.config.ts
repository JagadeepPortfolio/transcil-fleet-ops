// Sentry init for the Node.js (server) runtime — Server Components, Server
// Actions, route handlers. Loaded by instrumentation.ts when NEXT_RUNTIME is
// "nodejs". Inert until a DSN is configured.
import * as Sentry from "@sentry/nextjs"

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  })
}
