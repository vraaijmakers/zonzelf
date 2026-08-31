/**
 * The site temperatures a string is designed against.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Panel Voc rises as it gets colder, so the coldest temperature a site can see
 * is what decides how many panels may go in series — see pv-string.ts. That
 * makes it a protection-register input, and the first version of it was the
 * weakest thing on the page: ten hand-written regions, one of which was
 * "Texas / Arizona". A single figure for Texas is wrong by twenty degrees
 * depending on where in Texas you stand, and the page had to say so.
 *
 * This replaces them with ninety-odd NAMED PLACES whose figures are derived
 * from thirty years of ERA5 reanalysis — see scripts/derive-site-climate.ts.
 * A row claims only to describe the place it names, which a region never could.
 *
 * WHY THE LOOKUP IS NOT LIVE
 * --------------------------
 * Asking a weather API for the user's own coordinates would be more accurate
 * still, and it was considered and rejected: /calculators promises "All
 * calculators run in your browser — no data is sent anywhere." That promise is
 * worth more than the extra precision. The derivation happens once, at
 * development time, and ships as static data.
 *
 * THE TWO COLD FIGURES ARE BOTH DEFENSIBLE
 * ----------------------------------------
 * designLowC is ASHRAE's extreme annual mean minimum — the mean of each year's
 * coldest day — which is the figure NEC 690.7 points at and what a professional
 * would use. recordLowC is the coldest single day in the window: rarer, colder,
 * and the choice a cautious builder may prefer. The page offers both and
 * defaults to the design figure, the same way the panel step offers the annual
 * peak-sun figure and the worst month.
 *
 * WHAT THIS IS STILL NOT
 * ----------------------
 * Nobody's actual site. ERA5 smooths local extremes over a ~25km cell, cold air
 * pools in valleys, and a nearby weather station's all-time record is usually
 * colder than anything here. The page says so and keeps the field editable —
 * this is the input it most wants replaced with a local figure.
 */

import { SITE_CLIMATES, SITE_CLIMATE_WINDOW } from './site-climate-data'

export interface SiteClimate {
  id: string
  /** A named place, never a region — the row claims only this. */
  place: string
  /** Grouping for the picker only. */
  region: string
  lat: number
  lon: number
  /** ASHRAE extreme annual mean minimum, degC. The NEC 690.7 figure. */
  designLowC: number
  /** Coldest single day in the window, degC. */
  recordLowC: number
  /** Mean of the annual maximums, degC. */
  designHighC: number
  /** Hottest single day in the window, degC. */
  recordHighC: number
}

export { SITE_CLIMATES, SITE_CLIMATE_WINDOW }

/** Fallback when no place has been picked. Temperate-European, and labelled. */
export const DEFAULT_DESIGN_LOW_C = -12
export const DEFAULT_DESIGN_HIGH_C = 32

export function siteById(id: string): SiteClimate | undefined {
  return SITE_CLIMATES.find(s => s.id === id)
}

/** Places grouped for the picker, in the order the regions first appear. */
export function sitesByRegion(): { region: string; sites: SiteClimate[] }[] {
  const groups: { region: string; sites: SiteClimate[] }[] = []
  for (const site of SITE_CLIMATES) {
    const existing = groups.find(g => g.region === site.region)
    if (existing) existing.sites.push(site)
    else groups.push({ region: site.region, sites: [site] })
  }
  return groups
}

/**
 * Case-insensitive substring match on the place name, so someone can type
 * "phoen" rather than scroll ninety rows. Region is searched too, so "canada"
 * finds all six Canadian entries.
 */
export function searchSites(query: string, limit = 12): SiteClimate[] {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return []
  const starts: SiteClimate[] = []
  const contains: SiteClimate[] = []
  for (const s of SITE_CLIMATES) {
    const place = s.place.toLowerCase()
    if (place.startsWith(q)) starts.push(s)
    else if (place.includes(q) || s.region.toLowerCase().includes(q)) contains.push(s)
  }
  return [...starts, ...contains].slice(0, limit)
}

/**
 * The nearest listed place to a set of coordinates, by great-circle distance,
 * with how far away it is. Used only to say "your site is 240km from the
 * nearest place we have" — never to pretend that place IS the site.
 */
export function nearestSite(lat: number, lon: number): { site: SiteClimate; km: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || SITE_CLIMATES.length === 0) return null
  const toRad = (d: number) => (d * Math.PI) / 180
  let best: { site: SiteClimate; km: number } | null = null
  for (const site of SITE_CLIMATES) {
    const dLat = toRad(site.lat - lat)
    const dLon = toRad(site.lon - lon)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(site.lat)) * Math.sin(dLon / 2) ** 2
    const km = 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)))
    if (!best || km < best.km) best = { site, km }
  }
  return best
}

/**
 * How much colder the record is than the design figure, for the copy that
 * offers the swap. Null when they are effectively the same.
 */
export function recordMargin(site: SiteClimate): number | null {
  const diff = site.designLowC - site.recordLowC
  return diff >= 0.5 ? Math.round(diff * 10) / 10 : null
}

export const SITE_CLIMATE_SOURCE =
  `Derived from ERA5 reanalysis (Open-Meteo archive), ${SITE_CLIMATE_WINDOW.start} to ` +
  `${SITE_CLIMATE_WINDOW.end}. The design low is the mean of the thirty annual minimums — ` +
  'ASHRAE’s extreme annual mean minimum, which is the figure NEC 690.7 points at. The record ' +
  'low is the coldest single day in that window. ERA5 is a ~25km grid rather than a weather ' +
  'station, so it smooths local extremes: a nearby station’s all-time record is usually colder, ' +
  'and cold air pools in valleys. Every row describes the place it names and nothing around it.'
