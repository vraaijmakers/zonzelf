// One-time carry-over: battery_models → the component catalogue.
// Run with `npm run migrate:batteries` (DRY_RUN=1 to print the plan only).
// Idempotent — a second run finds every listing and spec row already there.
//
// WHY A SCRIPT AND NOT SQL. Each row is replayed through the writer the
// battery scrapers now use (toCatalogBattery → writeListing), so the listing
// ids it creates are exactly the ids next week's scrape will look for. A SQL
// copy would have had to re-derive those rules and could disagree with them.
//
// WHAT IS CARRIED. Specs, citation, photo, the reseller listing and its price
// WITH ITS ORIGINAL DATE (a carried-over price is not a fresh one). And the
// human decision: every row an admin approved under /admin/batteries ("open
// source_url, spot-check, approve") is marked verified and published, so
// /calculators/battery shows the same shelf the moment it switches source.
// Unpublished rows arrive as unverified candidates, as they were.

import { getServiceRoleClient } from './lib/scrape-common'
import { writeListing } from './lib/catalog-write'
import { toCatalogBattery } from '../src/lib/battery-catalog'

const DRY_RUN = process.env.DRY_RUN === '1'

type BatteryRow = {
  id: number; brand: string; model: string; sku: string | null
  chemistry: 'lifepo4' | 'agm' | 'gel' | 'flooded'
  voltage: number; capacity_ah: number; capacity_kwh: number; dod_rated: number | null
  price_usd: number | null; price_scraped_at: string | null
  source_url: string; retailer: string | null; retailer_url: string | null
  image_url: string | null; is_published: boolean
}

async function main() {
  const supabase = getServiceRoleClient()
  const { data, error } = await supabase
    .from('battery_models')
    .select('id, brand, model, sku, chemistry, voltage, capacity_ah, capacity_kwh, dod_rated, price_usd, price_scraped_at, source_url, retailer, retailer_url, image_url, is_published')
    .order('id')
  if (error) throw new Error(`battery_models read: ${error.message}`)
  const rows = (data ?? []) as BatteryRow[]
  console.log(`${rows.length} battery_models row(s), ${rows.filter(r => r.is_published).length} published.${DRY_RUN ? ' DRY RUN.' : ''}\n`)

  let failed = 0
  for (const row of rows) {
    const item = {
      ...toCatalogBattery({
        ...row,
        retailer: row.retailer ?? undefined,
        retailer_url: row.retailer_url ?? undefined,
      }),
      price_scraped_at: row.price_scraped_at,
    }
    console.log(`#${row.id} ${row.is_published ? 'PUB' : '   '} ${row.brand} ${row.model} → listing: ${item.retailer ?? 'none (manufacturer page)'}${item.price_usd !== null ? ` $${item.price_usd}` : ''}`)
    if (DRY_RUN) continue

    if (await writeListing(supabase, item) === 'failed') {
      failed++
      continue
    }

    // A replay is not a scrape. When the writer finds the price unchanged it
    // treats it as re-confirmed TODAY — right for a weekly scrape, wrong here:
    // a re-run of this script would make a price nobody has checked look
    // fresh for another 45 days (found on the second run, 2026-10-02). So the
    // listing always gets back the date battery_models had for it.
    if (item.retailer !== null && item.price_usd !== null) {
      const { error: dateError } = await supabase.from('component_listings')
        .update({ price_scraped_at: row.price_scraped_at })
        .eq('retailer', item.retailer).eq('retailer_product_id', item.retailer_product_id)
        .eq('price_usd', item.price_usd)
      if (dateError) {
        console.error(`  ✗ #${row.id}: restoring the price date failed: ${dateError.message}`)
        failed++
        continue
      }
    }

    // Find the model the writer used — by part number, else by name.
    const lookup = supabase.from('component_models').select('id, is_published').eq('category', 'battery')
    const { data: model, error: findError } = row.sku
      ? await lookup.eq('mpn_key', row.sku.toUpperCase().replace(/[^A-Z0-9]/g, '')).maybeSingle()
      : await lookup.eq('brand', row.brand).eq('model', row.model).maybeSingle()
    if (findError || !model) {
      console.error(`  ✗ #${row.id}: catalogue model not found after writing (${findError?.message ?? 'no row'})`)
      failed++
      continue
    }
    if (!row.is_published || model.is_published) continue

    // The human approval, carried over: verified from the manufacturer page it
    // was checked against, then published.
    const { error: specError } = await supabase.from('battery_specs').upsert({
      component_model_id: model.id,
      chemistry: row.chemistry, voltage: row.voltage, capacity_ah: row.capacity_ah,
      capacity_kwh: row.capacity_kwh, dod_rated: row.dod_rated,
      spec_source: 'datasheet', verified_at: new Date().toISOString(),
    }, { onConflict: 'component_model_id' })
    if (specError) {
      console.error(`  ✗ #${row.id}: verifying specs failed: ${specError.message}`)
      failed++
      continue
    }
    const { error: pubError } = await supabase.from('component_models').update({ is_published: true }).eq('id', model.id)
    if (pubError) {
      console.error(`  ✗ #${row.id}: publishing failed: ${pubError.message}`)
      failed++
      continue
    }
    console.log(`  ✓ verified and published as catalogue model #${model.id}`)
  }

  if (failed > 0) {
    console.error(`\n${failed} row(s) failed — see above. Re-running is safe.`)
    process.exitCode = 1
  } else {
    console.log('\nDone.')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
