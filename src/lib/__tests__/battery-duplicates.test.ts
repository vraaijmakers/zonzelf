import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findLikelyDuplicates, relateDuplicate } from '../battery-review'

// The two rows the 2026-09-21 scheduled run put in front of a reviewer, which
// findLikelyDuplicates() grouped together and described with one identical
// sentence. One is the same battery twice; the other is two products.

const LIVE_ALL_WEATHER = {
  id: 5,
  brand: 'EG4',
  model: 'WallMount 280Ah All Weather Battery',
  sku: 'EG4LL48V100AODWMBV2',
  chemistry: 'lifepo4',
  voltage: 51.2,
  capacity_ah: 280,
  capacity_kwh: 14.34,
  dod_rated: 80,
  price_usd: 3124.99,
  is_published: true,
}

// EG4 now serves the same product at a second URL, so the scrape — which keys
// identity on source_url — inserted it again. Every field matches.
const FORKED_ALL_WEATHER = { ...LIVE_ALL_WEATHER, id: 35, is_published: false }

// Genuinely a different product: same brand, same 51.2V/280Ah, own SKU.
const INDOOR_280 = {
  id: 32,
  brand: 'EG4',
  model: 'WallMount 280Ah Indoor Battery',
  sku: 'EG4LP48V280AHIDWMBV2',
  chemistry: 'lifepo4',
  voltage: 51.2,
  capacity_ah: 280,
  capacity_kwh: 14.34,
  dod_rated: 80,
  price_usd: null,
  is_published: false,
}

test('the loose grouping still catches all three — that is its job', () => {
  const groups = findLikelyDuplicates([LIVE_ALL_WEATHER, FORKED_ALL_WEATHER, INDOOR_280])
  assert.equal(groups.get(35)?.length, 2)
  assert.equal(groups.get(32)?.length, 2)
})

test('a matching SKU is called what it is: the same battery twice', () => {
  const relation = relateDuplicate(FORKED_ALL_WEATHER, LIVE_ALL_WEATHER)
  assert.equal(relation.severity, 'fail')
  assert.match(relation.message, /Same SKU/)
  assert.match(relation.message, /already live/)
})

test('SKU is matched case- and whitespace-insensitively', () => {
  const relation = relateDuplicate(
    { ...FORKED_ALL_WEATHER, sku: ' eg4ll48v100aodwmbv2 ' },
    LIVE_ALL_WEATHER,
  )
  assert.equal(relation.severity, 'fail')
})

test('two different SKUs are not a duplicate, and the card should stop implying it', () => {
  const relation = relateDuplicate(INDOOR_280, LIVE_ALL_WEATHER)
  assert.equal(relation.severity, 'ok')
  assert.match(relation.message, /different SKU/)
})

test('no SKU on either side: identical specs warn, merely close ones say less', () => {
  const a = { ...INDOOR_280, sku: null }
  const b = { ...LIVE_ALL_WEATHER, sku: null }
  const identical = relateDuplicate(a, b)
  assert.equal(identical.severity, 'warn')
  assert.match(identical.message, /Every spec matches/)

  const differing = relateDuplicate({ ...a, capacity_ah: 278, capacity_kwh: 14.23 }, b)
  assert.equal(differing.severity, 'warn')
  assert.match(differing.message, /Close in size/)
})

test('a SKU on one side only cannot settle it either way', () => {
  const relation = relateDuplicate(FORKED_ALL_WEATHER, { ...LIVE_ALL_WEATHER, sku: null })
  assert.equal(relation.severity, 'warn')
})

test('an unpublished counterpart is described as pending, not as live', () => {
  const relation = relateDuplicate(FORKED_ALL_WEATHER, { ...LIVE_ALL_WEATHER, is_published: false })
  assert.match(relation.message, /waiting here/)
})
