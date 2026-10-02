// Writes scraped panels and inverters into the component catalogue.
//
// The rules live in supabase/migrations/20260930000001_component_catalog.sql;
// this is where the scrapers obey them:
//
//   1. A LISTING is found by (retailer, retailer_product_id) — never by URL, so
//      a shop reorganising its URLs moves a listing instead of forking it.
//   2. A MODEL is found through its listing, else by manufacturer part number,
//      so a pallet of 36 and the single panel land on one model with two
//      listings, and a second retailer adds a listing instead of a duplicate.
//   3. A VERIFIED spec row is never written. Verification means an admin read
//      the manufacturer's datasheet; no scrape outranks that.
//   4. A listing's price follows src/lib/listing-price.ts — written and dated
//      in place, except a large move on a published model, which is held.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ScrapeOutcome } from './scrape-common'
import { findCecMatch, modelKey, type CecMatch, type CecPvModule } from '../../src/lib/cec-pv'
import { decideListingPrice } from '../../src/lib/listing-price'

export type ScrapedPanelFields = {
  watts_stc: number | null
  length_mm: number | null
  width_mm: number | null
  thickness_mm: number | null
  cell_type: string | null
  bifacial: boolean | null
}

export type ScrapedBatteryFields = {
  chemistry: 'lifepo4' | 'agm' | 'gel' | 'flooded'
  voltage: number
  capacity_ah: number
  capacity_kwh: number
  dod_rated: number | null
}

export type ScrapedListing = {
  category: 'panel' | 'inverter' | 'battery'
  brand: string
  model: string
  mpn: string | null
  spec_sheet_url: string | null
  image_url: string | null
  /**
   * Null for a source that states specs but sells nothing — EG4's and
   * Victron's own sites. The model and its specs are written; no listing.
   */
  retailer: string | null
  retailer_product_id: string
  url: string
  title: string
  retailer_category: string | null
  pack_qty: number
  min_order_qty: number
  price_usd: number | null
  /** Dates a NEW listing's price; defaults to now. The battery carry-over keeps the original date. */
  price_scraped_at?: string | null
  panel?: ScrapedPanelFields
  battery?: ScrapedBatteryFields
}

type ModelRow = { id: number; is_published: boolean; spec_sheet_url: string | null; image_url: string | null }
type ListingRow = { id: number; component_model_id: number; price_usd: number | null }

const MODEL_COLUMNS = 'id, is_published, spec_sheet_url, image_url'

/** Mirrors component_models.mpn_key, the generated column. Must stay in step. */
export function mpnKey(mpn: string | null): string | null {
  const k = (mpn ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return k === '' ? null : k
}

// ---------------------------------------------------------------------------
// CEC lookup
// ---------------------------------------------------------------------------

const cecByWatts = new Map<number, CecPvModule[]>()

async function cecCandidates(supabase: SupabaseClient, mpn: string, watts: number | null): Promise<CecPvModule[]> {
  // Exact key first — cheap and indexed.
  const { data: exact, error } = await supabase
    .from('cec_pv_modules').select('*').eq('model_key', modelKey(mpn))
  if (error) throw new Error(`cec_pv_modules lookup: ${error.message}`)
  if (watts === null) return (exact ?? []) as CecPvModule[]

  // A family match needs every module at this wattage — the retailer's key can
  // sit anywhere inside the CEC one once the wattage digits are taken out, so
  // it cannot be expressed as one LIKE. Cached per wattage for the run.
  if (!cecByWatts.has(watts)) {
    const rows: CecPvModule[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error: pageError } = await supabase
        .from('cec_pv_modules').select('*').eq('pmax_w', watts).range(from, from + 999)
      if (pageError) throw new Error(`cec_pv_modules lookup: ${pageError.message}`)
      rows.push(...((data ?? []) as CecPvModule[]))
      if (!data || data.length < 1000) break
    }
    cecByWatts.set(watts, rows)
  }
  return [...((exact ?? []) as CecPvModule[]), ...cecByWatts.get(watts)!]
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

async function findOrCreateModel(
  supabase: SupabaseClient,
  item: ScrapedListing,
  existingListing: ListingRow | null,
): Promise<{ model: ModelRow; created: boolean }> {
  if (existingListing) {
    const { data, error } = await supabase
      .from('component_models').select(MODEL_COLUMNS).eq('id', existingListing.component_model_id).single()
    if (error) throw new Error(`model lookup: ${error.message}`)
    return { model: data as ModelRow, created: false }
  }

  const key = mpnKey(item.mpn)
  if (key) {
    const { data, error } = await supabase
      .from('component_models').select(MODEL_COLUMNS)
      .eq('category', item.category).eq('mpn_key', key).maybeSingle()
    if (error) throw new Error(`model lookup by part number: ${error.message}`)
    if (data) return { model: data as ModelRow, created: false }
  }

  // Name fallback, for the listing that lacks the part number its sibling has
  // (Signature Solar's SunPro 440W single has none; the pallet does). Only
  // against models with no part number, or when this listing has none: two
  // different part numbers under one name are two products.
  let byName = supabase
    .from('component_models').select(`${MODEL_COLUMNS}, mpn`)
    .eq('category', item.category).eq('brand', item.brand).eq('model', item.model)
  if (key) byName = byName.is('mpn_key', null)
  const { data: named, error: namedError } = await byName.limit(2)
  if (namedError) throw new Error(`model lookup by name: ${namedError.message}`)
  if (named && named.length === 1) {
    const found = named[0] as ModelRow & { mpn: string | null }
    if (item.mpn && !found.mpn) {
      const { error } = await supabase.from('component_models').update({ mpn: item.mpn }).eq('id', found.id)
      if (error) throw new Error(`model part-number fill: ${error.message}`)
    }
    return { model: found, created: false }
  }

  const { data, error } = await supabase
    .from('component_models')
    .insert({
      category: item.category,
      brand: item.brand,
      model: item.model,
      mpn: item.mpn,
      spec_sheet_url: item.spec_sheet_url,
      image_url: item.image_url,
      is_published: false,
    })
    .select(MODEL_COLUMNS)
    .single()
  if (error) throw new Error(`model insert: ${error.message}`)
  return { model: data as ModelRow, created: true }
}

/**
 * The candidate spec for a panel: CEC electricals where the part number
 * matches one module unambiguously, plus the shop's physical fields. Returns
 * the match too, so the log says why a panel has no electricals.
 */
async function panelSpec(
  supabase: SupabaseClient,
  item: ScrapedListing,
): Promise<{ spec: Record<string, unknown>; match: CecMatch | null }> {
  const p = item.panel!
  const match = item.mpn ? findCecMatch(item.mpn, p.watts_stc, await cecCandidates(supabase, item.mpn, p.watts_stc)) : null
  const physical = {
    length_mm: p.length_mm,
    width_mm: p.width_mm,
    thickness_mm: p.thickness_mm,
    cell_type: p.cell_type,
    bifacial: p.bifacial,
  }
  if (match && match.kind !== 'none') {
    const m = match.module
    return {
      match,
      spec: {
        ...physical,
        watts_stc: m.pmax_w ?? p.watts_stc,
        voc_stc: m.voc_v,
        vmp_stc: m.vmp_v,
        isc_stc: m.isc_a,
        imp_stc: m.imp_a,
        beta_voc_pct: m.beta_voc_pct,
        beta_vmp_pct: m.beta_vmp_pct,
        beta_pmax_pct: m.gamma_pmax_pct,
        alpha_isc_pct: m.alpha_isc_pct,
        cells_in_series: m.cells_in_series,
        bifacial: p.bifacial ?? m.bifacial,
        spec_source: 'cec',
        cec_manufacturer: m.manufacturer,
        cec_model_number: m.model_number,
      },
    }
  }
  return { match, spec: { ...physical, watts_stc: p.watts_stc, spec_source: 'retailer' } }
}

async function writePanelSpec(supabase: SupabaseClient, modelId: number, item: ScrapedListing) {
  const { data: existing, error } = await supabase
    .from('panel_specs').select('verified_at, spec_source').eq('component_model_id', modelId).maybeSingle()
  if (error) throw new Error(`panel_specs lookup: ${error.message}`)
  if (existing?.verified_at) return // Rule 3.

  const { spec, match } = await panelSpec(supabase, item)
  // A pallet listing of a panel whose single already matched the CEC must not
  // downgrade the spec to retailer-only because the pallet page lacks a part
  // number the single had.
  if (existing?.spec_source === 'cec' && spec.spec_source !== 'cec') return

  const { error: upsertError } = await supabase
    .from('panel_specs').upsert({ component_model_id: modelId, ...spec }, { onConflict: 'component_model_id' })
  if (upsertError) throw new Error(`panel_specs write: ${upsertError.message}`)

  if (!match) {
    console.log('      specs: no CEC electricals (no part number on the listing)')
  } else if (match.kind === 'none') {
    console.log(`      specs: no CEC electricals (${match.reason})`)
  } else {
    console.log(`      specs: CEC ${match.kind} match → ${match.module.manufacturer} ${match.module.model_number}`)
  }
}

const BATTERY_SPEC_FIELDS = ['chemistry', 'voltage', 'capacity_ah', 'capacity_kwh', 'dod_rated'] as const

/**
 * Battery specs come from the manufacturer's page, so unlike a panel's CEC
 * candidate they can CHANGE under a verified row (a revised datasheet, a
 * relabelled capacity). The battery review gate used to turn that into a
 * proposal; the catalogue never writes a verified spec row, so the difference
 * is recorded on the model as spec_disagreement for an admin instead —
 * silence would be the bug the gate was built to prevent.
 */
async function writeBatterySpec(supabase: SupabaseClient, modelId: number, b: ScrapedBatteryFields, label: string) {
  const { data: existing, error } = await supabase
    .from('battery_specs').select('verified_at, chemistry, voltage, capacity_ah, capacity_kwh, dod_rated')
    .eq('component_model_id', modelId).maybeSingle()
  if (error) throw new Error(`battery_specs lookup: ${error.message}`)

  if (existing?.verified_at) {
    const diff: Record<string, { verified: unknown; scraped: unknown }> = {}
    for (const f of BATTERY_SPEC_FIELDS) {
      const scraped = b[f]
      // Silence is not a correction: a field the source no longer states is
      // not a disagreement.
      if (scraped === null || scraped === undefined) continue
      const verified = (existing as Record<string, unknown>)[f]
      const same = typeof scraped === 'number' && typeof verified === 'number'
        ? Math.abs(scraped - verified) < 0.005
        : scraped === verified
      if (!same) diff[f] = { verified, scraped }
    }
    const disagreement = Object.keys(diff).length > 0 ? diff : null
    const { error: flagError } = await supabase.from('component_models')
      .update({ spec_disagreement: disagreement, spec_disagreement_at: disagreement ? new Date().toISOString() : null })
      .eq('id', modelId)
    if (flagError) throw new Error(`spec_disagreement write: ${flagError.message}`)
    if (disagreement) console.log(`      ! ${label}: source now disagrees with verified specs (${Object.keys(diff).join(', ')}) — flagged for review`)
    return
  }

  const { error: upsertError } = await supabase.from('battery_specs').upsert(
    { component_model_id: modelId, ...b, spec_source: 'manufacturer' },
    { onConflict: 'component_model_id' },
  )
  if (upsertError) throw new Error(`battery_specs write: ${upsertError.message}`)
}

export async function writeListing(supabase: SupabaseClient, item: ScrapedListing): Promise<ScrapeOutcome> {
  const label = `${item.brand} ${item.model}${item.pack_qty > 1 ? ` ×${item.pack_qty}` : ''}`
  try {
    let listing: ListingRow | null = null
    if (item.retailer !== null) {
      const { data, error: listingError } = await supabase
        .from('component_listings').select('id, component_model_id, price_usd')
        .eq('retailer', item.retailer).eq('retailer_product_id', item.retailer_product_id).maybeSingle()
      if (listingError) throw new Error(`listing lookup: ${listingError.message}`)
      listing = data as ListingRow | null
    }

    const { model, created } = await findOrCreateModel(supabase, item, listing)
    const now = new Date().toISOString()

    // Model housekeeping. The photo is admin decoration and always follows the
    // shop (as battery_models.image_url does); the spec-sheet link is filled
    // in only while nobody has published the model on the strength of it.
    const modelPatch: Record<string, unknown> = { scraped_at: now }
    if (item.image_url && item.image_url !== model.image_url) modelPatch.image_url = item.image_url
    if (item.spec_sheet_url && !model.spec_sheet_url) modelPatch.spec_sheet_url = item.spec_sheet_url
    const { error: modelError } = await supabase.from('component_models').update(modelPatch).eq('id', model.id)
    if (modelError) throw new Error(`model update: ${modelError.message}`)

    const listingFields = {
      url: item.url,
      title: item.title,
      retailer_category: item.retailer_category,
      pack_qty: item.pack_qty,
      min_order_qty: item.min_order_qty,
      scraped_at: now,
    }

    let outcome: ScrapeOutcome
    if (item.retailer === null) {
      // A manufacturer's own page: specs and a citation, nothing to buy.
      console.log(`  ${created ? '+' : '='} ${label} — ${created ? 'new model' : 'seen'} (manufacturer source, no shop listing)`)
      outcome = created ? 'inserted' : 'unchanged'
    } else if (!listing) {
      const { error } = await supabase.from('component_listings').insert({
        component_model_id: model.id,
        retailer: item.retailer,
        retailer_product_id: item.retailer_product_id,
        ...listingFields,
        price_usd: item.price_usd,
        price_scraped_at: item.price_usd !== null ? (item.price_scraped_at ?? now) : null,
      })
      if (error) throw new Error(`listing insert: ${error.message}`)
      console.log(`  + ${label} — ${created ? 'new model' : `new listing on model ${model.id}`}${item.price_usd !== null ? `, $${item.price_usd}` : ''}`)
      outcome = 'inserted'
    } else {
      const decision = decideListingPrice(listing.price_usd, item.price_usd, model.is_published)
      const pricePatch =
        decision.action === 'write' ? { price_usd: decision.price_usd, price_scraped_at: now, held_price_usd: null, held_at: null }
        : decision.action === 'confirm' ? { price_scraped_at: now, held_price_usd: null, held_at: null }
        : decision.action === 'hold' ? { held_price_usd: decision.price_usd, held_at: now }
        : {}
      const { error } = await supabase
        .from('component_listings').update({ ...listingFields, ...pricePatch }).eq('id', listing.id)
      if (error) throw new Error(`listing update: ${error.message}`)

      if (decision.action === 'hold') {
        console.log(`  → ${label} — price $${listing.price_usd} → $${decision.price_usd} (${Math.round(decision.change * 100)}%) HELD for review; live price unchanged`)
        outcome = 'proposed'
      } else if (decision.action === 'write') {
        console.log(`  ✓ ${label} — price $${listing.price_usd ?? '—'} → $${decision.price_usd}`)
        outcome = 'updated'
      } else {
        console.log(`  = ${label} — unchanged`)
        outcome = 'unchanged'
      }
    }

    if (item.category === 'panel' && item.panel) await writePanelSpec(supabase, model.id, item)
    if (item.category === 'battery' && item.battery) await writeBatterySpec(supabase, model.id, item.battery, label)
    return outcome
  } catch (err) {
    console.error(`  ✗ ${label}: ${(err as Error).message}`)
    return 'failed'
  }
}
