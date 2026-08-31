/**
 * Derives the bundled site-climate table from ERA5 reanalysis, once, offline.
 *
 * WHY THIS EXISTS
 * ---------------
 * The array-wiring step needs a coldest-expected temperature, because that is
 * what sets a string's Voc and therefore how many panels may go in series. The
 * first version shipped ten hand-written regions ("Netherlands / Belgium",
 * "Texas / Arizona") and the page had to admit they were nearly useless: a
 * single number for Texas is wrong by twenty degrees depending on where in
 * Texas you stand.
 *
 * The obvious fix — look the site up from a weather API at runtime — was
 * rejected deliberately. /calculators promises "All calculators run in your
 * browser, no data is sent anywhere", and that promise is worth more than the
 * convenience. So the lookup happens HERE, once, at development time, and the
 * result is committed as static data. The app never makes a network call.
 *
 * WHAT IS COMPUTED, AND WHY TWO COLD FIGURES
 * ------------------------------------------
 * From daily minimums and maximums over a 30-year window:
 *
 *   designLowC  — the mean of the 30 annual minimums. This is ASHRAE's
 *                 "extreme annual mean minimum design dry-bulb temperature",
 *                 which is what NEC 690.7 actually points at, computed by its
 *                 own definition rather than approximated.
 *   recordLowC  — the coldest single day in the whole window. Colder, rarer,
 *                 and the conservative choice a cautious builder may prefer.
 *   designHighC — the mean of the annual maximums, for the hot-Vmp check.
 *   recordHighC — the hottest single day, for context.
 *
 * WHAT THIS IS NOT
 * ----------------
 * ERA5 is reanalysis on a ~25km grid, not a weather station record. It smooths
 * local extremes: a frost hollow or a city centre will differ from its grid
 * cell, and the true all-time record at a nearby station is usually colder than
 * the 30-year window here. Every row is a NAMED PLACE rather than a region, so
 * it claims only what it is, and the page says plainly that none of them is the
 * user's site.
 *
 * RUN
 * ---
 *   npx tsx scripts/derive-site-climate.ts
 *
 * Rewrites src/lib/site-climate-data.ts. Commit the result. Re-run only to
 * extend the window or add places — the numbers should not drift otherwise.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const START = '1995-01-01'
const END = '2024-12-31'
// Open-Meteo weights a request by how much data it returns, and a 30-year
// daily series for six places is heavy enough to trip the free tier's limit.
// Small batches, a real pause, and backoff on 429.
const BATCH = 1
const PAUSE_MS = 30_000
const MAX_RETRIES = 3
/** Partial results, so a rate limit halfway through does not lose an hour. */
const CACHE = 'scripts/.site-climate-cache.json'

interface Site {
  id: string
  place: string
  region: string
  lat: number
  lon: number
}

/**
 * Places, not regions. Chosen to span the climates a DIY solar builder
 * actually builds in, and deliberately including pairs inside one state or
 * country — Phoenix against Flagstaff, Austin against Amarillo — because the
 * spread within a region is the whole reason the old table was replaced.
 */
const SITES: Site[] = [
  // United States
  { id: 'us-phoenix-az', place: 'Phoenix, AZ', region: 'United States', lat: 33.45, lon: -112.07 },
  { id: 'us-flagstaff-az', place: 'Flagstaff, AZ', region: 'United States', lat: 35.20, lon: -111.65 },
  { id: 'us-los-angeles-ca', place: 'Los Angeles, CA', region: 'United States', lat: 34.05, lon: -118.24 },
  { id: 'us-sacramento-ca', place: 'Sacramento, CA', region: 'United States', lat: 38.58, lon: -121.49 },
  { id: 'us-truckee-ca', place: 'Truckee, CA', region: 'United States', lat: 39.33, lon: -120.18 },
  { id: 'us-denver-co', place: 'Denver, CO', region: 'United States', lat: 39.74, lon: -104.99 },
  { id: 'us-miami-fl', place: 'Miami, FL', region: 'United States', lat: 25.76, lon: -80.19 },
  { id: 'us-orlando-fl', place: 'Orlando, FL', region: 'United States', lat: 28.54, lon: -81.38 },
  { id: 'us-atlanta-ga', place: 'Atlanta, GA', region: 'United States', lat: 33.75, lon: -84.39 },
  { id: 'us-boise-id', place: 'Boise, ID', region: 'United States', lat: 43.62, lon: -116.20 },
  { id: 'us-chicago-il', place: 'Chicago, IL', region: 'United States', lat: 41.88, lon: -87.63 },
  { id: 'us-indianapolis-in', place: 'Indianapolis, IN', region: 'United States', lat: 39.77, lon: -86.16 },
  { id: 'us-wichita-ks', place: 'Wichita, KS', region: 'United States', lat: 37.69, lon: -97.34 },
  { id: 'us-new-orleans-la', place: 'New Orleans, LA', region: 'United States', lat: 29.95, lon: -90.07 },
  { id: 'us-portland-me', place: 'Portland, ME', region: 'United States', lat: 43.66, lon: -70.26 },
  { id: 'us-boston-ma', place: 'Boston, MA', region: 'United States', lat: 42.36, lon: -71.06 },
  { id: 'us-detroit-mi', place: 'Detroit, MI', region: 'United States', lat: 42.33, lon: -83.05 },
  { id: 'us-minneapolis-mn', place: 'Minneapolis, MN', region: 'United States', lat: 44.98, lon: -93.27 },
  { id: 'us-kansas-city-mo', place: 'Kansas City, MO', region: 'United States', lat: 39.10, lon: -94.58 },
  { id: 'us-billings-mt', place: 'Billings, MT', region: 'United States', lat: 45.78, lon: -108.50 },
  { id: 'us-omaha-ne', place: 'Omaha, NE', region: 'United States', lat: 41.26, lon: -95.93 },
  { id: 'us-las-vegas-nv', place: 'Las Vegas, NV', region: 'United States', lat: 36.17, lon: -115.14 },
  { id: 'us-albuquerque-nm', place: 'Albuquerque, NM', region: 'United States', lat: 35.08, lon: -106.65 },
  { id: 'us-buffalo-ny', place: 'Buffalo, NY', region: 'United States', lat: 42.89, lon: -78.88 },
  { id: 'us-new-york-ny', place: 'New York, NY', region: 'United States', lat: 40.71, lon: -74.01 },
  { id: 'us-charlotte-nc', place: 'Charlotte, NC', region: 'United States', lat: 35.23, lon: -80.84 },
  { id: 'us-fargo-nd', place: 'Fargo, ND', region: 'United States', lat: 46.88, lon: -96.79 },
  { id: 'us-columbus-oh', place: 'Columbus, OH', region: 'United States', lat: 39.96, lon: -82.99 },
  { id: 'us-oklahoma-city-ok', place: 'Oklahoma City, OK', region: 'United States', lat: 35.47, lon: -97.52 },
  { id: 'us-portland-or', place: 'Portland, OR', region: 'United States', lat: 45.51, lon: -122.68 },
  { id: 'us-bend-or', place: 'Bend, OR', region: 'United States', lat: 44.06, lon: -121.31 },
  { id: 'us-philadelphia-pa', place: 'Philadelphia, PA', region: 'United States', lat: 39.95, lon: -75.17 },
  { id: 'us-charleston-sc', place: 'Charleston, SC', region: 'United States', lat: 32.78, lon: -79.93 },
  { id: 'us-rapid-city-sd', place: 'Rapid City, SD', region: 'United States', lat: 44.08, lon: -103.23 },
  { id: 'us-nashville-tn', place: 'Nashville, TN', region: 'United States', lat: 36.16, lon: -86.78 },
  { id: 'us-austin-tx', place: 'Austin, TX', region: 'United States', lat: 30.27, lon: -97.74 },
  { id: 'us-amarillo-tx', place: 'Amarillo, TX', region: 'United States', lat: 35.22, lon: -101.83 },
  { id: 'us-houston-tx', place: 'Houston, TX', region: 'United States', lat: 29.76, lon: -95.37 },
  { id: 'us-salt-lake-city-ut', place: 'Salt Lake City, UT', region: 'United States', lat: 40.76, lon: -111.89 },
  { id: 'us-burlington-vt', place: 'Burlington, VT', region: 'United States', lat: 44.48, lon: -73.21 },
  { id: 'us-richmond-va', place: 'Richmond, VA', region: 'United States', lat: 37.54, lon: -77.44 },
  { id: 'us-seattle-wa', place: 'Seattle, WA', region: 'United States', lat: 47.61, lon: -122.33 },
  { id: 'us-spokane-wa', place: 'Spokane, WA', region: 'United States', lat: 47.66, lon: -117.43 },
  { id: 'us-milwaukee-wi', place: 'Milwaukee, WI', region: 'United States', lat: 43.04, lon: -87.91 },
  { id: 'us-cheyenne-wy', place: 'Cheyenne, WY', region: 'United States', lat: 41.14, lon: -104.82 },
  { id: 'us-anchorage-ak', place: 'Anchorage, AK', region: 'United States', lat: 61.22, lon: -149.90 },
  { id: 'us-honolulu-hi', place: 'Honolulu, HI', region: 'United States', lat: 21.31, lon: -157.86 },

  // Canada
  { id: 'ca-vancouver', place: 'Vancouver, BC', region: 'Canada', lat: 49.28, lon: -123.12 },
  { id: 'ca-calgary', place: 'Calgary, AB', region: 'Canada', lat: 51.05, lon: -114.07 },
  { id: 'ca-winnipeg', place: 'Winnipeg, MB', region: 'Canada', lat: 49.90, lon: -97.14 },
  { id: 'ca-toronto', place: 'Toronto, ON', region: 'Canada', lat: 43.65, lon: -79.38 },
  { id: 'ca-montreal', place: 'Montreal, QC', region: 'Canada', lat: 45.50, lon: -73.57 },
  { id: 'ca-halifax', place: 'Halifax, NS', region: 'Canada', lat: 44.65, lon: -63.57 },

  // Britain & Ireland
  { id: 'gb-london', place: 'London', region: 'Britain & Ireland', lat: 51.51, lon: -0.13 },
  { id: 'gb-manchester', place: 'Manchester', region: 'Britain & Ireland', lat: 53.48, lon: -2.24 },
  { id: 'gb-edinburgh', place: 'Edinburgh', region: 'Britain & Ireland', lat: 55.95, lon: -3.19 },
  { id: 'ie-dublin', place: 'Dublin', region: 'Britain & Ireland', lat: 53.35, lon: -6.26 },

  // Western & Central Europe
  { id: 'nl-amsterdam', place: 'Amsterdam', region: 'Western & Central Europe', lat: 52.37, lon: 4.90 },
  { id: 'nl-winterswijk', place: 'Winterswijk', region: 'Western & Central Europe', lat: 51.97, lon: 6.72 },
  { id: 'be-brussels', place: 'Brussels', region: 'Western & Central Europe', lat: 50.85, lon: 4.35 },
  { id: 'fr-paris', place: 'Paris', region: 'Western & Central Europe', lat: 48.86, lon: 2.35 },
  { id: 'fr-lyon', place: 'Lyon', region: 'Western & Central Europe', lat: 45.76, lon: 4.84 },
  { id: 'de-berlin', place: 'Berlin', region: 'Western & Central Europe', lat: 52.52, lon: 13.40 },
  { id: 'de-munich', place: 'Munich', region: 'Western & Central Europe', lat: 48.14, lon: 11.58 },
  { id: 'de-frankfurt', place: 'Frankfurt', region: 'Western & Central Europe', lat: 50.11, lon: 8.68 },
  { id: 'at-vienna', place: 'Vienna', region: 'Western & Central Europe', lat: 48.21, lon: 16.37 },
  { id: 'ch-zurich', place: 'Zurich', region: 'Western & Central Europe', lat: 47.38, lon: 8.54 },
  { id: 'cz-prague', place: 'Prague', region: 'Western & Central Europe', lat: 50.08, lon: 14.44 },
  { id: 'pl-warsaw', place: 'Warsaw', region: 'Western & Central Europe', lat: 52.23, lon: 21.01 },

  // Southern Europe
  { id: 'es-madrid', place: 'Madrid', region: 'Southern Europe', lat: 40.42, lon: -3.70 },
  { id: 'es-barcelona', place: 'Barcelona', region: 'Southern Europe', lat: 41.39, lon: 2.17 },
  { id: 'pt-lisbon', place: 'Lisbon', region: 'Southern Europe', lat: 38.72, lon: -9.14 },
  { id: 'it-rome', place: 'Rome', region: 'Southern Europe', lat: 41.90, lon: 12.50 },
  { id: 'it-milan', place: 'Milan', region: 'Southern Europe', lat: 45.46, lon: 9.19 },
  { id: 'gr-athens', place: 'Athens', region: 'Southern Europe', lat: 37.98, lon: 23.73 },

  // Nordics
  { id: 'dk-copenhagen', place: 'Copenhagen', region: 'Nordics', lat: 55.68, lon: 12.57 },
  { id: 'no-oslo', place: 'Oslo', region: 'Nordics', lat: 59.91, lon: 10.75 },
  { id: 'se-stockholm', place: 'Stockholm', region: 'Nordics', lat: 59.33, lon: 18.07 },
  { id: 'fi-helsinki', place: 'Helsinki', region: 'Nordics', lat: 60.17, lon: 24.94 },

  // Australia & New Zealand
  { id: 'au-sydney', place: 'Sydney', region: 'Australia & New Zealand', lat: -33.87, lon: 151.21 },
  { id: 'au-melbourne', place: 'Melbourne', region: 'Australia & New Zealand', lat: -37.81, lon: 144.96 },
  { id: 'au-brisbane', place: 'Brisbane', region: 'Australia & New Zealand', lat: -27.47, lon: 153.03 },
  { id: 'au-perth', place: 'Perth', region: 'Australia & New Zealand', lat: -31.95, lon: 115.86 },
  { id: 'au-adelaide', place: 'Adelaide', region: 'Australia & New Zealand', lat: -34.93, lon: 138.60 },
  { id: 'au-canberra', place: 'Canberra', region: 'Australia & New Zealand', lat: -35.28, lon: 149.13 },
  { id: 'nz-auckland', place: 'Auckland', region: 'Australia & New Zealand', lat: -36.85, lon: 174.76 },
  { id: 'nz-christchurch', place: 'Christchurch', region: 'Australia & New Zealand', lat: -43.53, lon: 172.64 },

  // Elsewhere
  { id: 'za-cape-town', place: 'Cape Town', region: 'Rest of world', lat: -33.92, lon: 18.42 },
  { id: 'za-johannesburg', place: 'Johannesburg', region: 'Rest of world', lat: -26.20, lon: 28.05 },
  { id: 'mx-mexico-city', place: 'Mexico City', region: 'Rest of world', lat: 19.43, lon: -99.13 },
  { id: 'br-sao-paulo', place: 'Sao Paulo', region: 'Rest of world', lat: -23.55, lon: -46.63 },
]

interface DailySeries {
  time: string[]
  temperature_2m_min: (number | null)[]
  temperature_2m_max: (number | null)[]
}

/** Mean of each year's most extreme value — ASHRAE's own definition. */
function meanAnnualExtreme(
  times: string[],
  values: (number | null)[],
  pick: 'min' | 'max',
): number {
  const byYear = new Map<string, number>()
  for (let i = 0; i < times.length; i++) {
    const v = values[i]
    if (v === null || v === undefined) continue
    const year = times[i].slice(0, 4)
    const current = byYear.get(year)
    if (current === undefined) byYear.set(year, v)
    else byYear.set(year, pick === 'min' ? Math.min(current, v) : Math.max(current, v))
  }
  const extremes = [...byYear.values()]
  if (extremes.length === 0) return NaN
  return extremes.reduce((a, b) => a + b, 0) / extremes.length
}

const round1 = (n: number) => Math.round(n * 10) / 10

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchBatch(sites: Site[]) {
  const url =
    'https://archive-api.open-meteo.com/v1/archive' +
    `?latitude=${sites.map(s => s.lat).join(',')}` +
    `&longitude=${sites.map(s => s.lon).join(',')}` +
    `&start_date=${START}&end_date=${END}` +
    '&daily=temperature_2m_min,temperature_2m_max&timezone=UTC'

  let body: unknown
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url)
    if (res.ok) {
      body = await res.json()
      break
    }
    // 429 is a rate limit, not a failure — wait longer and try again.
    const retryable = res.status === 429 || res.status >= 500
    if (!retryable || attempt >= MAX_RETRIES) {
      throw new Error(`${res.status} ${res.statusText} for ${sites.map(s => s.id).join(', ')}`)
    }
    const wait = PAUSE_MS * 2 ** attempt
    process.stderr.write(`    ${res.status}; waiting ${Math.round(wait / 1000)}s and retrying\n`)
    await sleep(wait)
  }
  const rows: unknown[] = Array.isArray(body) ? body : [body]
  if (rows.length !== sites.length) {
    throw new Error(`asked for ${sites.length} locations, got ${rows.length}`)
  }
  return rows.map((row, i) => {
    const daily = (row as { daily: DailySeries }).daily
    const mins = daily.temperature_2m_min.filter((v): v is number => v !== null)
    const maxes = daily.temperature_2m_max.filter((v): v is number => v !== null)
    if (mins.length < 9000) {
      throw new Error(`${sites[i].id}: only ${mins.length} days returned, expected ~10950`)
    }
    return {
      ...sites[i],
      designLowC: round1(meanAnnualExtreme(daily.time, daily.temperature_2m_min, 'min')),
      recordLowC: round1(Math.min(...mins)),
      designHighC: round1(meanAnnualExtreme(daily.time, daily.temperature_2m_max, 'max')),
      recordHighC: round1(Math.max(...maxes)),
      days: mins.length,
    }
  })
}

async function main() {
  type Row = Awaited<ReturnType<typeof fetchBatch>>[number]
  const emitOnly = process.argv.includes('--emit-only')
  const done = new Map<string, Row>()
  if (existsSync(CACHE)) {
    for (const row of JSON.parse(readFileSync(CACHE, 'utf8')) as Row[]) done.set(row.id, row)
    process.stderr.write(`Resuming: ${done.size} place(s) already derived.\n`)
  }

  const todo = emitOnly ? [] : SITES.filter(s => !done.has(s.id))
  const failed: string[] = []
  if (emitOnly) {
    process.stderr.write('--emit-only: rewriting the data file from cache, fetching nothing.\n')
  }
  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH)
    process.stderr.write(`  ${done.size + 1}-${done.size + chunk.length} of ${SITES.length}: ${chunk.map(s => s.place).join(', ')}\n`)
    try {
      for (const row of await fetchBatch(chunk)) done.set(row.id, row)
      writeFileSync(CACHE, JSON.stringify([...done.values()], null, 2))
    } catch (err) {
      // One rate-limited batch must not discard the other ninety. Record it,
      // emit what we have, and let the next run pick these up from the cache.
      failed.push(...chunk.map(c => c.id))
      process.stderr.write(`    SKIPPED: ${(err as Error).message}\n`)
    }
    if (i + BATCH < todo.length) await sleep(PAUSE_MS)
  }

  // Emit in the order SITES declares, not the order they were fetched.
  const derived = SITES.map(s => done.get(s.id)!).filter(Boolean)

  const body = derived
    .map(
      d =>
        `  { id: '${d.id}', place: '${d.place}', region: '${d.region}', ` +
        `lat: ${d.lat}, lon: ${d.lon}, ` +
        `designLowC: ${d.designLowC}, recordLowC: ${d.recordLowC}, ` +
        `designHighC: ${d.designHighC}, recordHighC: ${d.recordHighC} },`,
    )
    .join('\n')

  const YEARS = Number(END.slice(0, 4)) - Number(START.slice(0, 4)) + 1
  const out = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by scripts/derive-site-climate.ts from ERA5 reanalysis via
 * Open-Meteo's archive API, over ${START} to ${END} (${derived[0].days} days per place).
 * Re-run that script to regenerate; see its header for what each figure means
 * and why the lookup happens at build time rather than in the browser.
 *
 *   designLowC   mean of the ${YEARS} annual minimums — ASHRAE's extreme annual
 *                mean minimum, which is what NEC 690.7 points at
 *   recordLowC   coldest single day in the window
 *   designHighC  mean of the annual maximums
 *   recordHighC  hottest single day in the window
 *
 * ERA5 is a ~25km grid, not a weather station. It smooths local extremes, so a
 * nearby station's all-time record is usually colder than recordLowC here.
 * Every row is a named place and claims nothing about the region around it.
 */

import type { SiteClimate } from './site-climate'

export const SITE_CLIMATE_WINDOW = { start: '${START}', end: '${END}' } as const

export const SITE_CLIMATES: SiteClimate[] = [
${body}
]
`
  writeFileSync('src/lib/site-climate-data.ts', out)
  process.stderr.write(`\nWrote src/lib/site-climate-data.ts with ${derived.length} of ${SITES.length} places.\n`)
  const absent = SITES.filter(x => !done.has(x.id)).map(x => x.id)
  if (absent.length > 0 && failed.length === 0) {
    process.stderr.write(`${absent.length} place(s) not yet derived: ${absent.join(', ')}\n`)
  }
  if (failed.length > 0) {
    process.stderr.write(
      `${failed.length} still missing (rate limited): ${failed.join(', ')}\n` +
      'Run again later — the cache means only these are refetched.\n',
    )
    process.exitCode = 1
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
