/**
 * How long a written claim may stand before somebody has to look at it again.
 *
 * WHY THIS EXISTS. src/lib/battery-price.ts already makes this argument for a
 * number in a database: "a price is not a fact about a battery, it is a claim
 * about a shop on a particular day, and it decays in a way voltage and
 * capacity do not." Prose decays the same way and had nothing equivalent —
 * grepping src/app/guides on 2026-09-16 found ONE dated claim across twelve
 * guides, in one-ground-system, and no mechanism anywhere that could notice a
 * guide had gone stale. The site's oldest guides have been asserting things
 * about tariffs, code editions and hardware since August with nobody obliged
 * to re-read them.
 *
 * THE DISTINCTION THAT MAKES THIS TRACTABLE, and the reason this is not just
 * "re-read everything quarterly": claims do not decay at one rate.
 *
 *   - STRUCTURAL claims decay in years or not at all. "The US pays roughly
 *     three times Australia's installed price, and the cause is soft costs
 *     rather than hardware" survives every price move that motivated writing
 *     it down. These need no review date and get none — a review interval on
 *     a claim that cannot go stale is noise that trains people to ignore the
 *     alarm.
 *   - CITED claims decay when the source changes: a statute, a code edition,
 *     a manufacturer datasheet. They are stable for months and then wrong all
 *     at once, so they carry a citation and a re-check interval.
 *   - LIVE claims decay in days. Those must never be typed into prose at all;
 *     they render from a dated source through battery-price.ts, which already
 *     expires them. This module deliberately cannot express one, so that the
 *     only way to put a live number on a page stays the one that expires.
 *
 * WHAT THIS MODULE IS NOT. It does not check whether a claim is still TRUE —
 * nothing here reads a statute or fetches a datasheet, and it must not be
 * described as if it did. It tracks when a human last confirmed one, and says
 * so out loud on the page and in CI. That is a smaller promise, and it is one
 * the repo can actually keep.
 *
 * Pure on purpose, like battery-price.ts and scrape-health.ts: the decision is
 * the thing worth testing, and it must not need a database, a network or a
 * browser to exercise. scripts/check-content-freshness.ts and the guide pages
 * read the same functions, so CI and the reader cannot disagree.
 */

const MS_PER_DAY = 86_400_000

/**
 * How stale a claim may get before the page stops presenting it as current.
 *
 * `warn` is when CI starts asking; `stale` is when the PAGE changes what it
 * says. The gap between them is the window in which somebody can re-check a
 * claim before a visitor is told it is unverified.
 *
 * DELIBERATELY WIDER THAN PRICE_MAX_AGE_DAYS (45). A price has an automated
 * re-scrape behind it, so 45 days is roughly six missed runs. Re-reading a
 * statute is manual work by one maintainer, and an alarm that fires faster
 * than anyone can answer it is an alarm that gets muted.
 */
export interface ReviewCadence {
  warn: number
  stale: number
}

/**
 * Tariffs, tax law, incentive programmes. The fastest-moving thing a guide is
 * allowed to assert in prose, and the reason this file exists: the Section 232
 * import floor and the expiry of 26 U.S.C. 25D are both live disputes whose
 * next move is not on a schedule anyone controls.
 */
export const CADENCE_POLICY: ReviewCadence = { warn: 90, stale: 180 }

/**
 * Electrical code editions, manufacturer datasheets, product line-ups. NEC
 * runs on a three-year cycle and a datasheet is revised when the product is,
 * so a year between reads is not negligence — but two is.
 */
export const CADENCE_TECHNICAL: ReviewCadence = { warn: 365, stale: 550 }

/**
 * Physics, arithmetic, and how the site's own calculators work. Reviewed
 * because the SITE changes underneath the sentence, not because the world
 * does — a guide describing a seven-step chain is wrong the day the chain
 * becomes eight steps.
 */
export const CADENCE_EVERGREEN: ReviewCadence = { warn: 550, stale: 900 }

export type ClaimKind = 'policy' | 'technical' | 'evergreen'

export const CADENCE_FOR: Record<ClaimKind, ReviewCadence> = {
  policy: CADENCE_POLICY,
  technical: CADENCE_TECHNICAL,
  evergreen: CADENCE_EVERGREEN,
}

/**
 * One assertion somebody is on the hook for re-reading.
 *
 * `source` is required and is not decoration. A claim nobody can re-check has
 * no meaningful review date: the next maintainer would have to re-derive where
 * the number came from before they could confirm it, which is the work the
 * citation exists to save. The admission gate on INVERTER_PRESETS makes the
 * same demand of a spec row for the same reason.
 */
export interface Claim {
  /** Stable id, unique within its page. Used by CI to name what is overdue. */
  id: string
  /** What is being asserted, in the words a maintainer would re-check. */
  statement: string
  kind: ClaimKind
  /** ISO date (YYYY-MM-DD) a human last confirmed this against the source. */
  checkedOn: string
  /** Where it was confirmed: a statute, a datasheet, a code section. */
  source: string
  /** Optional URL for the source, when it has a public one. */
  sourceUrl?: string
  /**
   * A date this claim is KNOWN to change, when one is published in advance.
   *
   * The Section 232 floor takes effect 4 Dec 2026; the 25D credit already
   * ended 31 Dec 2025. A tariff with a published effective date is the one
   * case where staleness is not a function of how long ago somebody looked —
   * a claim checked yesterday is still wrong the morning after its date
   * passes. Set this and the review comes due then, however fresh the check.
   */
  changesOn?: string
}

export type ClaimFreshness =
  /**
   * Confirmed recently enough that the page may state it plainly.
   *
   * `dueInDays` counts to whichever comes FIRST: the review interval lapsing,
   * or a published change date arriving. Reporting only the interval would
   * have understated every claim carrying a changesOn — the Section 232 floor
   * lands 4 Dec 2026 but its 90-day policy interval does not lapse until the
   * 14th, so a report quoting the interval alone tells you to look ten days
   * after the thing has already happened.
   */
  | { kind: 'current'; ageDays: number; dueInDays: number }
  /** CI should ask, but the page says nothing different yet. */
  | { kind: 'due'; ageDays: number; overdueDays: number }
  /** The page must now say this is unverified rather than assert it. */
  | { kind: 'stale'; ageDays: number; overdueDays: number }
  /**
   * A published effective date has passed since the last check. Ranks above
   * stale because it is not a guess about decay — the source itself said the
   * ground would move on this date, and it has.
   */
  | { kind: 'superseded'; ageDays: number; changedOn: Date }
  /** The date does not parse. A data problem, never silently treated as fresh. */
  | { kind: 'unknown' }

/** UTC midnight of an ISO date, or null. Never throws on operator input. */
function parseIsoDate(iso: string | null | undefined): Date | null {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Decides what a page may say about one claim.
 *
 * `now` is injected so the boundaries are testable; callers pass nothing.
 */
export function claimFreshness(claim: Claim, now: Date = new Date()): ClaimFreshness {
  const checked = parseIsoDate(claim.checkedOn)
  if (checked === null) return { kind: 'unknown' }

  // A future checkedOn is a typo, not evidence of freshness. Treat it as today
  // rather than as a claim that will not come due for a year — the same call
  // battery-price.ts makes about a clock-skewed scrape timestamp.
  const ageDays = Math.max(0, Math.floor((now.getTime() - checked.getTime()) / MS_PER_DAY))

  // Checked BEFORE a known change date that has since passed. Order matters:
  // this outranks the age test, because re-checking on the day a tariff lands
  // is exactly the case where age says "fine" and the world says otherwise.
  const changesOn = parseIsoDate(claim.changesOn)
  if (changesOn !== null && now >= changesOn && checked < changesOn) {
    return { kind: 'superseded', ageDays, changedOn: changesOn }
  }

  const cadence = CADENCE_FOR[claim.kind] ?? CADENCE_POLICY
  if (ageDays > cadence.stale) {
    return { kind: 'stale', ageDays, overdueDays: ageDays - cadence.stale }
  }
  if (ageDays > cadence.warn) {
    return { kind: 'due', ageDays, overdueDays: ageDays - cadence.warn }
  }

  const untilInterval = cadence.warn - ageDays
  const untilChange =
    changesOn === null
      ? Number.POSITIVE_INFINITY
      : Math.ceil((changesOn.getTime() - now.getTime()) / MS_PER_DAY)
  return { kind: 'current', ageDays, dueInDays: Math.max(0, Math.min(untilInterval, untilChange)) }
}

/** Does this need a human before the page can go on asserting it plainly? */
export function needsReview(f: ClaimFreshness): boolean {
  return f.kind === 'due' || f.kind === 'stale' || f.kind === 'superseded' || f.kind === 'unknown'
}

/**
 * Does the PAGE have to change what it says, as opposed to CI asking quietly?
 *
 * The gap between this and needsReview is the whole point of two thresholds:
 * a maintainer is nagged for months before a visitor is ever shown a caveat
 * the maintainer could have removed by spending ten minutes on the source.
 */
export function mustCaveat(f: ClaimFreshness): boolean {
  return f.kind === 'stale' || f.kind === 'superseded' || f.kind === 'unknown'
}
