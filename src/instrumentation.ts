// Next.js instrumentation hook — runs once per runtime at startup. We use it
// to load the correct Sentry init for the active runtime.
//
// IMPORTANT: this project uses a `src/` directory, so Next.js looks for this
// file at `src/instrumentation.ts` (NOT the project root). The sentry.*.config
// files live at the repo root, hence the `../` import paths. Requires
// `experimental.instrumentationHook: true` in next.config.mjs on Next 14.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config")
  }
}
