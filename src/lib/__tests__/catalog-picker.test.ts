import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  bestOffer, inverterOptions, panelOptions, presetIdFor,
  type CatalogInverterRow, type CatalogListingRow, type CatalogPanelRow,
} from '../catalog-picker'
import { INVERTER_PRESETS } from '../inverter-sizing'
import { PANEL_PRESETS } from '../pv-string'

const NOW = new Date('2026-09-30T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()
const SS = 'https://signaturesolar.com/'

function listing(over: Partial<CatalogListingRow>): CatalogListingRow {
  return { retailer: 'Signature Solar', url: `${SS}x/`, pack_qty: 1, min_order_qty: 1, price_usd: 100, price_scraped_at: daysAgo(1), ...over }
}

// The catalogue names models in full; commissioning keys on the preset id.
test('catalogue models map back to the preset they are, so commissioning keeps working', () => {
  assert.equal(presetIdFor({ brand: 'Sun Gold Power', model: 'SPH8048P 8kW Split-Phase Hybrid Inverter', mpn: 'SPH8048P' }, INVERTER_PRESETS), 'sungold-sph8048p')
  assert.equal(presetIdFor({ brand: 'Sun Gold Power', model: 'SPH10048P 10kW Split-Phase Hybrid Inverter', mpn: 'SPH10048P' }, INVERTER_PRESETS), 'sungold-sph10048p')
  assert.equal(presetIdFor({ brand: 'EG4 Electronics', model: '6000XP Off-Grid Inverter', mpn: 'EG4HYB6K00V2' }, INVERTER_PRESETS), 'eg4-6000xp')
  assert.equal(presetIdFor({ brand: 'Sun Gold Power', model: 'SG550WM 550W Monocrystalline Solar Panel', mpn: 'SG550WM' }, PANEL_PRESETS), 'sungold-sg550wm')
})

test('a preset model inside a longer part number, or under another brand, is not a match', () => {
  // "SPH8048P" must not match an "SPH8048PX"; a different brand never matches.
  assert.equal(presetIdFor({ brand: 'Sun Gold Power', model: 'SPH8048PX Something', mpn: null }, INVERTER_PRESETS), undefined)
  assert.equal(presetIdFor({ brand: 'EG4', model: '6000XP Off-Grid Inverter', mpn: null }, INVERTER_PRESETS), undefined)
})

test('the best offer is the cheapest current price per unit, and a pallet is divided by its size', () => {
  const offer = bestOffer([
    listing({ url: `${SS}single/`, price_usd: 125.45 }),
    listing({ url: `${SS}pallet/`, price_usd: 4365, pack_qty: 36 }),
  ], null, NOW)!
  assert.equal(offer.unitPrice, 121.25)
  assert.equal(offer.packQty, 36)
  assert.equal(offer.link.retailer, 'Signature Solar')
  assert.equal(offer.link.href, `${SS}pallet/`)
})

test('a stale price, a missing price, and a shop we cannot link never become the offer', () => {
  assert.equal(bestOffer([listing({ price_scraped_at: daysAgo(60) })], null, NOW), null)
  assert.equal(bestOffer([listing({ price_usd: null })], null, NOW), null)
  assert.equal(bestOffer([listing({ url: 'https://unknown-shop.example/p' })], null, NOW), null)
})

const EG4_SPECS = {
  kind: 'hybrid' as const, ac_continuous_w: 6000, ac_surge_w: 12000, ac_surge_seconds: 3.5,
  dc_system_voltage: 48, pv_max_input_v: 480, mppt_min_v: 120, mppt_max_v: 385, mppt_start_v: 100,
  mppt_count: 2, pv_max_power_w: 8000, pv_max_current_a: 17, pv_max_isc_a: 25, max_charge_current_a: 125,
}
function inverterRow(id: number, model: string, over: Partial<typeof EG4_SPECS> = {}): CatalogInverterRow {
  return {
    id, brand: 'EG4 Electronics', model, mpn: null, spec_sheet_url: 'https://eg4electronics.com/sheet.pdf',
    image_url: null, component_listings: [listing({})], inverter_specs: { ...EG4_SPECS, ...over },
  }
}
const demand = (continuousW: number, surgeW: number) => ({ continuousW, surgeHeadroomW: surgeW - continuousW, surgeW, largestSingleW: 0, driver: null })

test('inverters that cover the house come first, smallest adequate first; short ones last', () => {
  const opts = inverterOptions([
    inverterRow(1, '18kPV', { ac_continuous_w: 12000, ac_surge_w: 24000 }),
    inverterRow(2, '3000', { ac_continuous_w: 3000, ac_surge_w: 6000 }),
    inverterRow(3, '6000XP Off-Grid Inverter'),
  ], demand(4000, 9000) as never, NOW)
  assert.deepEqual(opts.map(o => [o.spec.model, o.covers]), [
    ['6000XP Off-Grid Inverter', 'yes'],
    ['18kPV', 'yes'],
    ['3000', 'no'],
  ])
  assert.equal(opts[0].id, 'eg4-6000xp')
})

test('covered without the 25% headroom is "tight", and no loads is "unknown"', () => {
  assert.equal(inverterOptions([inverterRow(1, 'X')], demand(5500, 9000) as never, NOW)[0].covers, 'tight')
  assert.equal(inverterOptions([inverterRow(1, 'X')], null, NOW)[0].covers, 'unknown')
})

test('a unit with no specs or no datasheet link is never offered', () => {
  const noSpecs = { ...inverterRow(1, 'X'), inverter_specs: null }
  const noSheet = { ...inverterRow(2, 'Y'), spec_sheet_url: null }
  assert.equal(inverterOptions([noSpecs, noSheet], null, NOW).length, 0)
})

function panelRow(id: number, watts: number, price: number | null): CatalogPanelRow {
  return {
    id, brand: 'Aptos Solar', model: `${watts}W`, mpn: null, spec_sheet_url: 'https://aptos.example/sheet.pdf', image_url: null,
    component_listings: price === null ? [] : [listing({ price_usd: price })],
    panel_specs: {
      watts_stc: watts, voc_stc: 40, vmp_stc: 33, isc_stc: 13, imp_stc: 12.5, beta_voc_pct: -0.26,
      beta_pmax_pct: -0.3, beta_vmp_pct: null, max_series_fuse_a: 25, length_mm: 1722, width_mm: 1134, weight_kg: 21.5, bifacial: false,
    },
  }
}

test('panels rank by price per watt, unpriced last', () => {
  const opts = panelOptions([panelRow(1, 400, 140), panelRow(2, 440, 132), panelRow(3, 550, null)], NOW)
  assert.deepEqual(opts.map(o => o.id), ['catalog-2', 'catalog-1', 'catalog-3'])
  assert.equal(opts[0].dollarsPerWatt!.toFixed(2), '0.30')
  assert.equal(opts[0].spec.betaVoc, -0.26)
})
