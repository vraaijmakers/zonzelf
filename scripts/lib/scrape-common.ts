// Shared plumbing for scripts/scrape-*.ts. Brand-specific discovery/parsing
// logic stays in each brand's own file — sites differ too much (see EG4 vs.
// Victron vs. SunGoldPower) for a one-size-fits-all scraper shape.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

export async function upsertBatteries(supabase: SupabaseClient, batteries: ParsedBattery[]) {
  console.log(`\nUpserting ${batteries.length} row(s) as unpublished...`)
  for (const battery of batteries) {
    const { error } = await supabase
      .from('battery_models')
      .upsert({ ...battery, scraped_at: new Date().toISOString() }, { onConflict: 'source_url' })
    if (error) {
      console.error(`  insert failed for ${battery.source_url}: ${error.message}`)
    } else {
      console.log(`  ✓ ${battery.brand} ${battery.model} (${battery.voltage}V ${battery.capacity_ah}Ah)`)
    }
  }
  console.log('\nDone. Rows are unpublished (is_published = false) pending admin review.')
}
