// THROWAWAY — temporary route to verify Sentry capture end-to-end in prod.
// Visit /api/sentry-test while logged in; it sends a test exception to Sentry
// and returns JSON. DELETE THIS FILE once capture is confirmed.
import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  // Was a real Sentry client actually initialized (i.e. did instrumentation.ts
  // run and init the server SDK)? If false, captureException is a no-op even
  // though it still returns an event id.
  const clientInitialized = Boolean(Sentry.getClient())

  const eventId = Sentry.captureException(
    new Error("Sentry test route — manual trigger (safe to ignore)")
  )
  // In serverless, flush before the function returns or the event may be
  // dropped when the invocation freezes. flush() resolves true if the queue
  // drained, false if it timed out.
  const flushed = await Sentry.flush(4000)

  return NextResponse.json({
    ok: true,
    eventId,
    clientInitialized,
    flushed,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV,
    dsnConfigured: Boolean(
      process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN
    ),
    note: "clientInitialized:false => instrumentation didn't run. flushed:false => event didn't send. Delete this route after verifying.",
  })
}
