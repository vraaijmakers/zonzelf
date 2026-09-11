// Shared plumbing for scripts/scrape-*.ts. Brand-specific discovery/parsing
// logic stays in each brand's own file — sites differ too much (see EG4 vs.
// Victron vs. SunGoldPower) for a one-size-fits-all scraper shape.
//
// THE PUBLISHED-ROW REVIEW GATE lives here, in gateWrite(). Until
// 2026-09-09 this file upserted `on conflict (source_url)`, which rewrote an
// already-published row's specs and price on every re-run with is_published
// left true — a live row on /calculators/battery changing with no human in the
// loop, which is exactly what the unpublished-by-default design exists to
// prevent. Nothing here writes over a published row any more: it proposes, and
// an admin applies in /admin/batteries. See
// supabase/migrations/20260909000001_battery_model_revisions.sql.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  SCRAPED_FIELDS,
  diffScrapedFields,
  proposalFrom,
  sameProposal,
  type FieldChange,
  type ScrapedRecord,
} from '../../src/lib/battery-revision'
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
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return res.text()
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

type ExistingRow = ScrapedRecord & { id: number; is_published: boolean }

const EXISTING_COLUMNS = ['id', 'is_published', ...SCRAPED_FIELDS].join(', ')

function summarize(changes: FieldChange[]): string {
  return changes.map(c => c.field).join(', ')
}

export function tallyOutcomes(outcomes: ScrapeOutcome[]): string {
  const counts = new Map<ScrapeOutcome, number>()
  for (const outcome of outcomes) counts.set(outcome, (counts.get(outcome) ?? 0) + 1)
  return [...counts.entries()].map(([k, n]) => `${n} ${k}`).join(', ')
}

/**
 * Routes one scraped record at an existing row: writes it if the row is not
 * live, proposes it if it is.
 */
async function gateWrite(
  supabase: SupabaseClient,
  existing: ExistingRow,
  patch: ScrapedRecord,
  source: string,
): Promise<ScrapeOutcome> {
  const label = `${existing.brand} ${existing.model}`
  const changes = diffScrapedFields(existing, patch)
  const now = new Date().toISOString()

  if (changes.length === 0) {
    // Nothing to review, but "we looked on this date and the page still agreed"
    // is worth recording — it's what makes a stale row visible later.
    const { error } = await supabase
      .from('battery_models')
      .update({ scraped_at: now })
      .eq('id', existing.id)
    if (error) {
      console.error(`  ✗ ${label}: touching scraped_at failed: ${error.message}`)
      return 'failed'
    }
    console.log(`  = ${label} — unchanged`)
    return 'unchanged'
  }

  const { proposed, previous } = proposalFrom(changes)

  if (!existing.is_published) {
    // Not live: write in place. The row is already sitting in the review queue,
    // so a second queue in front of it would just be a queue in front of a queue.
    const { error } = await supabase
      .from('battery_models')
      .update({ ...proposed, scraped_at: now })
      .eq('id', existing.id)
    if (error) {
      console.error(`  ✗ ${label}: update failed: ${error.message}`)
      return 'failed'
    }
    // An open proposal from back when this row was published now describes a
    // state that no longer exists. Neither accepted nor refused — superseded.
    const { error: supersedeError } = await supabase
      .from('battery_model_revisions')
      .update({ status: 'superseded', reviewed_at: now })
      .eq('battery_model_id', existing.id)
      .eq('status', 'pending')
    if (supersedeError) {
      console.error(`  ! ${label}: couldn't supersede open proposals: ${supersedeError.message}`)
    }
    console.log(`  ✓ ${label} — updated in place, unpublished (${summarize(changes)})`)
    return 'updated'
  }

  // Live row. Propose; never write.
  const { data: lastRejected, error: rejectedError } = await supabase
    .from('battery_model_revisions')
    .select('proposed')
    .eq('battery_model_id', existing.id)
    .eq('status', 'rejected')
    .order('reviewed_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  // Rule 7 — don't swallow it, but don't let a failed lookup silence a change
  // either. Failing toward "propose" costs the reviewer one duplicate; failing
  // toward "skip" is the bug this whole file is fixing.
  if (rejectedError) {
    console.error(`  ! ${label}: rejected-proposal lookup failed (${rejectedError.message}) — proposing anyway`)
  }
  if (lastRejected && sameProposal(lastRejected.proposed as Record<string, unknown>, proposed)) {
    console.log(`  – ${label} — same change a reviewer already rejected (${summarize(changes)}); not re-proposing`)
    return 'suppressed'
  }

  // One open proposal per battery (partial unique index): replace, don't stack.
  const { error: clearError } = await supabase
    .from('battery_model_revisions')
    .delete()
    .eq('battery_model_id', existing.id)
    .eq('status', 'pending')
  if (clearError) {
    console.error(`  ✗ ${label}: clearing the open proposal failed: ${clearError.message}`)
    return 'failed'
  }

  const { error: insertError } = await supabase
    .from('battery_model_revisions')
    .insert({ battery_model_id: existing.id, proposed, previous, source, scraped_at: now })
  if (insertError) {
    console.error(`  ✗ ${label}: proposal failed: ${insertError.message}`)
    return 'failed'
  }
  // battery_models.scraped_at deliberately NOT touched here. It dates the live
  // values, and the live values were not re-confirmed — the source disagrees
  // with them. The revision carries its own scraped_at.
  console.log(`  → ${label} — PUBLISHED row, change proposed for review (${summarize(changes)})`)
  return 'proposed'
}

async function findRows(
  supabase: SupabaseClient,
  match: { column: 'source_url' | 'sku'; value: string },
): Promise<{ rows: ExistingRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('battery_models')
    .select(EXISTING_COLUMNS)
    .eq(match.column, match.value)
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as unknown as ExistingRow[], error: null }
}

/**
 * Insert-or-gate on source_url, which is unique. For scrapers that produce a
 * whole battery record from a manufacturer or reseller spec page.
 *
 * `source` names the scraper ('eg4', 'victron', …) and is stored on any
 * proposal — a price disagreement reads very differently depending on whether
 * the manufacturer or the reseller raised it.
 */
export async function upsertBatteries(
  supabase: SupabaseClient,
  batteries: ParsedBattery[],
  source: string,
): Promise<ScrapeOutcome[]> {
  console.log(`\nWriting ${batteries.length} row(s) through the review gate...`)
  const outcomes: ScrapeOutcome[] = []

  for (const battery of batteries) {
    const label = `${battery.brand} ${battery.model}`
    const { rows, error } = await findRows(supabase, { column: 'source_url', value: battery.source_url })
    if (error) {
      console.error(`  ✗ ${label}: lookup failed: ${error}`)
      outcomes.push('failed')
      continue
    }

    if (rows.length === 0) {
      const { error: insertError } = await supabase
        .from('battery_models')
        .insert({ ...battery, scraped_at: new Date().toISOString(), is_published: false })
      if (insertError) {
        console.error(`  ✗ ${label}: insert failed: ${insertError.message}`)
        outcomes.push('failed')
        continue
      }
      console.log(`  + ${label} (${battery.voltage}V ${battery.capacity_ah}Ah) — new, unpublished`)
      outcomes.push('inserted')
      continue
    }

    for (const row of rows) {
      outcomes.push(await gateWrite(supabase, row, battery, source))
    }
  }

  console.log(`\nDone: ${tallyOutcomes(outcomes)}.`)
  if (outcomes.some(o => o === 'inserted' || o === 'updated')) {
    console.log('New and updated rows are unpublished, pending review in /admin/batteries.')
  }
  if (outcomes.includes('proposed')) {
    console.log('Published rows were NOT changed — their proposals wait for an admin in /admin/batteries.')
  }
  return outcomes
}

/**
 * Gate-only variant for scrapers that fill fields in on rows another scraper
 * created, and must never insert (see scrape-signaturesolar.ts, which adds a
 * reseller price to manufacturer-scraped EG4 rows).
 */
export async function updateScrapedFields(
  supabase: SupabaseClient,
  match: { column: 'source_url' | 'sku'; value: string },
  patch: ScrapedRecord,
  source: string,
): Promise<ScrapeOutcome[]> {
  const { rows, error } = await findRows(supabase, match)
  if (error) {
    console.error(`  ✗ lookup by ${match.column}=${match.value} failed: ${error}`)
    return ['failed']
  }
  if (rows.length === 0) {
    console.warn(`  ? no battery_models row with ${match.column} ${match.value} — nothing written`)
    return ['missing']
  }
  const outcomes: ScrapeOutcome[] = []
  for (const row of rows) {
    outcomes.push(await gateWrite(supabase, row, patch, source))
  }
  return outcomes
}
