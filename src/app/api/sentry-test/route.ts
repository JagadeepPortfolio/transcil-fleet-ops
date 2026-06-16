// THROWAWAY — temporary route to verify Sentry capture end-to-end in prod.
// Visit /api/sentry-test while logged in; it sends a test exception to Sentry
// and returns JSON. DELETE THIS FILE once capture is confirmed.
import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const eventId = Sentry.captureException(
    new Error("Sentry test route — manual trigger (safe to ignore)")
  )
  // In serverless, flush before the function returns or the event may be
  // dropped when the invocation freezes.
  await Sentry.flush(2000)

  return NextResponse.json({
    ok: true,
    eventId,
    dsnConfigured: Boolean(
      process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN
    ),
    note: "Check Sentry → Issues for 'Sentry test route'. Delete this route after verifying.",
  })
}
