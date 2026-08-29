import type { NextConfig } from "next";

// Version is read directly off disk at request time (see src/lib/version.ts)
// rather than injected here — next.config.ts's `env` key is build-time-only
// bundle text-replacement and silently no-ops on dynamically-rendered routes.
const nextConfig: NextConfig = {
  // Self-hosted staging runs the build as a standalone Node server in
  // Docker (see Dockerfile) rather than on Vercel — this trims the output
  // to just the files that server needs.
  output: "standalone",

  // Staging itself is plain HTTP behind nginx (VPN-only, no cert) — browsers
  // only honor Strict-Transport-Security over an HTTPS connection in the
  // first place, so it's a harmless no-op there and takes effect once
  // production is on HTTPS (Cloudflare). Content-Security-Policy is
  // deliberately not here yet: it needs an inventory of every script/style/
  // font origin the app actually loads (Supabase, fonts, Anthropic calls are
  // server-side only) to write without silently breaking something, and
  // that audit hasn't been done.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
