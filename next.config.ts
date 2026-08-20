import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// VERSION at the repo root is the single source of truth for the version number.
// Read at build time so both server and client components can use it.
const version = readFileSync(join(process.cwd(), "VERSION"), "utf8").trim();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
};

export default nextConfig;
