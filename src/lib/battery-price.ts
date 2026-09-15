/**
 * How old a scraped price is allowed to get before the site stops repeating it.
 *
 * WHY THIS EXISTS. A price on /calculators/battery is not a fact about a
 * battery, it is a claim about a shop on a particular day, and it decays in a
 * way voltage and capacity do not. Until 2026-09-14 nothing dated one: when
 * Signature Solar delisted the EG4 LL-S, its $1,536.99 stayed on the card,
 * multiplied into a bank total, with no way for a visitor to know the number
 * was dead — and no way for the pipeline to clear it either, because
 * diffScrapedFields() ignores a null patch value on purpose.
 *
 * Pure on purpose, like scrape-health.ts and battery-revision.ts: the decision
 * is the thing worth testing, and it must not need a database to exercise.
 */

/**
 * Prices are re-scraped weekly (.github/workflows/scrape-batteries.yml), so a
 * healthy price is at most ~7 days old. 45 days is roughly six consecutive
 * missed runs — long enough that a holiday, a transient site outage, or a
 * couple of red jobs do not pull a working price off the shelf, short enough
 * that a genuinely abandoned one stops being repeated within about six weeks.
 *
 * Deliberately not tighter: hiding a price costs the affiliate line, which is
 * the primary revenue line, and a failing scrape already turns the weekly job
 * red. This is the backstop for when nobody acts on that, not the first alarm.
 */
export const PRICE_MAX_AGE_DAYS = 45

const MS_PER_DAY = 86_400_000

export type PriceDisplay =
  /** No price was ever captured, or an operator cleared it. */
  | { kind: 'none' }
  /** Dated, and too old to repeat. The card says so rather than going silent. */
  | { kind: 'stale'; ageDays: number }
  /**
   * A price from before price_scraped_at existed. Shown without an "as of"
   * line: the project does not know the date, and inventing one from
   * scraped_at is the exact bug this module was written for. Self-resolves on
   * the next successful scrape of that row.
   */
  | { kind: 'undated'; price: number }
  /** Confirmed recently enough to repeat, with the date it was confirmed. */
  | { kind: 'dated'; price: number; asOf: Date; ageDays: number }

/**
 * Decides what a card may say about one row's price.
 *
 * `now` is injected so the boundary is testable; callers pass nothing.
 */
export function priceDisplay(
  priceUsd: number | null | undefined,
  priceScrapedAt: string | Date | null | undefined,
  now: Date = new Date(),
): PriceDisplay {
  if (priceUsd == null || !Number.isFinite(priceUsd) || priceUsd <= 0) {
    return { kind: 'none' }
  }

  if (priceScrapedAt == null) return { kind: 'undated', price: priceUsd }

  const asOf = priceScrapedAt instanceof Date ? priceScrapedAt : new Date(priceScrapedAt)
  // An unparseable timestamp is a data problem, not a reason to assert a date.
  // Fall back to the undated shape rather than showing "as of Invalid Date".
  if (Number.isNaN(asOf.getTime())) return { kind: 'undated', price: priceUsd }

  // A clock-skewed future date is not evidence of freshness, but it is also
  // not staleness — treat it as zero days old and let it display.
  const ageDays = Math.max(0, Math.floor((now.getTime() - asOf.getTime()) / MS_PER_DAY))

  if (ageDays > PRICE_MAX_AGE_DAYS) return { kind: 'stale', ageDays }
  return { kind: 'dated', price: priceUsd, asOf, ageDays }
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

/**
 * "14 Sep 2026" — day before month, so there is no 09/14 vs 14/09 ambiguity
 * for a site with both US and EU readers.
 *
 * Built by hand rather than with toLocaleDateString because this renders in
 * the visitor's browser and is asserted in a Node test: month names vary with
 * the ICU build (en-GB gives "Sept" on some, "Sep" on others), so a locale
 * call would let the test and the page disagree. Read in UTC for the same
 * reason — the instant is UTC, and a local-time read would make the rendered
 * date depend on the reader's offset.
 */
export function formatAsOf(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}
