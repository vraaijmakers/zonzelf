/**
 * ZonZelf — version helper.
 *
 * Single source of truth: the /VERSION file at the repo root, injected at build
 * time by next.config.ts.
 *
 * Environments (NEXT_PUBLIC_APP_ENV, falling back to Vercel's VERCEL_ENV):
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

function base(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'
}

function env(): AppEnv {
  const explicit = process.env.NEXT_PUBLIC_APP_ENV?.toLowerCase()
  if (explicit === 'production' || explicit === 'staging' || explicit === 'development') {
    return explicit
  }

  // Vercel sets VERCEL_ENV to production | preview | development.
  const vercel = process.env.NEXT_PUBLIC_VERCEL_ENV?.toLowerCase()
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
