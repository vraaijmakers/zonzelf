// Which panel COUNTS can actually be wired — the question step 4 cannot ask
// and step 5 answers one count at a time.
//
// THE GAP THIS FILLS. Panel sizing rounds up from an energy target to a whole
// number of panels. Array wiring has to split that number into whole strings
// that fit a voltage window and a per-tracker current limit. The two can
// simply not meet: system-design.ts already reports the disagreement, and its
// resolution says "go up to the next count that wires cleanly" — without
// saying which count that is. The array page is worse: when nothing fits it
// says "a different panel, a bigger unit, or splitting the array across more
// trackers are the ways out; a bigger array on the same box is not." For the
// SG550WM against an SPH10048P at -25.9 degC that last clause is FALSE. Eleven
// panels has no safe arrangement and twelve does, on the same box.
//
// WHY A COUNT FAILS, and it is not parity. Scanning that pairing gives
// 6, 7, 8, 10, 12, 14 and 16 wirable and 9, 11, 13, 15, 17, 18 not — which
// looks like "odd counts fail" only if you start at nine. Seven wires fine as
// one string of seven. What is actually going on is that a count can only be
// wired as its FACTOR PAIRS: 11 is prime, so it is 11x1 or 1x11, and on this
// unit one is too tall for the 500 V input while the other is too wide for the
// 22 A tracker. Nine and fifteen do have middle factors and still fail, on
// current. And above sixteen nothing fits at all, whatever it factors into.
//
// So this module reports the SET, never a rule. Parity is offered only as an
// observation about the window actually examined, for the caller to phrase
// with its bounds attached — the same discipline as the protection register:
// show which options pass, do not invent a law.

import {
  evaluateArrangements,
  type ArrangementCheck,
  type PanelSpec,
  type SiteConditions,
  type TrackerSpec,
} from './pv-string'

/** What stops every arrangement at one count. */
export type Blocker =
  /** A string tall enough to exceed the PV input rating. Destroys the unit. */
  | 'voltage'
  /** More current into one tracker than it is rated for. */
  | 'current'
  /** The string sags under the tracking floor when hot. No harvest. */
  | 'window'
  /** Different arrangements hit different limits — the classic prime-count trap. */
  | 'mixed'

export interface CountOption {
  panels: number
  arrayW: number
  /** Every whole-string arrangement of this count, best first. */
  arrangements: ArrangementCheck[]
  /** Ideal if there is one, else merely safe, else null. */
  best: ArrangementCheck | null
  /** At least one arrangement is safe. */
  wirable: boolean
  /** At least one arrangement is safe, tracks with headroom and does not clip. */
  clean: boolean
  /** Null when this count is wirable. */
  blockedBy: Blocker | null
  /**
   * How many ways this count factors into whole strings. One means the count
   * is prime (or 1): the array can only be a single string or a single row,
   * and nothing in between. That is the whole reason prime counts fail first.
   */
  ways: number
  /** Fraction of the energy target this count delivers. Null without a target. */
  ofTarget: number | null
}

export interface GranularityMap {
  /** The count energy sizing asked for, when the panel step has published one. */
  target: number | null
  /** Whether that target count can be wired. Null when there is no target. */
  targetWirable: boolean | null
  /** Every count examined, ascending. */
  options: CountOption[]
  /** Just the counts that wire, ascending. */
  wirableCounts: number[]
  /** Nearest wirable count at or above the target. */
  nearestAtOrAbove: number | null
  /** Nearest wirable count strictly below the target. */
  nearestBelow: number | null
  /**
   * The largest count in the scan that wires. Above it nothing fits on this
   * unit at all — a real ceiling, and one no single-count view can show.
   */
  ceiling: number | null
  /**
   * 'even' or 'odd' when EVERY wirable count in the scanned window has that
   * parity and at least one count of the other parity was examined and failed.
   * An observation about this window, not a law — the caller must state the
   * bounds it was found in. Null whenever the window contains a
   * counterexample.
   */
  parity: 'even' | 'odd' | null
  /** Bounds actually examined, so a caller can qualify what it says. */
  from: number
  to: number
}

function blockerFor(arrangements: ArrangementCheck[]): Blocker | null {
  if (arrangements.length === 0) return null
  const kinds = new Set<Blocker>()
  for (const a of arrangements) {
    // Ordered by harm, matching evaluateArrangements' own sort: a string that
    // exceeds the input rating kills the unit, one that sags wastes an
    // afternoon. Attribute each arrangement to the worst thing it does.
    if (a.exceedsDamageCeiling) kinds.add('voltage')
    else if (a.exceedsCurrent) kinds.add('current')
    else if (a.belowWindow) kinds.add('window')
  }
  if (kinds.size === 0) return null
  if (kinds.size > 1) return 'mixed'
  return [...kinds][0]
}

/**
 * Scan a range of panel counts against one panel and one tracker.
 *
 * `target` is the count the energy step asked for; it only shapes the window
 * and the nearest-wirable answers, never whether a count passes.
 */
export function panelCountMap(
  panel: PanelSpec,
  tracker: TrackerSpec,
  site: SiteConditions,
  opts: { target?: number | null; from?: number; to?: number } = {},
): GranularityMap {
  const target = opts.target && opts.target > 0 ? Math.floor(opts.target) : null

  // Scan far enough to find the ceiling, which is the finding a caller cannot
  // get any other way. The power limit sets the scale: past the point where
  // the array is half again the unit's PV input rating there is nothing left
  // to learn, and the loop is cheap either way.
  const byPower = Math.ceil((tracker.pvMaxPowerW * 1.5) / Math.max(1, panel.wattsStc))
  const from = Math.max(1, opts.from ?? 1)
  const to = Math.min(120, Math.max(opts.to ?? 0, target ? target + 8 : 0, byPower, from + 1))

  const options: CountOption[] = []
  for (let n = from; n <= to; n++) {
    const arrangements = evaluateArrangements(panel, tracker, site, n)
    const best = arrangements.find(a => a.ideal) ?? arrangements.find(a => a.safe) ?? null
    const wirable = arrangements.some(a => a.safe)
    options.push({
      panels: n,
      arrayW: panel.wattsStc * n,
      arrangements,
      best,
      wirable,
      clean: arrangements.some(a => a.ideal),
      blockedBy: wirable ? null : blockerFor(arrangements),
      ways: arrangements.length,
      ofTarget: target ? n / target : null,
    })
  }

  const wirableCounts = options.filter(o => o.wirable).map(o => o.panels)
  const ceiling = wirableCounts.length ? wirableCounts[wirableCounts.length - 1] : null

  let parity: 'even' | 'odd' | null = null
  if (wirableCounts.length > 0) {
    const allEven = wirableCounts.every(n => n % 2 === 0)
    const allOdd = wirableCounts.every(n => n % 2 === 1)
    // Requiring a failed counterexample of the other parity stops a window
    // that simply contains no odd counts from reading as a rule about them.
    const failedOdd = options.some(o => !o.wirable && o.panels % 2 === 1)
    const failedEven = options.some(o => !o.wirable && o.panels % 2 === 0)
    if (allEven && failedOdd) parity = 'even'
    else if (allOdd && failedEven) parity = 'odd'
  }

  return {
    target,
    targetWirable: target === null ? null : wirableCounts.includes(target),
    options,
    wirableCounts,
    nearestAtOrAbove: target === null ? null : wirableCounts.find(n => n >= target) ?? null,
    nearestBelow:
      target === null ? null : [...wirableCounts].reverse().find(n => n < target) ?? null,
    ceiling,
    parity,
    from,
    to,
  }
}

/**
 * The slice worth putting on screen: the target, a little context below it,
 * and enough above to reach the next count that works.
 *
 * Deliberately not the whole scan. The scan runs past the ceiling so the
 * ceiling can be found; showing thirty rows of "does not fit" would bury the
 * two counts the reader actually has to choose between.
 */
export function windowAround(map: GranularityMap, target: number | null, span = 4): CountOption[] {
  if (target === null) return map.options.slice(0, span * 2)
  const upTo = Math.max(target + span, map.nearestAtOrAbove ?? target)
  return map.options.filter(o => o.panels >= Math.max(1, target - span) && o.panels <= upTo)
}
