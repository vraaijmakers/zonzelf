// Whether a scrape run actually worked — the question a human answers today by
// reading the console, and nobody answers once the job is on a cron.
//
// THE FAILURE THIS EXISTS TO PREVENT. Every scraper's main() ends by writing
// whatever it parsed and returning, and nothing inspects the result. A scraper
// whose source site redesigned overnight discovers zero product URLs, parses
// zero products, writes zero rows, prints "Parsed 0/0 products" and exits 0 —
// a green tick on a run that collected nothing. So does a run where every
// database write errored: gateWrite() returns 'failed' and logs to stderr, but
// no caller has ever looked at the outcomes it returns.
//
// Both are harmless while a person is watching the terminal and obviously will
// not be on a schedule. That is the same shape as the bug this scraper item
// already fixed once — the overwrite was safe in practice only because a human
// ran it and read the output — so the schedule does not go on until the run
// can say for itself that it failed. Rule 7: a silent failure is worse than a
// loud one.
//
// Pure on purpose, so it is testable with no network and no service-role key —
// the same split as battery-revision.ts, for the same reason: CI cannot have
// the key (rule 9), so anything CI must gate has to live here in src/lib.

/**
 * What a scrape did to one row.
 *
 *   inserted   — new row, unpublished, waiting in the review queue
 *   updated    — existing UNPUBLISHED row written in place (nothing live to protect)
 *   unchanged  — the source still agrees with the row; only scraped_at moved
 *   proposed   — published row, change queued in battery_model_revisions
 *   suppressed — published row, but a reviewer already rejected this exact change
 *   missing    — nothing matched (update-only scrapers)
 *   failed     — the write errored; the message is on stderr
 */
export type ScrapeOutcome =
  | 'inserted' | 'updated' | 'unchanged' | 'proposed' | 'suppressed' | 'missing' | 'failed'

export type ScrapeRun = {
  /** Names the scraper — 'eg4', 'victron', … Appears in the messages. */
  source: string
  /**
   * Candidates the source offered this run: product URLs a discovery crawl
   * found, or entries in a hand-verified list. Omit it when the scraper parses
   * records straight off a single page with no discovery step (see
   * scrape-victron.ts) and `parsed` stands for both.
   */
  discovered?: number
  /** Candidates that produced a usable record. */
  parsed: number
  /** What the writes did — one per row touched. */
  outcomes: ScrapeOutcome[]
}

export type ScrapeHealth = {
  ok: boolean
  /** Why this run must not pass. Empty when it is healthy. */
  failures: string[]
  /** Worth printing either way; never on their own a reason to fail. */
  warnings: string[]
}

/**
 * A run is UNHEALTHY when it collected nothing it was supposed to collect, or
 * when a write it attempted errored. It is NOT unhealthy merely for finding
 * nothing to change — `unchanged` across the board is the steady state for
 * specs that genuinely have not moved, and failing on it would train everyone
 * to ignore the job.
 *
 * Partial loss is a warning, not a failure: one product page 404ing is a thing
 * to look at, not a reason to redden a weekly run and bury the week it means
 * something.
 */
export function assessScrape(run: ScrapeRun): ScrapeHealth {
  const discovered = run.discovered ?? run.parsed
  const failures: string[] = []
  const warnings: string[] = []

  if (discovered === 0) {
    failures.push(
      'found nothing to scrape — the source page, collection or product list is ' +
      'empty, moved, or no longer parses',
    )
  } else if (run.parsed === 0) {
    failures.push(
      `found ${discovered} candidate(s) and parsed none — the page markup no longer matches`,
    )
  } else if (run.parsed < discovered) {
    warnings.push(
      `parsed ${run.parsed} of ${discovered} — ${discovered - run.parsed} skipped, see the log above`,
    )
  }

  // Parsed records that never reached the gate. Distinct from parsing nothing:
  // it means the write loop itself did not run.
  if (run.parsed > 0 && run.outcomes.length === 0) {
    failures.push(`parsed ${run.parsed} record(s) and wrote none`)
  }

  const failed = run.outcomes.filter(o => o === 'failed').length
  if (failed > 0) {
    failures.push(`${failed} of ${run.outcomes.length} write(s) failed — see the errors above`)
  }

  // Update-only scrapers (scrape-signaturesolar.ts) fill fields in on rows
  // another scraper created. Matching none of them means those rows are gone or
  // their sku/source_url changed — the price stops refreshing and the row keeps
  // showing last month's number, which is the affiliate line going stale in
  // silence.
  const missing = run.outcomes.filter(o => o === 'missing').length
  if (missing > 0 && missing === run.outcomes.length) {
    failures.push(
      `matched no existing row at all (${missing} lookup(s)) — the rows this scraper ` +
      'fills in are gone, or their sku/source_url changed',
    )
  } else if (missing > 0) {
    warnings.push(`${missing} record(s) matched no existing row`)
  }

  return { ok: failures.length === 0, failures, warnings }
}

/** One-line-per-item console report. Returns nothing; the caller decides the exit code. */
export function formatScrapeHealth(run: ScrapeRun, health: ScrapeHealth): string[] {
  const lines = health.warnings.map(w => `  ! ${run.source}: ${w}`)
  if (!health.ok) {
    lines.push(`  ✗ ${run.source} FAILED:`)
    lines.push(...health.failures.map(f => `      ${f}`))
  }
  return lines
}
