import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * ZonZelf — version helper. Server-only (reads VERSION off disk and reads
 * plain, non-public env vars) — only import this from Server Components,
 * Server Actions, or Route Handlers.
 *
 * Single source of truth: the /VERSION file at the repo root.
 *
 * Deliberately does NOT go through next.config.ts's `env` key. That key only
 * does build-time text replacement in bundled code (see the Next.js docs,
 * next-config-js/env.md, marked `version: legacy`) — it never actually sets
 * a real process.env value. That's invisible on statically-prerendered
 * pages (the replaced literal is baked into the HTML) but silently falls
 * back to nothing on any dynamically-rendered route, which is exactly what
 * /admin/roadmap and /admin are. Reading the file directly here works identically
 * in both cases.
 *
 * Environments (APP_ENV, falling back to Vercel's VERCEL_ENV):
 *   production  → 0.1.0
 *   staging     → 0.1.0-rc
 *   development → 0.1.0-dev
 *
 * Footer (public) : clean()  → "0.1.0"     — never show an env suffix publicly
 * Admin / about   : full()   → "0.1.0-dev"
 */

type AppEnv = 'production' | 'staging' | 'development'

const SUFFIXES: Record<AppEnv, string> = {
  production: '',
  staging: '-rc',
  development: '-dev',
}

let cachedVersion: string | null = null

function base(): string {
  if (cachedVersion === null) {
    try {
      cachedVersion = readFileSync(join(process.cwd(), 'VERSION'), 'utf8').trim()
    } catch {
      cachedVersion = '0.0.0'
    }
  }
  return cachedVersion
}

function env(): AppEnv {
  const explicit = process.env.APP_ENV?.toLowerCase()
  if (explicit === 'production' || explicit === 'staging' || explicit === 'development') {
    return explicit
  }

  // Vercel sets VERCEL_ENV to production | preview | development.
  const vercel = process.env.VERCEL_ENV?.toLowerCase()
  if (vercel === 'production') {
    return 'production'
  }
  if (vercel === 'preview') {
    return 'staging'
  }

  return 'development'
}

/** Clean semantic version — always suitable for the public footer. */
export function clean(): string {
  return base()
}

/** Full version with environment suffix — for admin and about screens. */
export function full(): string {
  return `${base()}${SUFFIXES[env()]}`
}

/** Current environment, for badges and conditional admin UI. */
export function appEnv(): AppEnv {
  return env()
}
