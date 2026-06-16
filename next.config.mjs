import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */

// Security response headers applied to every route. These are the low-risk,
// high-value set — they don't depend on the page's inline scripts/styles, so
// they can't silently break rendering the way a strict Content-Security-Policy
// can. CSP is intentionally deferred: it needs tuning against Supabase, Sentry,
// and Next's inline bootstrap, and must be validated in a preview deploy first.
const securityHeaders = [
  // Force HTTPS for two years, including subdomains; eligible for preload.
  // Vercel already serves HTTPS, so this only hardens the browser side.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // The app is never meant to be framed — block clickjacking outright.
  { key: "X-Frame-Options", value: "DENY" },
  // Don't let browsers MIME-sniff responses into a different content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin (not the full path/query) on cross-origin navigations.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // We use file <input> uploads, not live capture — disable these APIs.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig = {
  // Required on Next 14 for instrumentation.ts to run (loads Sentry per
  // runtime). Stable / no-op on Next 15+.
  experimental: {
    instrumentationHook: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Wrap with Sentry. This injects the client config into the browser bundle and
// tree-shakes Sentry logging. Source-map upload is disabled — runtime error
// capture works without it; enable later by adding SENTRY_AUTH_TOKEN + org/
// project and flipping `sourcemaps.disable`.
export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
  disableLogger: true,
});
