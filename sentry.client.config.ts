// Sentry init for the browser runtime. Loaded automatically into the client
// bundle by the Sentry webpack plugin (wired via withSentryConfig in
// next.config.mjs). Stays fully inert until NEXT_PUBLIC_SENTRY_DSN is set, so
// the app behaves identically with no DSN configured.
import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
    // Capture a fraction of transactions for performance tracing. Errors are
    // always captured regardless of this rate.
    tracesSampleRate: 0.1,
    // Don't ship the (heavy) Session Replay bundle to clients by default.
    integrations: [],
  })
}
