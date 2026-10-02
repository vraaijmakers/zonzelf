// Shared plumbing for scripts/scrape-*.ts. Brand-specific discovery/parsing
// logic stays in each brand's own file — sites differ too much (see EG4 vs.
// Victron vs. SunGoldPower) for a one-size-fits-all scraper shape.
//
// WHERE BATTERIES GO, since 2026-10-02: the component catalogue, not
// battery_models. upsertBatteries() and updateScrapedFields() keep the names
// and signatures the five battery scrapers call, and route each record through
// src/lib/battery-catalog.ts into scripts/lib/catalog-write.ts — the writer
// panels and inverters already use. The protections the old review gate gave
// (gateWrite(), battery_model_revisions) carry over in the catalogue's terms:
// rows land unpublished, a verified spec row is never written (a disagreeing
// scrape is flagged on the model instead), and a price that jumps more than
// 30% on a published model is held. battery_models is frozen as the rollback;
// see supabase/migrations/20261002000001_component_catalog_batteries.sql.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { toCatalogBattery } from '../../src/lib/battery-catalog'
import { writeListing } from './catalog-write'
import {
  assessScrape,
  formatScrapeHealth,
  type ScrapeHealth,
  type ScrapeOutcome,
  type ScrapeRun,
} from '../../src/lib/scrape-health'

// ScrapeOutcome moved to src/lib/scrape-health.ts so CI can test the health
// rules without a service-role key (rule 9). Re-exported because every scraper
// imports it from here.
export type { ScrapeOutcome, ScrapeRun } from '../../src/lib/scrape-health'

export const USER_AGENT = 'ZonZelfBot/0.1 (+https://zonzelf.com; battery spec research)'

export type ParsedBattery = {
  brand: string
  model: string
  sku: string | null
  chemistry: 'lifepo4' | 'agm' | 'gel' | 'flooded'
  voltage: number
  capacity_ah: number
  capacity_kwh: number
  dod_rated: number | null
  price_usd: number | null
  source_url: string
  // Only set when the spec source and the priced retailer are the same site
  // (e.g. a reseller product page that states both). Omit when they differ —
  // see scrape-signaturesolar.ts, which fills these in on an existing row
  // instead of setting them at insert time.
  retailer?: string
  retailer_url?: string
  // The vendor's own product photo, for the admin review screen. Outside the
  // review gate — see syncImageUrl() below and migration 20260924000001.
  image_url?: string | null
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Transient upstream failures, and how long to wait before trying again.
// SunGoldPower returned 503 on two of ten product endpoints on 2026-09-24 and
// 200 on a retry seconds later; without a retry that is a battery missing from
// the catalogue for a week, logged as one line nobody reads. 404 and 403 are
// NOT in here on purpose — a page that is gone should fail the run promptly
// (scrape-signaturesolar.ts and its retired EG4 entry), not three times slowly.
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504])
const RETRY_BACKOFF_MS = [5_000, 15_000, 45_000]

export async function fetchHtml(url: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (res.ok) return res.text()

    const backoff = RETRY_BACKOFF_MS[attempt]
    if (backoff === undefined || !RETRY_STATUSES.has(res.status)) {
      throw new Error(`${url} → HTTP ${res.status}`)
    }
    // A server that says how long to wait is obeyed, within reason.
    const retryAfter = Number(res.headers.get('retry-after'))
    const wait = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 120_000)
      : backoff
    console.warn(`  … ${url} → HTTP ${res.status}, retrying in ${Math.round(wait / 1000)}s`)
    await sleep(wait)
  }
}

export function getServiceRoleClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env.local)')
  }
  return createClient(supabaseUrl, serviceRoleKey)
}

/**
 * Did this run actually work? Every scraper ends by calling this, and it is the
 * only thing standing between a broken source site and a green scheduled job —
 * see src/lib/scrape-health.ts for the two failures that used to exit 0.
 *
 * Sets `process.exitCode` rather than calling process.exit(), so stdout flushes
 * and the caller's own logging still lands. Not a throw: the scrapers' catch
 * prints a stack trace, and a stack trace is the wrong shape for "eg4's
 * category page is empty" — that is a finding, not a crash.
 */
export function reportScrapeHealth(run: ScrapeRun): ScrapeHealth {
  const health = assessScrape(run)
  for (const line of formatScrapeHealth(run, health)) console.log(line)
  if (!health.ok) process.exitCode = 1
  return health
}

export function tallyOutcomes(outcomes: ScrapeOutcome[]): string {
  const counts = new Map<ScrapeOutcome, number>()
  for (const outcome of outcomes) counts.set(outcome, (counts.get(outcome) ?? 0) + 1)
  return [...counts.entries()].map(([k, n]) => `${n} ${k}`).join(', ')
}

/**
 * Writes scraped batteries into the component catalogue. `source` names the
 * scraper for the log ('eg4', 'victron', …).
 */
export async function upsertBatteries(
  supabase: SupabaseClient,
  batteries: ParsedBattery[],
  source: string,
): Promise<ScrapeOutcome[]> {
  console.log(`\nWriting ${batteries.length} batter${batteries.length === 1 ? 'y' : 'ies'} from ${source} into the catalogue...`)
  const outcomes: ScrapeOutcome[] = []
  for (const battery of batteries) outcomes.push(await writeListing(supabase, toCatalogBattery(battery)))
  console.log(`\nDone: ${tallyOutcomes(outcomes)}.`)
  if (outcomes.includes('inserted')) console.log('New batteries are unpublished, waiting in /admin/catalog.')
  return outcomes
}

/**
 * A reseller price for a battery another scraper created (scrape-signaturesolar.ts
 * prices EG4's batteries). Never creates a battery: it finds the catalogue
 * model by SKU and writes the listing onto it, or reports it missing.
 */
export async function updateScrapedFields(
  supabase: SupabaseClient,
  match: { column: 'sku'; value: string },
  patch: { price_usd: number | null; retailer: string; retailer_url: string },
  source: string,
): Promise<ScrapeOutcome[]> {
  const { data: model, error } = await supabase
    .from('component_models').select('id, brand, model, mpn, spec_sheet_url')
    .eq('category', 'battery').eq('mpn_key', match.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .maybeSingle()
  if (error) {
    console.error(`  ✗ ${source}: lookup by sku ${match.value} failed: ${error.message}`)
    return ['failed']
  }
  if (!model) {
    console.warn(`  ? no catalogue battery with sku ${match.value} — nothing written`)
    return ['missing']
  }
  const outcome = await writeListing(supabase, {
    category: 'battery',
    brand: model.brand,
    model: model.model,
    mpn: model.mpn,
    spec_sheet_url: model.spec_sheet_url,
    image_url: null,
    retailer: patch.retailer,
    retailer_product_id: match.value,
    url: patch.retailer_url,
    title: `${model.brand} ${model.model}`,
    retailer_category: null,
    pack_qty: 1,
    min_order_qty: 1,
    price_usd: patch.price_usd,
  })
  return [outcome]
}
