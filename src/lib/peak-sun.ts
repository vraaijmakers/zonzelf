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
 * TEMPERATURES ARE NOT HERE
 * --------------------------
 * They were, briefly: designLowC/recordLowC/designHighC were bolted onto these
 * regions when the array-wiring step needed a coldest-expected figure. That was
 * wrong at this granularity — a single low for "Texas / Arizona" is out by
 * twenty degrees depending on where in Texas you stand — and it now lives in
 * site-climate.ts as ninety named places derived from thirty years of ERA5.
 * Sun hours stay regional because irradiance genuinely does vary more smoothly
 * than a cold snap does.
 */

export interface PeakSunRegion {
  region: string
  /** Annual average peak sun hours. */
  annual: number
  /** Typical worst-month peak sun hours. Approximate. */
  worstMonth: number
  /** Calendar month the worst-month figure describes. */
  worstMonthName: string
}

export const PEAK_SUN_REGIONS: PeakSunRegion[] = [
  { region: 'Netherlands / Belgium', annual: 2.5, worstMonth: 1.0, worstMonthName: 'December' },
  { region: 'UK / Ireland',          annual: 2.8, worstMonth: 0.9, worstMonthName: 'December' },
  { region: 'Germany / Austria',     annual: 3.0, worstMonth: 1.0, worstMonthName: 'December' },
  { region: 'France / Spain (N)',    annual: 4.0, worstMonth: 1.6, worstMonthName: 'December' },
  { region: 'Spain / Italy (S)',     annual: 5.0, worstMonth: 2.5, worstMonthName: 'December' },
  { region: 'Texas / Arizona (US)',  annual: 5.5, worstMonth: 3.5, worstMonthName: 'December' },
  { region: 'California (US)',       annual: 5.2, worstMonth: 3.0, worstMonthName: 'December' },
  { region: 'Florida (US)',          annual: 5.0, worstMonth: 3.4, worstMonthName: 'December' },
  { region: 'Canada (S)',            annual: 3.5, worstMonth: 1.2, worstMonthName: 'December' },
  { region: 'Australia (avg)',       annual: 5.5, worstMonth: 3.0, worstMonthName: 'June' },
]

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
