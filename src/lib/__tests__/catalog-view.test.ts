import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  catalogStatus, cecDisagreements, cheapestUnitPrice, dollarsPerWatt, parseInverterVerification,
  parsePanelVerification, unitPrice, type ListingRow,
} from '../catalog-view'

const NOW = new Date('2026-09-30T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

function listing(over: Partial<ListingRow>): ListingRow {
  return {
    id: 1, retailer: 'Signature Solar', url: 'https://x', title: 't', pack_qty: 1, min_order_qty: 1,
    price_usd: 100, price_scraped_at: daysAgo(1), held_price_usd: null, held_at: null, ...over,
  }
}

test('status follows the review order, and hidden and published win', () => {
  const m = { is_published: false, is_hidden: false }
  assert.equal(catalogStatus(m, null), 'unspecced')
  assert.equal(catalogStatus(m, { spec_source: 'retailer', verified_at: null }), 'unspecced')
  assert.equal(catalogStatus(m, { spec_source: 'cec', verified_at: null }), 'candidate')
  assert.equal(catalogStatus(m, { spec_source: 'datasheet', verified_at: daysAgo(0) }), 'verified')
  assert.equal(catalogStatus({ ...m, is_published: true }, { spec_source: 'datasheet', verified_at: daysAgo(0) }), 'published')
  assert.equal(catalogStatus({ ...m, is_hidden: true }, { spec_source: 'cec', verified_at: null }), 'hidden')
})

// Signature Solar's Trina Vertex 420W: $125.45 single, $4,365 for a pallet of 36.
test('a pallet is compared per panel, and wins when it is cheaper per panel', () => {
  const single = listing({ id: 1, price_usd: 125.45 })
  const pallet = listing({ id: 2, price_usd: 4365, pack_qty: 36 })
  assert.equal(unitPrice(pallet), 121.25)
  const best = cheapestUnitPrice([single, pallet], NOW)!
  assert.equal(best.listing.id, 2)
  assert.equal(dollarsPerWatt(best.price, 420)!.toFixed(3), '0.289')
})

test('a stale price cannot win cheapest, and an unpriced listing is skipped', () => {
  const dead = listing({ id: 1, price_usd: 50, price_scraped_at: daysAgo(60) })
  const live = listing({ id: 2, price_usd: 90 })
  const none = listing({ id: 3, price_usd: null })
  assert.equal(cheapestUnitPrice([dead, live, none], NOW)!.listing.id, 2)
  assert.equal(cheapestUnitPrice([dead, none], NOW), null)
})

// The SG550WM as its manufacturer datasheet states it (re-read 2026-09-30).
const SG550WM: Record<string, string> = {
  watts_stc: '550', voc_stc: '49.7', vmp_stc: '41.0', isc_stc: '14.03', imp_stc: '13.45',
  beta_voc_pct: '-0.35', beta_pmax_pct: '-0.38', alpha_isc_pct: '0.06', max_series_fuse_a: '25',
  length_mm: '2278', width_mm: '1134', thickness_mm: '35', weight_kg: '28.3',
  datasheet_url: 'https://cdn.shopify.com/s/files/1/0323/4090/2025/files/182Mono550W-SG550WM-20260720.pdf',
}
const form = (values: Record<string, string>) => (name: string) => values[name] ?? null
const SGP = { brand: 'Sun Gold Power', model: 'SG550WM' }

test('the real SG550WM datasheet verifies', () => {
  const r = parsePanelVerification(form(SG550WM), SGP)
  assert.equal(r.ok, true)
  assert.equal(r.ok && r.spec.beta_voc_pct, -0.35)
  assert.equal(r.ok && r.spec.weight_kg, 28.3)
})

test('swapped Voc and Vmp are refused by the physics check, not just flagged', () => {
  const r = parsePanelVerification(form({ ...SG550WM, voc_stc: '41.0', vmp_stc: '49.7' }), SGP)
  assert.equal(r.ok, false)
  assert.match(!r.ok ? r.errors.join(' ') : '', /look swapped/)
})

test('a positive Voc coefficient is refused at the field', () => {
  const r = parsePanelVerification(form({ ...SG550WM, beta_voc_pct: '0.35' }), SGP)
  assert.equal(r.ok, false)
  assert.match(!r.ok ? r.errors[0] : '', /must be negative/)
})

test('verifying without the datasheet link is refused', () => {
  const r = parsePanelVerification(form({ ...SG550WM, datasheet_url: '' }), SGP)
  assert.equal(r.ok, false)
  assert.match(!r.ok ? r.errors.join(' ') : '', /datasheet URL/)
})

test('missing required fields and junk numbers are named', () => {
  const r = parsePanelVerification(form({ ...SG550WM, isc_stc: '', imp_stc: 'thirteen' }), SGP)
  assert.equal(r.ok, false)
  assert.deepEqual(!r.ok && r.errors, ['Isc (A) is required.', 'Imp (A): "thirteen" is not a number.'])
})

test('a decimal comma is read as a decimal point', () => {
  const r = parsePanelVerification(form({ ...SG550WM, voc_stc: '49,7' }), SGP)
  assert.equal(r.ok && r.spec.voc_stc, 49.7)
})

// The EG4 6000XP as INVERTER_PRESETS holds it — spec sheet VER 1.4.4.
const EG4: Record<string, string> = {
  kind: 'hybrid', ac_continuous_w: '6000', ac_surge_w: '12000', ac_surge_seconds: '3.5',
  dc_system_voltage: '48', pv_max_input_v: '480', mppt_min_v: '120', mppt_max_v: '385',
  mppt_start_v: '100', mppt_count: '2', pv_max_power_w: '8000', pv_max_current_a: '17',
  pv_max_isc_a: '25', max_charge_current_a: '125',
  datasheet_url: 'https://eg4electronics.com/wp-content/uploads/2024/04/EG4-6000XP-Inverter-Spec-Sheet.pdf',
}
const EG4_MODEL = { brand: 'EG4 Electronics', model: '6000XP' }

test('the real EG4 6000XP spec sheet verifies', () => {
  const r = parseInverterVerification(form(EG4), EG4_MODEL)
  assert.equal(r.ok, true)
  assert.equal(r.ok && r.spec.kind, 'hybrid')
})

test('a tracking window above the damage ceiling is refused', () => {
  const r = parseInverterVerification(form({ ...EG4, mppt_max_v: '500' }), EG4_MODEL)
  assert.equal(r.ok, false)
})

test('an inverter needs a kind and a whole number of trackers', () => {
  const r = parseInverterVerification(form({ ...EG4, kind: '', mppt_count: '1.5' }), EG4_MODEL)
  assert.equal(r.ok, false)
  assert.deepEqual(!r.ok && r.errors, ['Trackers must be a whole number.', 'Choose what kind of unit this is.'])
})

test('the SG550WM datasheet and the CEC list disagree on the Voc coefficient', () => {
  const gaps = cecDisagreements(
    { voc_stc: 49.7, isc_stc: 14.03, vmp_stc: 41.0, imp_stc: 13.45, beta_voc_pct: -0.35 },
    { voc_v: 49.9, isc_a: 14.01, vmp_v: 42, imp_a: 13.11, beta_voc_pct: -0.259 },
  )
  assert.deepEqual(gaps, [
    'Vmp: datasheet 41, CEC 42',
    'Imp: datasheet 13.45, CEC 13.11',
    'Voc temp. coefficient: datasheet -0.35, CEC -0.259',
  ])
})
