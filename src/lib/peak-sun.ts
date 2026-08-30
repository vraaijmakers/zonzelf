/**
 * Peak sun hours as annual averages, with a worst-month companion.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The panel calculator offered regional presets (Netherlands 2.5h, Texas 5.5h)
 * with no label that those are ANNUAL figures. December in the Netherlands is
 * closer to 1 hour. A beginner who sizes an array on 2.5h builds a system that
 * only works in June.
 *
 * Fine as a first estimate if the page says so, and if it offers the worst
 * month as a second input so the array size becomes a band rather than a
 * single count that hides the season.
 *
 * WHAT THESE NUMBERS ARE
 * ----------------------
 * Order-of-magnitude starting points, not a site assessment. They are the
 * annual figures the page already published, plus a worst-month companion
 * in the same units (hours of equivalent full sun per day). No tilt, no
 * shading, no albedo, no horizon. A south-facing unshaded roof will do
 * better; a tree to the south will do worse.
 *
 * Sources for the worst-month companions are the well-known winter collapse
 * of GHI at mid-latitudes (NL/UK/DE December ~0.8–1.2h against ~2.5–3.0h
 * annual) and the milder winter of the US southwest and Mediterranean.
 * They are not NASA SSE lookups for a specific lat/long.
 *
 * THE TEMPERATURES, AND WHY THERE ARE TWO COLD ONES
 * -------------------------------------------------
 * String design needs temperatures, not just sunlight, because panel voltage
 * moves with temperature — see pv-string.ts. Two different cold figures are in
 * circulation and they are far apart:
 *
 *   designLowC  — the "extreme annual minimum" a site is designed against.
 *                 This is what NEC 690.7 points at (ASHRAE's extreme annual
 *                 mean minimum design dry-bulb temperature) and what a
 *                 professional would use. It is a statistical figure, not the
 *                 worst thing that has ever happened.
 *   recordLowC  — the coldest reading ever taken in the region. Colder, rarer,
 *                 and the genuinely conservative choice.
 *
 * The calculator defaults to designLowC and offers recordLowC in one click,
 * because both are defensible and the difference is worth seeing: a colder
 * figure means higher Voc means FEWER panels in series.
 *
 * A WARNING ABOUT THE RECORD FIGURES
 * ----------------------------------
 * Regional records come from frost hollows and mountains, not from where
 * people put houses. California's -43 degC is Boca, at 1,700m; Germany's
 * -37 degC is the Funtensee sinkhole. Applying either to a coastal build would
 * cut the string in half for a temperature that site will never see. Both
 * numbers here are ranges across large areas and neither is a site assessment
 * — which is why the field stays editable and the page says so plainly. This
 * is the input the calculator most needs the user to replace.
 *
 * designHighC is the hot counterpart, an extreme annual maximum. Cell
 * temperature runs well above it in full sun; pv-string.ts adds that rise.
 */

export interface PeakSunRegion {
  region: string
  /** Annual average peak sun hours. */
  annual: number
  /** Typical worst-month peak sun hours. Approximate. */
  worstMonth: number
  /** Calendar month the worst-month figure describes. */
  worstMonthName: string
  /** Extreme annual minimum for populated parts of the region, degC. */
  designLowC: number
  /** Coldest reading ever taken in the region, degC. Often a mountain. */
  recordLowC: number
  /** Extreme annual maximum, degC. */
  designHighC: number
}

export const PEAK_SUN_REGIONS: PeakSunRegion[] = [
  { region: 'Netherlands / Belgium', annual: 2.5, worstMonth: 1.0, worstMonthName: 'December', designLowC: -12, recordLowC: -27, designHighC: 35 },
  { region: 'UK / Ireland',          annual: 2.8, worstMonth: 0.9, worstMonthName: 'December', designLowC: -10, recordLowC: -27, designHighC: 33 },
  { region: 'Germany / Austria',     annual: 3.0, worstMonth: 1.0, worstMonthName: 'December', designLowC: -15, recordLowC: -37, designHighC: 37 },
  { region: 'France / Spain (N)',    annual: 4.0, worstMonth: 1.6, worstMonthName: 'December', designLowC: -10, recordLowC: -41, designHighC: 38 },
  { region: 'Spain / Italy (S)',     annual: 5.0, worstMonth: 2.5, worstMonthName: 'December', designLowC: -4, recordLowC: -20, designHighC: 42 },
  { region: 'Texas / Arizona (US)',  annual: 5.5, worstMonth: 3.5, worstMonthName: 'December', designLowC: -12, recordLowC: -31, designHighC: 45 },
  { region: 'California (US)',       annual: 5.2, worstMonth: 3.0, worstMonthName: 'December', designLowC: -4, recordLowC: -43, designHighC: 44 },
  { region: 'Florida (US)',          annual: 5.0, worstMonth: 3.4, worstMonthName: 'December', designLowC: -3, recordLowC: -19, designHighC: 37 },
  { region: 'Canada (S)',            annual: 3.5, worstMonth: 1.2, worstMonthName: 'December', designLowC: -30, recordLowC: -50, designHighC: 34 },
  { region: 'Australia (avg)',       annual: 5.5, worstMonth: 3.0, worstMonthName: 'June', designLowC: -3, recordLowC: -23, designHighC: 45 },
]

/** Fallbacks when no region has been picked. Temperate-European, and stated. */
export const DEFAULT_DESIGN_LOW_C = -12
export const DEFAULT_DESIGN_HIGH_C = 35

export const DEFAULT_ANNUAL = 3.0
export const DEFAULT_WORST_MONTH = 1.0

const clampHours = (v: number): number => {
  if (!Number.isFinite(v)) return 0
  return Math.min(12, Math.max(0, v))
}

export function normalizePeakSun(hours: number): number {
  return clampHours(hours)
}

/**
 * The region whose annual figure is unique. Spain/Italy (S) and Florida both
 * publish 5.0h, so a typed "5" is not enough to name a month.
 */
export function regionForAnnual(hours: number): PeakSunRegion | undefined {
  const matches = PEAK_SUN_REGIONS.filter(r => r.annual === hours)
  return matches.length === 1 ? matches[0] : undefined
}

/** Name a month only when both the annual and worst-month figures match a region. */
export function regionForHours(annual: number, worstMonth: number): PeakSunRegion | undefined {
  return PEAK_SUN_REGIONS.find(r => r.annual === annual && r.worstMonth === worstMonth)
}

/**
 * The single preset row to mark as selected. An exact match on both figures
 * wins; failing that, a match on the annual figure alone, but only when that
 * figure names one region. Highlighting on the annual figure alone lit both
 * Spain / Italy (S) and Florida at once, since both publish 5.0h.
 */
export function highlightedRegion(annual: number, worstMonth: number): PeakSunRegion | undefined {
  return regionForHours(annual, worstMonth) ?? regionForAnnual(annual)
}

/**
 * How much larger the array must be in the worst month than on the annual
 * average, as a ratio. 2.5 annual / 1.0 worst = 2.5×. Null when the "worst"
 * figure is not actually worse — that produced "0.8× more in December" for a
 * 6h December against a 5h annual, which is the opposite of a worst month.
 */
export function seasonalRatio(annual: number, worstMonth: number): number | null {
  const a = clampHours(annual)
  const w = clampHours(worstMonth)
  if (!(a > 0) || !(w > 0) || !(w < a)) return null
  return a / w
}

/** True when the worst-month input is actually sunnier than the annual figure. */
export function worstMonthIsSunnier(annual: number, worstMonth: number): boolean {
  const a = clampHours(annual)
  const w = clampHours(worstMonth)
  return a > 0 && w > 0 && w >= a
}
