/**
 * Automated sanity checks for a scraped battery_models row, run before a
 * human decides whether to publish it. These catch scraper mistakes (wrong
 * field grabbed off the source page, a multi-unit bundle listing mistaken
 * for a single battery) — they don't verify the underlying physics, and
 * they're not a substitute for opening source_url and eyeballing the page.
 *
 * This is deliberately the same logic the roadmap's "agent-assisted review"
 * item (see supabase/migrations/20260821000002_roadmap_scraper_autonomy.sql)
 * is meant to build on — keep it here, not inlined into the admin page, so
 * that later automation and today's human reviewer are checking the exact
 * same things.
 */

export type ReviewSeverity = 'ok' | 'warn' | 'fail'

export type ReviewFlag = {
  code: string
  severity: ReviewSeverity
  message: string
}

export type BatteryModelForReview = {
  brand: string
  model: string
  sku: string | null
  chemistry: string
  voltage: number
  capacity_ah: number
  capacity_kwh: number
  dod_rated: number | null
  price_usd: number | null
  source_url: string
}

const DOD_RANGE_PCT: Record<string, [number, number]> = {
  lifepo4: [70, 100],
  agm: [40, 60],
  gel: [40, 60],
  flooded: [40, 60],
}

// Rough 2026 DIY-market retail bands. Wide on purpose — this is a "does this
// number look like it's from a different universe" check, not a price audit.
const PRICE_PER_KWH_USD: Record<string, [number, number]> = {
  lifepo4: [150, 700],
  agm: [60, 300],
  gel: [80, 350],
  flooded: [50, 250],
}

const VOLTAGE_FAMILIES = [12, 24, 48]

const BUNDLE_PATTERN = /\b\d+\s*[x×]\b|\bpack of\b|\bbundle\b/i

function nearestVoltageFamily(voltage: number): number {
  return VOLTAGE_FAMILIES.reduce((best, family) =>
    Math.abs(voltage - family) < Math.abs(voltage - best) ? family : best,
  VOLTAGE_FAMILIES[0])
}

export function reviewBatteryModel(row: BatteryModelForReview): ReviewFlag[] {
  const flags: ReviewFlag[] = []

  const expectedKwh = (row.voltage * row.capacity_ah) / 1000
  const kwhError = expectedKwh > 0 ? Math.abs(row.capacity_kwh - expectedKwh) / expectedKwh : 1
  if (kwhError > 0.05) {
    flags.push({
      code: 'capacity-math',
      severity: 'fail',
      message: `capacity_kwh (${row.capacity_kwh}) doesn't match voltage × capacity_ah (expected ≈${expectedKwh.toFixed(2)} kWh) — likely mismatched fields from the source page.`,
    })
  }

  const family = nearestVoltageFamily(row.voltage)
  if (Math.abs(row.voltage - family) / family > 0.15) {
    flags.push({
      code: 'voltage-family',
      severity: 'warn',
      message: `${row.voltage}V doesn't sit near a standard 12/24/48V pack family — check this isn't a per-cell voltage (e.g. 3.2V) or a typo.`,
    })
  }

  if (row.capacity_ah < 5 || row.capacity_ah > 600) {
    flags.push({
      code: 'capacity-range',
      severity: 'warn',
      message: `${row.capacity_ah}Ah is outside the usual single-unit range (5–600Ah) — check this isn't a multi-pack bundle or a parsing error.`,
    })
  }

  if (row.price_usd != null && row.capacity_kwh > 0) {
    const perKwh = row.price_usd / row.capacity_kwh
    const range = PRICE_PER_KWH_USD[row.chemistry]
    if (range && (perKwh < range[0] || perKwh > range[1])) {
      flags.push({
        code: 'price-range',
        severity: 'warn',
        message: `$${perKwh.toFixed(0)}/kWh is outside the typical ${row.chemistry.toUpperCase()} range ($${range[0]}–$${range[1]}) — check whether the price is per-unit or for a multi-pack bundle.`,
      })
    }
  }

  if (row.dod_rated != null) {
    const range = DOD_RANGE_PCT[row.chemistry]
    if (range && (row.dod_rated < range[0] || row.dod_rated > range[1])) {
      flags.push({
        code: 'dod-range',
        severity: 'warn',
        message: `${row.dod_rated}% DoD is unusual for ${row.chemistry.toUpperCase()} (typically ${range[0]}–${range[1]}%) — verify against the datasheet.`,
      })
    }
  }

  if (BUNDLE_PATTERN.test(row.model) || (row.sku && BUNDLE_PATTERN.test(row.sku))) {
    flags.push({
      code: 'bundle-listing',
      severity: 'fail',
      message: `The model name looks like a multi-unit bundle listing ("${row.model}") — confirm capacity_ah and price_usd describe one battery, not the whole bundle.`,
    })
  }

  try {
    const host = new URL(row.source_url).hostname.toLowerCase().replace(/^www\./, '')
    const brandSlug = row.brand.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (brandSlug.length > 2 && !host.replace(/[^a-z0-9]/g, '').includes(brandSlug)) {
      flags.push({
        code: 'source-domain',
        severity: 'warn',
        message: `Source URL (${host}) doesn't obviously match the brand "${row.brand}" — check this isn't a reseller or marketplace listing rather than the manufacturer's own page.`,
      })
    }
  } catch {
    flags.push({
      code: 'source-url-invalid',
      severity: 'fail',
      message: 'source_url is not a valid URL.',
    })
  }

  return flags
}

export function worstSeverity(flags: ReviewFlag[]): ReviewSeverity {
  if (flags.some(f => f.severity === 'fail')) return 'fail'
  if (flags.some(f => f.severity === 'warn')) return 'warn'
  return 'ok'
}

/**
 * Groups rows that plausibly describe the same physical battery (same
 * brand, same voltage family, capacity within 5Ah) so a reviewer can catch
 * the same model scraped twice under a different SKU or bundle listing.
 */
export function findLikelyDuplicates<T extends { id: number; brand: string; voltage: number; capacity_ah: number }>(
  rows: T[]
): Map<number, T[]> {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const key = `${row.brand.toLowerCase().trim()}|${nearestVoltageFamily(row.voltage)}|${Math.round(row.capacity_ah / 5) * 5}`
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }

  const result = new Map<number, T[]>()
  for (const list of groups.values()) {
    if (list.length > 1) {
      for (const row of list) {
        result.set(row.id, list.filter(r => r.id !== row.id))
      }
    }
  }
  return result
}
