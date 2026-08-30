/**
 * String design: how many panels in series, how many strings in parallel.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The panel calculator answered "how many panels" and stopped. That is only
 * half a design, and the missing half is the dangerous one. Twelve panels can
 * be twelve in series, or two strings of six, or three of four — same panels,
 * same cost, same daily kWh, and one of those arrangements can destroy the
 * inverter on the first cold morning.
 *
 * THE FOUR NUMBERS ON A PANEL LABEL
 * ---------------------------------
 * A panel is not sold on one voltage. It has four operating points and they
 * are all different:
 *
 *   Voc  open-circuit voltage  — nothing connected. The HIGHEST voltage it
 *                                ever produces, and the one that decides
 *                                whether an inverter survives.
 *   Vmp  voltage at max power  — what it sits at while actually working,
 *                                roughly 80-85% of Voc.
 *   Isc  short-circuit current — terminals shorted. The highest current.
 *   Imp  current at max power  — what it delivers while working.
 *
 * All four are quoted at STC: 25 degC cell, 1000 W/m2, which is a laboratory,
 * not a roof.
 *
 * SERIES ADDS VOLTS, PARALLEL ADDS AMPS
 * -------------------------------------
 * Panels in series: voltages add, current stays as one panel's. Strings in
 * parallel: currents add, voltage stays as one string's. That single sentence
 * decides everything below — series is checked against voltage limits,
 * parallel against current limits.
 *
 * TEMPERATURE, AND WHY IT IS THE WHOLE PROBLEM
 * --------------------------------------------
 * Panel voltage moves with temperature, and it moves the WRONG WAY from what
 * people expect: it goes UP as it gets colder.
 *
 *     Voc(T) = Voc_STC x [1 + betaVoc/100 x (T - 25)]
 *
 * betaVoc is the temperature coefficient of open-circuit voltage, in %/degC,
 * and it is NEGATIVE — typically -0.25 to -0.35 for a modern panel. A negative
 * coefficient times a temperature BELOW 25 degC gives a voltage ABOVE
 * nameplate. At -20 degC a panel rated 49.5V with betaVoc = -0.28 produces:
 *
 *     49.5 x [1 + (-0.28/100) x (-45)] = 55.7 V     — 12.5% over the label
 *
 * Twelve of those in series is 668V, not the 594V on the datasheet. Into a
 * 500V input, that is a destroyed inverter — and the array worked perfectly
 * all summer, which is why this failure arrives in January with no warning.
 *
 * The temperature to use is the LOWEST EXPECTED AMBIENT, not a cell
 * temperature. Voc peaks at dawn on the coldest morning: no irradiance means
 * no self-heating, so the cell is at air temperature, and an open circuit
 * before the inverter wakes is exactly when Voc is unloaded and highest.
 *
 * THE OTHER END, WHICH IS NOT A SAFETY PROBLEM
 * --------------------------------------------
 * The same physics runs the other way in summer:
 *
 *     Vmp(T_cell) = Vmp_STC x [1 + betaVmp/100 x (T_cell - 25)]
 *     T_cell ~ ambient + 25..30 degC        (panels run far above air temp)
 *
 * betaVmp is typically -0.35 to -0.45 %/degC — a LARGER magnitude than
 * betaVoc, so Vmp sags harder in heat than Voc rises in cold. A string sitting
 * just above the MPPT floor at STC drops below it on a hot afternoon and the
 * array stops harvesting, at the exact hour there is most sun to collect.
 *
 * THIS IS WHAT "USE 220V, NOT THE 100V MINIMUM" MEANS
 * ---------------------------------------------------
 * That advice is passed around as a fixed number, and it is a fixed number
 * standing in for this calculation. The tracker's stated minimum is a
 * laboratory floor; the string has to stay above it on the hottest afternoon
 * of the year, fully loaded, with a dirty array and an ageing panel. Rather
 * than repeat someone else's 220V — which is right for their panel and their
 * climate and possibly wrong for yours — this module computes Vmp at a hot
 * cell temperature and asks for a stated headroom above the floor.
 *
 * TWO CEILINGS, AND THEY ARE NOT THE SAME
 * ---------------------------------------
 *   MPPT window top   — above it the tracker clips or drops out. No harvest,
 *                       no damage. CAPACITY.
 *   Max PV input      — above it the unit is destroyed. PROTECTION.
 *
 * Datasheets often print both (120-385V window, 480V absolute). When only one
 * number is given it is the damage ceiling. Conflating them is why this module
 * carries both and never rounds up.
 *
 * PARALLEL, AND WHY THREE IS THE MAGIC NUMBER
 * -------------------------------------------
 * Each string is a source AND a fault path. If one string faults, every OTHER
 * string in parallel back-feeds current into it. With two strings the worst
 * back-feed is one string's Isc, which a panel is built to survive. With three
 * or more it is not. NEC 690.9(A): fuses are required when
 *
 *     (n_parallel - 1) x Isc x 1.25  >  module max series fuse rating
 *
 * which for ordinary panels lands exactly at three strings. The 1.25 is NEC
 * 690.8(A)(1): bright edge-of-cloud conditions push a panel above its
 * nameplate Isc.
 *
 * WHAT THIS DELIBERATELY DOES NOT MODEL
 * -------------------------------------
 * Shading and mismatch between strings, tilt and azimuth, module-level power
 * electronics (optimisers and microinverters change these rules entirely),
 * rapid shutdown (NEC 690.12), arc-fault protection, bifacial rear-side gain,
 * light-induced degradation, and the inverter's own derating at altitude or in
 * heat. Each is real; none is attempted here.
 *
 * SOURCES
 * -------
 * - NEC 690.7 — maximum PV source circuit voltage, corrected for the lowest
 *   expected ambient temperature.
 * - NEC 690.8(A)(1) — 125% of Isc for irradiance above nameplate.
 * - NEC 690.9(A) — when PV source circuits require overcurrent protection.
 * - NEC 690.9(B) / 240.6(A) — the rating of the device, and the standard
 *   sizes devices are made in.
 */

import type { ProtectionView } from './calc-register'
import { STANDARD_RATINGS } from './overcurrent'

/** Cell temperature above ambient in full sun. Panels run hot. */
export const DEFAULT_CELL_RISE_C = 30

/**
 * How far above the tracker's stated floor a string should sit at its hottest.
 * A rule of thumb, not a code requirement — and the honest form of the "use
 * 220V, not 100V" advice, because it scales with the panel and the climate
 * instead of being one number borrowed from someone else's system.
 */
export const DEFAULT_MPPT_HEADROOM = 0.25

export interface PanelSpec {
  /** Nameplate power at STC, watts. */
  wattsStc: number
  /** Open-circuit voltage at STC. The one that decides the series limit. */
  vocStc: number
  /** Voltage at maximum power, STC. */
  vmpStc: number
  /** Short-circuit current at STC. */
  iscStc: number
  /** Current at maximum power, STC. */
  impStc: number
  /** Temperature coefficient of Voc, %/degC. Negative. */
  betaVoc: number
  /** Temperature coefficient of Vmp, %/degC. Rarely published. */
  betaVmp?: number
  /** Temperature coefficient of Pmax, %/degC. The usual stand-in for betaVmp. */
  betaPmax?: number
  /** Maximum series fuse rating printed on the label. Decides string fusing. */
  maxSeriesFuseA?: number
}

/**
 * Real panel models a visitor can pick instead of typing a datasheet in.
 *
 * ADMISSION GATE — the same one INVERTER_PRESETS carries, for the same reason.
 * vocStc and betaVoc together decide a protection-register output; a wrong
 * pair here would carry the site's authority into someone's array. A row may
 * be added only when every number comes from the manufacturer's own datasheet,
 * opened and read, with a reachable sourceUrl, and panel-review.ts passes.
 *
 * Empty is the honest state until that work is done. It is not the same thing
 * as the worked example below, which claims to be nobody's product.
 */
export const PANEL_PRESETS: (PanelSpec & { brand: string; model: string; sourceUrl: string })[] = []

/**
 * A made-up panel, for learning the mechanism without a datasheet to hand.
 *
 * Deliberately NOT any real product, and the round numbers say so: 400W, 45V,
 * 37.5V. It exists because a beginner reading about cold Voc has nothing to
 * put in the fields yet, and refusing them a way to see the calculation work
 * teaches nothing. The page labels it as an example wherever it is in use and
 * never publishes it onward as if it were a chosen panel.
 */
export const EXAMPLE_PANEL: PanelSpec = {
  wattsStc: 400,
  vocStc: 45,
  vmpStc: 37.5,
  iscStc: 11.5,
  impStc: 10.7,
  betaVoc: -0.28,
  betaPmax: -0.35,
  maxSeriesFuseA: 20,
}

/** A made-up tracker, on the same terms as EXAMPLE_PANEL. */
export const EXAMPLE_TRACKER: TrackerSpec = {
  pvMaxInputV: 500,
  mpptMinV: 120,
  mpptMaxV: 450,
  pvMaxCurrentA: 25,
  pvMaxPowerW: 8000,
}

export interface TrackerSpec {
  /** Absolute maximum PV input voltage. The damage ceiling. */
  pvMaxInputV: number
  /** Bottom of the MPPT tracking window. */
  mpptMinV: number
  /** Top of the MPPT tracking window. At or below pvMaxInputV. */
  mpptMaxV: number
  /**
   * Maximum USABLE PV input current per tracker. Above this the tracker
   * cannot convert the extra, so it is clipped — a harvest limit, not a
   * damage one.
   */
  pvMaxCurrentA: number
  /**
   * Maximum SHORT-CIRCUIT input current per tracker, where the datasheet
   * states it separately. This is the damage limit, and it is materially
   * higher: the EG4 6000XP publishes 17 A usable against 25 A short-circuit.
   * Absent means the usable figure is all we have, and it is then treated as
   * the damage limit — the same conservative rule the two voltage ceilings
   * use.
   */
  pvMaxIscA?: number
  /** Maximum PV array power the unit accepts, total. */
  pvMaxPowerW: number
}

export interface SiteConditions {
  /** Lowest ambient temperature ever expected. Sets the cold Voc. */
  recordLowC: number
  /** Hottest ambient temperature expected. Sets the sagging Vmp with the rise. */
  designHighC: number
  /** Cell temperature above ambient in full sun. */
  cellRiseC?: number
}

/**
 * Open-circuit voltage at an arbitrary temperature.
 *
 * The sign trap lives here: betaVoc is negative and (T - 25) is negative on a
 * cold morning, so the product is POSITIVE and the voltage rises. Getting this
 * backwards is the single most expensive mistake in DIY solar.
 */
export function vocAtTemperature(vocStc: number, betaVoc: number, tempC: number): number {
  if (!(vocStc > 0)) return 0
  return vocStc * (1 + (betaVoc / 100) * (tempC - 25))
}

/** Voltage at maximum power at an arbitrary CELL temperature. */
export function vmpAtTemperature(vmpStc: number, betaVmp: number, cellTempC: number): number {
  if (!(vmpStc > 0)) return 0
  return Math.max(0, vmpStc * (1 + (betaVmp / 100) * (cellTempC - 25)))
}

/** Cell temperature on the hottest day: air temperature plus the sun's own rise. */
export function cellTempHot(ambientHighC: number, riseC = DEFAULT_CELL_RISE_C): number {
  return ambientHighC + riseC
}

export type VmpCoefficientSource = 'vmp' | 'pmax' | 'voc'

/**
 * Which coefficient to use for the Vmp sag, and how confident that is.
 *
 * Most datasheets publish betaVoc and betaPmax and never betaVmp. Pmax is the
 * good stand-in, because Pmax = Vmp x Imp and Imp barely moves with
 * temperature, so almost all of the Pmax coefficient IS the Vmp coefficient.
 * Falling back to betaVoc is the last resort and it UNDERSTATES the sag, which
 * is the optimistic direction — so it is reported rather than hidden.
 */
export function vmpCoefficient(panel: PanelSpec): { beta: number; from: VmpCoefficientSource } {
  if (panel.betaVmp !== undefined) return { beta: panel.betaVmp, from: 'vmp' }
  if (panel.betaPmax !== undefined) return { beta: panel.betaPmax, from: 'pmax' }
  return { beta: panel.betaVoc, from: 'voc' }
}

/**
 * Most panels in series before the string's cold Voc passes the damage
 * ceiling. Floor, never round up: one panel over is the whole failure.
 */
export function maxSeries(panel: PanelSpec, site: SiteConditions, pvMaxInputV: number): number {
  const cold = vocAtTemperature(panel.vocStc, panel.betaVoc, site.recordLowC)
  if (!(cold > 0) || !(pvMaxInputV > 0)) return 0
  return Math.floor(pvMaxInputV / cold)
}

/**
 * Fewest panels in series to stay above the tracking floor on the hottest
 * afternoon, with headroom. Ceiling, because a fraction of a panel does not
 * exist and rounding down puts the string under the floor.
 */
export function minSeries(
  panel: PanelSpec,
  site: SiteConditions,
  mpptMinV: number,
  headroom = DEFAULT_MPPT_HEADROOM,
): number {
  const { beta } = vmpCoefficient(panel)
  const hot = vmpAtTemperature(panel.vmpStc, beta, cellTempHot(site.designHighC, site.cellRiseC))
  if (!(hot > 0) || !(mpptMinV > 0)) return 0
  return Math.ceil((mpptMinV * (1 + headroom)) / hot)
}

/** Design current for a PV source circuit — NEC 690.8(A)(1). */
export const PV_IRRADIANCE_FACTOR = 1.25

/**
 * Whether parallel strings need their own fuses — NEC 690.9(A).
 *
 * With n strings in parallel, a fault in one is back-fed by the other n-1.
 * Fusing is required once that back-feed can exceed what the module is built
 * to survive, which is the max series fuse rating printed on its label.
 */
export function stringFuseRequired(
  parallel: number,
  iscStc: number,
  maxSeriesFuseA: number | undefined,
): boolean | null {
  if (maxSeriesFuseA === undefined) return null
  if (parallel <= 1) return false
  return (parallel - 1) * iscStc * PV_IRRADIANCE_FACTOR > maxSeriesFuseA
}

/**
 * Standard device ratings that may protect one string — NEC 690.9(B).
 * At or above 156% of Isc, and never above the module's own fuse rating.
 */
export function stringFuseOptions(iscStc: number, maxSeriesFuseA: number | undefined): number[] {
  if (maxSeriesFuseA === undefined) return []
  const floor = iscStc * PV_IRRADIANCE_FACTOR * 1.25
  return STANDARD_RATINGS.filter(r => r >= floor && r <= maxSeriesFuseA)
}

export interface ArrangementCheck {
  series: number
  parallel: number
  panels: number
  arrayW: number

  /** String voltage on the coldest morning. The number that destroys things. */
  vocColdV: number
  /** String voltage at STC, for comparison — what the datasheet implies. */
  vocStcV: number
  /** String working voltage on the hottest afternoon. */
  vmpHotV: number
  vmpCoefficientFrom: VmpCoefficientSource

  /** Array current before the irradiance factor. */
  arrayIscA: number
  /** After NEC 690.8(A)(1). What the tracker's limit is compared against. */
  designIscA: number

  /** vocCold exceeds the absolute maximum. PROTECTION — destroys the unit. */
  exceedsDamageCeiling: boolean
  /** vocCold is inside the unit's rating but above the tracking window. Capacity. */
  exceedsTrackingCeiling: boolean
  /** vmpHot falls under the tracking floor when hot. Capacity — no harvest. */
  belowWindow: boolean
  /** Above the floor, but with less than the headroom target. Capacity. */
  thinHeadroom: boolean
  /** designIsc exceeds the tracker's short-circuit rating. PROTECTION. */
  exceedsCurrent: boolean
  /**
   * Inside the short-circuit rating but past what the tracker can convert.
   * The current-side twin of exceedsTrackingCeiling: harvest is clipped, the
   * hardware is fine. CAPACITY.
   */
  exceedsUsableCurrent: boolean
  /** Array watts exceed what the unit accepts. Capacity — clipping. */
  exceedsPower: boolean

  /** Null when the panel's max series fuse rating is unknown. */
  stringFuseRequired: boolean | null
  stringFuseOptions: number[]

  /** No protection failure and the string tracks. */
  safe: boolean
  /** Safe, in the window with headroom, and within the power ceiling. */
  ideal: boolean
}

export function checkArrangement(
  panel: PanelSpec,
  tracker: TrackerSpec,
  site: SiteConditions,
  series: number,
  parallel: number,
  headroom = DEFAULT_MPPT_HEADROOM,
): ArrangementCheck {
  const { beta, from } = vmpCoefficient(panel)
  const vocColdV = vocAtTemperature(panel.vocStc, panel.betaVoc, site.recordLowC) * series
  const vocStcV = panel.vocStc * series
  const vmpHotV =
    vmpAtTemperature(panel.vmpStc, beta, cellTempHot(site.designHighC, site.cellRiseC)) * series

  const arrayIscA = panel.iscStc * parallel
  const designIscA = arrayIscA * PV_IRRADIANCE_FACTOR
  const arrayW = panel.wattsStc * series * parallel

  const exceedsDamageCeiling = vocColdV > tracker.pvMaxInputV
  const exceedsTrackingCeiling = !exceedsDamageCeiling && vocColdV > tracker.mpptMaxV
  const belowWindow = vmpHotV < tracker.mpptMinV
  const thinHeadroom = !belowWindow && vmpHotV < tracker.mpptMinV * (1 + headroom)
  // Mirrors the voltage pair exactly: the short-circuit rating is what breaks,
  // the usable rating is what clips. When only one is published it is the
  // damage limit, because assuming otherwise is the direction that destroys
  // hardware.
  const currentDamageLimit = tracker.pvMaxIscA ?? tracker.pvMaxCurrentA
  const exceedsCurrent = designIscA > currentDamageLimit
  const exceedsUsableCurrent = !exceedsCurrent && designIscA > tracker.pvMaxCurrentA
  const exceedsPower = arrayW > tracker.pvMaxPowerW

  const safe = !exceedsDamageCeiling && !exceedsCurrent && !belowWindow

  return {
    series, parallel,
    panels: series * parallel,
    arrayW,
    vocColdV, vocStcV, vmpHotV,
    vmpCoefficientFrom: from,
    arrayIscA, designIscA,
    exceedsDamageCeiling, exceedsTrackingCeiling, belowWindow, thinHeadroom,
    exceedsCurrent, exceedsUsableCurrent, exceedsPower,
    stringFuseRequired: stringFuseRequired(parallel, panel.iscStc, panel.maxSeriesFuseA),
    stringFuseOptions: stringFuseOptions(panel.iscStc, panel.maxSeriesFuseA),
    safe,
    ideal: safe && !thinHeadroom && !exceedsTrackingCeiling && !exceedsUsableCurrent && !exceedsPower,
  }
}

/**
 * Every arrangement worth showing for a given panel count, best first.
 *
 * Deliberately enumerated rather than solved: showing the grid, with the
 * binding constraint named on each failing row, teaches why an arrangement
 * fails. A solver that returned one answer would be the chart, not the book.
 */
export function evaluateArrangements(
  panel: PanelSpec,
  tracker: TrackerSpec,
  site: SiteConditions,
  panelCount: number,
  headroom = DEFAULT_MPPT_HEADROOM,
): ArrangementCheck[] {
  const out: ArrangementCheck[] = []
  if (!(panelCount > 0)) return out
  for (let series = 1; series <= panelCount; series++) {
    // Only whole strings: an array is not wired with a fractional string.
    if (panelCount % series !== 0) continue
    out.push(checkArrangement(panel, tracker, site, series, panelCount / series, headroom))
  }
  // Ideal first, then merely safe, then LEAST DANGEROUS.
  //
  // That last clause matters more than it looks. Sorting the failures by
  // series count put the 12-in-series arrangement — the one that destroys the
  // inverter — at the top of the list whenever nothing was safe, which is the
  // worst possible thing to show first. Failures are ordered by what they
  // violate: a string that merely sags below the window is a wasted afternoon,
  // one that exceeds the input rating is a dead inverter.
  return out.sort((a, b) => {
    if (a.ideal !== b.ideal) return a.ideal ? -1 : 1
    if (a.safe !== b.safe) return a.safe ? -1 : 1
    if (!a.safe) {
      const harm = (c: ArrangementCheck) =>
        (c.exceedsDamageCeiling ? 4 : 0) + (c.exceedsCurrent ? 2 : 0) + (c.belowWindow ? 1 : 0)
      const diff = harm(a) - harm(b)
      if (diff !== 0) return diff
    }
    return b.series - a.series
  })
}

export const PV_SOURCES = {
  voltage: 'NEC 690.7 — maximum PV voltage, corrected to the lowest expected ambient temperature',
  irradiance: 'NEC 690.8(A)(1) — 125% of Isc, because bright conditions push a panel past nameplate',
  fusing: 'NEC 690.9(A) — when parallel PV source circuits need overcurrent protection',
  device: 'NEC 240.6(A) — standard device ratings',
} as const

/**
 * Protection view for the series limit. The headline is the set of series
 * counts that stay under the damage ceiling, never a recommended one.
 */
export function stringVocProtectionView(
  panel: PanelSpec,
  tracker: TrackerSpec,
  site: SiteConditions,
): ProtectionView {
  const perPanelCold = vocAtTemperature(panel.vocStc, panel.betaVoc, site.recordLowC)
  const limit = maxSeries(panel, site, tracker.pvMaxInputV)
  const risePct = perPanelCold > 0 ? ((perPanelCold / panel.vocStc - 1) * 100) : 0
  const sources = [PV_SOURCES.voltage]

  if (limit < 1) {
    return {
      id: 'string-voc',
      title: 'Panels in series before the inverter is over its limit',
      options: [],
      empty:
        `One panel on its own reaches ${perPanelCold.toFixed(1)}V at ${site.recordLowC} degC, ` +
        `which is already past this unit's ${tracker.pvMaxInputV}V maximum. This panel and ` +
        'this inverter cannot be used together at this site.',
      steps: [],
      sources,
    }
  }

  return {
    id: 'string-voc',
    title: 'Panels in series before the inverter is over its limit',
    options: Array.from({ length: limit }, (_, i) => `${i + 1} in series`),
    empty: null,
    steps: [
      {
        title: 'Cold makes the voltage rise',
        body:
          `Voc(T) = Voc x [1 + beta/100 x (T - 25)]. At ${site.recordLowC} degC with a ` +
          `${panel.betaVoc}%/degC coefficient, a ${panel.vocStc}V panel reaches ` +
          `${perPanelCold.toFixed(1)}V — ${risePct.toFixed(1)}% over its label. The coefficient ` +
          'is negative and the temperature is below 25 degC, so the two negatives multiply to ' +
          'a voltage above nameplate.',
      },
      {
        title: 'Divide, and do not round up',
        body:
          `${tracker.pvMaxInputV}V limit / ${perPanelCold.toFixed(1)}V per panel = ` +
          `${(tracker.pvMaxInputV / perPanelCold).toFixed(2)}, so ${limit} panels in series. ` +
          `At STC those ${limit} would read ${(panel.vocStc * limit).toFixed(0)}V, which is why ` +
          'an array checked only against the datasheet looks like it has room it does not have.',
      },
      {
        title: 'Which temperature, and why that one',
        body:
          'The lowest ambient the site has seen, not an average and not a cell temperature. ' +
          'Voc peaks at dawn on the coldest morning: no sun means no self-heating, so the cell ' +
          'sits at air temperature, and an unloaded array before the inverter wakes is exactly ' +
          'when Voc is highest.',
      },
    ],
    sources,
  }
}

/**
 * Protection view for the parallel limit.
 *
 * The current-side twin of the Voc check, and worth showing beside it: series
 * is bounded by voltage, parallel by current. Same shape of answer, same
 * consequence for exceeding it.
 */
export function stringCurrentProtectionView(
  panel: PanelSpec,
  tracker: TrackerSpec,
): ProtectionView {
  const perString = panel.iscStc * PV_IRRADIANCE_FACTOR
  // Against the SHORT-CIRCUIT rating, because that is what fails. The usable
  // rating is a harvest limit and belongs in the capacity output.
  const damageLimit = tracker.pvMaxIscA ?? tracker.pvMaxCurrentA
  const limit = perString > 0 ? Math.floor(damageLimit / perString) : 0
  const usableLimit = perString > 0 ? Math.floor(tracker.pvMaxCurrentA / perString) : 0
  const sources = [PV_SOURCES.irradiance]

  if (limit < 1) {
    return {
      id: 'string-current',
      title: 'Strings in parallel before the tracker is over its current limit',
      options: [],
      empty:
        `A single string already presents ${perString.toFixed(1)}A of design current, past ` +
        `this tracker's ${damageLimit}A rating. This panel needs a tracker rated for more ` +
        'current, or a panel with a lower Isc.',
      steps: [],
      sources,
    }
  }

  return {
    id: 'string-current',
    title: 'Strings in parallel before the tracker is over its current limit',
    options: Array.from({ length: limit }, (_, i) => `${i + 1} in parallel`),
    empty: null,
    steps: [
      {
        title: 'Parallel adds current',
        body:
          `Each string presents this panel's ${panel.iscStc}A short-circuit current, whatever ` +
          'its length. Putting strings side by side adds those currents while the voltage ' +
          'stays as one string\u2019s.',
      },
      {
        title: 'A panel can beat its own nameplate',
        body:
          `${panel.iscStc}A x 1.25 = ${perString.toFixed(1)}A per string. The 25% is not a ` +
          'safety margin — bright edge-of-cloud conditions genuinely push a panel above the ' +
          'irradiance it was rated at, and the code requires designing for it.',
      },
      {
        title: 'Divide against the rating that breaks',
        body:
          `${damageLimit}A / ${perString.toFixed(1)}A = ` +
          `${(damageLimit / perString).toFixed(2)}, so ${limit} string` +
          `${limit === 1 ? '' : 's'} in parallel per tracker. A unit with more than one ` +
          'tracker gets this many on each, not this many in total.' +
          (tracker.pvMaxIscA !== undefined && tracker.pvMaxIscA > tracker.pvMaxCurrentA
            ? ` This is the SHORT-CIRCUIT rating. The same datasheet also gives a usable ` +
              `input current of ${tracker.pvMaxCurrentA}A, which is what the tracker can ` +
              `actually convert — ${usableLimit} string${usableLimit === 1 ? '' : 's'} worth. ` +
              'Between the two the extra current is clipped rather than harvested, which ' +
              'costs you output but breaks nothing.'
            : ' If your datasheet gives a separate short-circuit input rating, that is the ' +
              'one to use here — a usable-current figure is a harvest limit, not a damage one.'),
      },
    ],
    sources,
  }
}

/**
 * Protection view for parallel string fusing. Options are the device ratings
 * that may protect one string, or an explicit "no fuses required".
 */
export function stringFuseProtectionView(
  panel: PanelSpec,
  parallel: number,
): ProtectionView {
  const required = stringFuseRequired(parallel, panel.iscStc, panel.maxSeriesFuseA)
  const backfeed = (parallel - 1) * panel.iscStc * PV_IRRADIANCE_FACTOR
  const sources = [PV_SOURCES.fusing, PV_SOURCES.irradiance, PV_SOURCES.device]

  if (required === null) {
    return {
      id: 'string-fuse',
      title: `Fuses for ${parallel} parallel string${parallel === 1 ? '' : 's'}`,
      options: [],
      empty:
        'Your panel datasheet has no maximum series fuse rating entered, and that rating is ' +
        'what decides whether string fuses are needed. It is printed on the module label — ' +
        'commonly 15A or 20A. Without it this cannot be answered.',
      steps: [],
      sources,
    }
  }

  if (!required) {
    return {
      id: 'string-fuse',
      title: `Fuses for ${parallel} parallel string${parallel === 1 ? '' : 's'}`,
      options: ['No string fuses required'],
      empty: null,
      steps: [
        {
          title: 'What a string fuse protects against',
          body:
            'Each string is a source and a fault path. If one string faults, the others ' +
            'back-feed current into it. Fuses exist to stop that back-feed exceeding what the ' +
            'module is built to survive.',
        },
        {
          title: 'The arithmetic',
          body:
            parallel <= 1
              ? 'With a single string there are no other strings to back-feed it, so there is ' +
                'nothing for a fuse to interrupt.'
              : `(${parallel} - 1) strings x ${panel.iscStc}A Isc x 1.25 = ` +
                `${backfeed.toFixed(1)}A of possible back-feed, against a module rated ` +
                `${panel.maxSeriesFuseA}A. Under the rating, so no fuse is required. This is ` +
                'why one or two strings usually need none and three or more usually do. ' +
                'Combiner-box fusing may still be required for other reasons.',
        },
      ],
      sources,
    }
  }

  const options = stringFuseOptions(panel.iscStc, panel.maxSeriesFuseA)
  if (options.length === 0) {
    return {
      id: 'string-fuse',
      title: `Fuses for ${parallel} parallel strings`,
      options: [],
      empty:
        `Fuses are required at ${parallel} strings, but no standard rating fits between ` +
        `${(panel.iscStc * PV_IRRADIANCE_FACTOR * 1.25).toFixed(1)}A (156% of Isc) and the ` +
        `module's ${panel.maxSeriesFuseA}A maximum. Fewer strings per combiner is the answer, ` +
        'never a bigger fuse.',
      steps: [],
      sources,
    }
  }

  return {
    id: 'string-fuse',
    title: `Fuses for ${parallel} parallel strings`,
    options: options.map(a => `${a} A per string`),
    empty: null,
    steps: [
      {
        title: 'Why they are needed here',
        body:
          `(${parallel} - 1) strings x ${panel.iscStc}A Isc x 1.25 = ${backfeed.toFixed(1)}A ` +
          `can be back-fed into one faulted string, past the module's ${panel.maxSeriesFuseA}A ` +
          'rating. Each string gets its own fuse so a fault is isolated to that string.',
      },
      {
        title: 'Not below',
        body:
          `${(panel.iscStc * PV_IRRADIANCE_FACTOR * 1.25).toFixed(1)}A — 156% of Isc. A string ` +
          'runs at its full current for hours, so it carries the irradiance factor and the ' +
          'continuous factor both.',
      },
      {
        title: 'Not above',
        body:
          `${panel.maxSeriesFuseA}A — the maximum series fuse rating on the module label. ` +
          'Above it the fuse stops protecting the panel it is there for.',
      },
    ],
    sources,
  }
}
