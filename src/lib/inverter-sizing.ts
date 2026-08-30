/**
 * Inverter sizing, and the PV specifications the array is designed against.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The chain went load -> battery -> panels and produced a panel count with
 * nothing between it and the hardware. Two separate failures came out of that
 * gap, and they are not the same kind of failure:
 *
 *   1. CAPACITY. Motor surge was a sidebar paragraph on the load calculator and
 *      never entered a number, so nothing in the flow sized the inverter. "Why
 *      did my inverter shut down when the well pump started" is the most common
 *      beginner failure and the site did not teach it.
 *
 *   2. PROTECTION. The panel page said how many panels to buy and nothing about
 *      how to wire them. A string is designed against a specific tracker's
 *      voltage window, so the array cannot be designed at all until the unit is
 *      chosen. That check lives in pv-string.ts; this file is what feeds it.
 *
 * Both are why the inverter step now sits BEFORE panels rather than after.
 *
 * THE TWO NUMBERS AN INVERTER IS SOLD ON
 * --------------------------------------
 * CONTINUOUS is what it carries all day. SURGE (or "peak") is what it carries
 * for a few seconds while a motor starts, typically twice continuous for 5 to
 * 20 seconds. A unit can be comfortably big on one and short on the other, and
 * the surge column is the one people skip.
 *
 * THE SIZING RULE
 * ---------------
 *     continuous demand = every running load at once
 *     surge demand      = continuous demand + the largest SINGLE start-up
 *
 * The second line is the part worth arguing about. Adding every appliance's
 * surge together sizes for every motor in the house starting in the same
 * half-second, which does not happen and produces an absurd inverter. Adding
 * only the largest single start-up on top of everything already running is the
 * standard method and the one an electrician would use.
 *
 * The first line is deliberately pessimistic in the other direction: it assumes
 * nothing is ever off. Whether the dryer really runs while the air conditioning
 * and the oven do is the user's call, not something this module should guess —
 * inventing a diversity factor is how the fridge duty-cycle bug happened. The
 * page states the assumption and lets people take rows out.
 *
 * WHY GUESSING HIGH IS SAFE HERE
 * ------------------------------
 * An oversized inverter costs money and idles a little less efficiently. An
 * undersized one shuts down mid-shower. That asymmetry is the opposite of the
 * battery calculator's, where oversizing is the expensive mistake, so the
 * conservative direction is not the same on every page.
 *
 * WHAT THIS DOES NOT MODEL
 * ------------------------
 * Power factor (VA against W) for reactive loads, split-phase balance across
 * two legs, idle/no-load draw over a day, high-altitude or high-temperature
 * derating of the inverter itself, and generator or grid pass-through. All
 * real; none attempted here.
 */

import {
  normalizeSurge, rowRunningWatts, rowSurgeHeadroomWatts, type ApplianceRow,
} from './appliance-load'

/** A load row with the display name the calculator page carries. */
export type NamedLoad = ApplianceRow & { name?: string }

export interface PeakDemand {
  /** Every load running at the same moment, watts. */
  continuousW: number
  /** Extra watts the single hardest start-up asks for on top of that. */
  surgeHeadroomW: number
  /** continuousW + surgeHeadroomW — what the surge column has to cover. */
  surgeW: number
  /** The appliance whose start-up set the surge figure. Null when nothing surges. */
  driver: { name: string; watts: number; surge: number } | null
  /** The single biggest running load, for the "one thing at a time" sanity check. */
  largestSingleW: number
}

/**
 * Continuous and surge demand for a set of loads.
 *
 * Surge is the largest single start-up added to everything already running —
 * see the file header for why it is not the sum of every surge.
 */
export function peakDemand(rows: NamedLoad[]): PeakDemand {
  let continuousW = 0
  let largestSingleW = 0
  let surgeHeadroomW = 0
  let driver: PeakDemand['driver'] = null

  for (const row of rows) {
    const running = rowRunningWatts(row)
    continuousW += running
    largestSingleW = Math.max(largestSingleW, running)

    const headroom = rowSurgeHeadroomWatts(row)
    if (headroom > surgeHeadroomW) {
      surgeHeadroomW = headroom
      driver = {
        name: row.name?.trim() || 'this appliance',
        watts: Math.max(0, row.watts || 0),
        surge: normalizeSurge(row.surge),
      }
    }
  }

  return {
    continuousW,
    surgeHeadroomW,
    surgeW: continuousW + surgeHeadroomW,
    driver,
    largestSingleW,
  }
}

/**
 * Headroom to leave over the continuous figure.
 *
 * Not a code requirement and not a physical constant — an inverter running at
 * its own limit all day runs hot, ages faster and has nothing left for the load
 * you add next year. A rule of thumb, labelled as one wherever it surfaces.
 */
export const CONTINUOUS_HEADROOM = 0.25

// ---------------------------------------------------------------------------
// The unit itself
// ---------------------------------------------------------------------------

/**
 * What kind of box this is. DIY off-grid is dominated by all-in-one hybrids,
 * where the inverter, the MPPT charge controller and the battery charger share
 * one case — which is why the array step reads its tracker specs from whatever
 * is chosen here rather than asking for the same product twice.
 */
export type InverterKind = 'hybrid' | 'inverter-only' | 'charge-controller'

export interface InverterSpec {
  id: string
  brand: string
  model: string
  kind: InverterKind

  /** Continuous AC output, watts. */
  acContinuousW: number
  /**
   * Peak output while a motor starts, watts. OPTIONAL, and it is worth saying
   * why: plenty of datasheets do not print a surge column at all. Leaving it
   * undefined makes the page say the figure is unstated, which is the true and
   * useful answer — inventing a "2x continuous" default would hide exactly the
   * gap the buyer needs to go and close.
   */
  acSurgeW?: number
  /** How long the surge figure is held. Datasheets quote 5, 10 or 20 seconds. */
  acSurgeSeconds?: number
  /** Nominal DC battery voltage the unit runs at. */
  dcSystemVoltage: number

  /**
   * ABSOLUTE maximum PV input voltage. The damage ceiling: above this the unit
   * is destroyed, not merely unhappy. A string's cold-morning Voc is checked
   * against this and nothing else.
   */
  pvMaxInputV: number
  /** Bottom of the MPPT tracking window. Below it the tracker cannot work. */
  mpptMinV: number
  /**
   * Top of the MPPT tracking window. Often BELOW pvMaxInputV: between the two
   * the tracker clips or drops out but survives. When a datasheet gives only
   * one number, it is the damage ceiling and this equals pvMaxInputV.
   */
  mpptMaxV: number
  /** Voltage needed to wake the tracker, where stated separately from mpptMinV. */
  mpptStartV?: number
  /** Independent trackers. Each has its own window and its own current limit. */
  mpptCount: number

  /** Maximum PV array the unit accepts, watts, total across all trackers. */
  pvMaxPowerW: number
  /** Maximum PV input current per tracker, amps. */
  pvMaxCurrentA: number
  /** Maximum PV short-circuit current per tracker, amps, where stated. */
  pvMaxIscA?: number
  /** Maximum DC current into the battery, amps. */
  maxChargeCurrentA?: number

  /**
   * The MANUFACTURER's own datasheet or spec page. Never a retailer listing —
   * a reseller's spec table is a transcription, and transcriptions of these
   * numbers are how an inverter gets destroyed. See the Discover Energy
   * correction in supabase/migrations/20260826000005_*.sql for the precedent.
   */
  sourceUrl: string
}

/**
 * Units a visitor can pick instead of typing a datasheet in by hand.
 *
 * ADMISSION GATE — read before adding a row.
 * Every field here is either read straight into a protection-register
 * calculation or used to reject an arrangement that would destroy hardware.
 * A wrong pvMaxInputV in this list is worse than no list at all, because it
 * carries the site's authority. So a row may be added only when:
 *
 *   1. Every number comes from the manufacturer's own datasheet or spec page,
 *      opened and read — not a retailer's spec table, not a marketplace
 *      listing, not a summary.
 *   2. sourceUrl points at that page, and it is reachable.
 *   3. pvMaxInputV and mpptMaxV are distinguished. If the datasheet publishes
 *      one number, set both to it and treat it as the damage ceiling.
 *   4. inverter-review.ts passes on the row.
 *
 * Typing the specs in by hand is a first-class path on the page, not a
 * fallback, precisely so this list never has to be padded out to be useful.
 */
export const INVERTER_PRESETS: InverterSpec[] = [
  // Empty on purpose. The EG4 6000XP was worked up as the first candidate and
  // is NOT admitted: its AC continuous (6,000W), battery voltage (48V), max PV
  // input (480VDC), MPPT count (2), max PV power (8,000W) and max charge
  // current (125A) were read off EG4's own product page, but the two fields
  // that matter most here — the 120-385VDC optimal MPPT window and the 25A per
  // tracker — came from a search index of the spec-sheet PDF rather than from
  // the PDF itself, which no tool on the build machine could extract. Gate
  // condition 1 says opened and read, not summarised, and the first row is a
  // bad place to start making exceptions.
  //
  // To finish it: install a PDF text extractor, read
  // eg4electronics.com/wp-content/uploads/2024/04/EG4-6000XP-Inverter-Spec-Sheet.pdf,
  // confirm those two numbers and the surge column, then add the row.
]

// ---------------------------------------------------------------------------
// Does the unit cover the load?
// ---------------------------------------------------------------------------

export type FitVerdict = 'ok' | 'tight' | 'short' | 'unknown'

export interface InverterFit {
  continuous: FitVerdict
  surge: FitVerdict
  /** Continuous rating as a multiple of continuous demand. 1.0 is exactly enough. */
  continuousRatio: number
  /** Surge rating as a multiple of surge demand. Null when unstated. */
  surgeRatio: number | null
  /** Continuous watts wanted once headroom is allowed for. */
  wantedContinuousW: number
}

function verdict(ratio: number, target: number): FitVerdict {
  if (!Number.isFinite(ratio) || ratio < 1) return 'short'
  return ratio < target ? 'tight' : 'ok'
}

/**
 * How a unit stands against the demand. Three states rather than pass/fail:
 * "tight" is a real and common answer, and collapsing it into either of the
 * other two loses the only information the user can act on.
 */
export function inverterFit(
  spec: Pick<InverterSpec, 'acContinuousW' | 'acSurgeW'>,
  demand: PeakDemand,
): InverterFit {
  const continuousRatio = demand.continuousW > 0
    ? spec.acContinuousW / demand.continuousW
    : Number.POSITIVE_INFINITY
  const surgeRatio = spec.acSurgeW === undefined
    ? null
    : demand.surgeW > 0
      ? spec.acSurgeW / demand.surgeW
      : Number.POSITIVE_INFINITY

  return {
    continuous: verdict(continuousRatio, 1 + CONTINUOUS_HEADROOM),
    // Surge is a few seconds, not a duty. Covering it at all is the bar; there
    // is no headroom convention to hold it to.
    surge: surgeRatio === null ? 'unknown' : verdict(surgeRatio, 1),
    continuousRatio,
    surgeRatio,
    wantedContinuousW: demand.continuousW * (1 + CONTINUOUS_HEADROOM),
  }
}

/** Standard AC continuous ratings inverters are actually sold in, watts. */
export const COMMON_INVERTER_SIZES = [
  600, 1000, 1500, 2000, 3000, 3500, 4000, 5000, 6000, 6500, 8000, 10000, 12000, 15000,
] as const

/** The smallest common size that carries the continuous demand with headroom. */
export function suggestedContinuousW(demand: PeakDemand): number | null {
  const wanted = demand.continuousW * (1 + CONTINUOUS_HEADROOM)
  return COMMON_INVERTER_SIZES.find(w => w >= wanted) ?? null
}

export const INVERTER_SIZING_SOURCE =
  'Continuous demand assumes every load runs at once, which overestimates unless your ' +
  'house really does. Surge adds the single hardest start-up on top of that, not every ' +
  'start-up at once, because motors do not start in the same half-second. The ' +
  `${Math.round(CONTINUOUS_HEADROOM * 100)}% headroom on the continuous figure is a rule of ` +
  'thumb for heat and future load, not a code requirement.'
