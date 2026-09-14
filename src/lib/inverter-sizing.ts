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
const SUNGOLD_SPH_MANUAL =
  'https://cdn.shopify.com/s/files/1/0323/4090/2025/files/SPH8-10KW_User_Manual_V1.3_20250909.pdf?v=1773649595'

export const INVERTER_PRESETS: InverterSpec[] = [
  // Sun Gold Power SPH-P series. Every figure below is from the manufacturer's
  // own SPH8-10KW User Manual V1.3, the specification tables on pages 58-59,
  // linked from sungoldpower.com/pages/user-manual and verified reachable.
  //
  // Admitted because the PV block distinguishes the two ceilings explicitly,
  // which is the thing this list exists to get right: "Max. Open Circuit
  // Voltage 500 Vdc" is the damage limit, and "MPPT Operating Voltage Range
  // 125 Vdc-425 Vdc" is the tracking window. A reader who put 500 in both
  // would lose harvest between 425 and 500 and never know why.
  //
  // "Max. Input Current 22/22 A" is per tracker on a two-tracker unit — 22 A
  // on each, not 44 A in total, and not a fraction. Recorded as 22.
  //
  // maxChargeCurrentA is the PV figure. The manual also lists a lower
  // grid/generator charge current (100 A / 120 A) and an equal hybrid figure;
  // the PV one is what the solar side of the design is limited by.
  {
    id: 'sungold-sph8048p',
    brand: 'Sun Gold Power',
    model: 'SPH8048P',
    kind: 'hybrid',
    acContinuousW: 8000,
    acSurgeW: 16000,
    dcSystemVoltage: 48,
    pvMaxInputV: 500,
    mpptMinV: 125,
    mpptMaxV: 425,
    mpptCount: 2,
    pvMaxPowerW: 11000,
    pvMaxCurrentA: 22,
    maxChargeCurrentA: 180,
    sourceUrl: SUNGOLD_SPH_MANUAL,
  },
  {
    id: 'sungold-sph10048p',
    brand: 'Sun Gold Power',
    model: 'SPH10048P',
    kind: 'hybrid',
    acContinuousW: 10000,
    acSurgeW: 20000,
    dcSystemVoltage: 48,
    pvMaxInputV: 500,
    mpptMinV: 125,
    mpptMaxV: 425,
    mpptCount: 2,
    pvMaxPowerW: 11000,
    pvMaxCurrentA: 22,
    maxChargeCurrentA: 200,
    sourceUrl: SUNGOLD_SPH_MANUAL,
  },
  // EG4 6000XP. Read directly from EG4's own spec sheet, VER 1.4.4, after a
  // PDF text extractor became available — and the reading corrected a number
  // this row was previously refused over, in the dangerous direction.
  //
  // An earlier attempt sourced "25 A per tracker" from a search index of this
  // same document. The document itself distinguishes two figures:
  //
  //     MAX. USABLE INPUT CURRENT          17/17 A
  //     MAX. SHORT CIRCUIT INPUT CURRENT   25/25 A
  //
  // The 25 A is the short-circuit rating; 17 A is what the tracker can convert.
  // Recording 25 A as the usable figure would have permitted about half again
  // as many strings in parallel as the unit can actually harvest, silently.
  // This is the whole argument for the gate, and it came within one commit of
  // being wrong on the first row.
  //
  // Surge is published as two pairs — 12,000 W for about 3.5 s and 11,000 W for
  // about 5 s. The larger, shorter figure is recorded, because a motor start is
  // a sub-second event and that is the number a start-up has to fit inside.
  //
  // MAX. CHARGE CURRENT is 125 A, footnoted "115A @ 48 VDC (AC), 125A @48 VDC
  // (PV)". The PV figure is the one the solar side is limited by.
  {
    id: 'eg4-6000xp',
    brand: 'EG4 Electronics',
    model: '6000XP',
    kind: 'hybrid',
    acContinuousW: 6000,
    acSurgeW: 12000,
    acSurgeSeconds: 3.5,
    dcSystemVoltage: 48,
    // "DC INPUT VOLTAGE RANGE 100 - 480 VDC" — the top of that range is the
    // absolute input maximum; the MPP operating range below is narrower.
    pvMaxInputV: 480,
    mpptMinV: 120,
    mpptMaxV: 385,
    mpptStartV: 100,
    mpptCount: 2,
    // "MAXIMUM UTILIZED SOLAR POWER 8000W (4000W per MPPT)". The sheet also
    // gives a "RECOMMENDED MAXIMUM SOLAR INPUT 10000W", which is deliberate
    // over-paneling guidance rather than what the unit converts — 8000 is the
    // figure an array should be checked against.
    pvMaxPowerW: 8000,
    pvMaxCurrentA: 17,
    pvMaxIscA: 25,
    maxChargeCurrentA: 125,
    sourceUrl: 'https://eg4electronics.com/wp-content/uploads/2024/04/EG4-6000XP-Inverter-Spec-Sheet.pdf',
  },
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
