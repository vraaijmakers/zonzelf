import type { NextConfig } from "next";

// Version is read directly off disk at request time (see src/lib/version.ts)
// rather than injected here — next.config.ts's `env` key is build-time-only
// bundle text-replacement and silently no-ops on dynamically-rendered routes.
const nextConfig: NextConfig = {
  // Self-hosted staging runs the build as a standalone Node server in
  // Docker (see Dockerfile) rather than on Vercel — this trims the output
  // to just the files that server needs.
  output: "standalone",
};

export default nextConfig;
