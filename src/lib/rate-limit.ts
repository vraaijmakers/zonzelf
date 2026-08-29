// In-memory fixed-window rate limiter. Deliberately process-local, not
// Redis-backed: staging and (until a production host is chosen) any future
// deployment run a single container, so a Map survives for the process
// lifetime that matters. Revisit if ZonZelf ever runs more than one
// instance — a Map per instance would let a client get a fresh window per
// instance behind a load balancer.
const hits = new Map<string, { count: number; resetAt: number }>()

/** Returns true if the request is within the limit, false if it should be rejected. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = hits.get(key)

  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count++
  return true
}
