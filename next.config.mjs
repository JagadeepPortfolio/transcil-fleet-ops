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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
