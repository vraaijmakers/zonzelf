import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SCRAPED_FIELDS,
  diffScrapedFields,
  proposalFrom,
  pickScrapedFields,
  sameProposal,
  mergeProposal,
  formatFieldValue,
  normalizeFieldValue,
} from '../battery-revision'
import { reviewBatteryModel, worstSeverity } from '../battery-review'

// A published EG4 row as it stands after scrape-eg4.ts created it and
// scrape-signaturesolar.ts filled in the reseller price.
const LIVE_ROW = {
  brand: 'EG4',
  model: 'LL-S 48V 100AH',
  sku: 'EG4LL48V100AV4',
  chemistry: 'lifepo4',
  voltage: 51.2,
  capacity_ah: 100,
  capacity_kwh: 5.12,
  dod_rated: 80,
  price_usd: 1299.99,
  source_url: 'https://eg4electronics.com/battery/ll-s-48v-100ah/',
  retailer: 'Signature Solar',
  retailer_url: 'https://signaturesolar.com/eg4-ll-s-lithium-battery-48v-100ah',
}

test('a re-scrape that found the same page proposes nothing', () => {
  const changes = diffScrapedFields(LIVE_ROW, { ...LIVE_ROW })
  assert.deepEqual(changes, [])
})

test('numeric columns compare as numbers, not as spellings', () => {
  // PostgREST hands numerics back as JSON numbers, a jsonb round-trip can
  // widen them to strings, and a scraper parses them out of HTML.
  const changes = diffScrapedFields(LIVE_ROW, {
    voltage: '51.2',
    capacity_kwh: '5.120',
    price_usd: '1299.99',
  })
  assert.deepEqual(changes, [], 'the same number spelled differently is not a change')
})

test('a scraped null never clears a value that is already there', () => {
  // The regression this rule exists for: scrape-eg4.ts emits price_usd: null
  // because EG4's own site lists no price, and before the gate every EG4
  // re-scrape wiped the Signature Solar affiliate price off all three rows.
  const changes = diffScrapedFields(LIVE_ROW, {
    ...LIVE_ROW,
    price_usd: null,
    dod_rated: null,
    sku: null,
  })
  assert.deepEqual(changes, [])
})

test('a field the scraper has no opinion on is left alone', () => {
  // scrape-eg4.ts never sets retailer at all — an absent key must not read as
  // "clear the retailer".
  const changes = diffScrapedFields(LIVE_ROW, { voltage: 51.2, capacity_ah: 100 })
  assert.deepEqual(changes, [])
})

test('filling an empty field is a real change', () => {
  const unpriced = { ...LIVE_ROW, price_usd: null, retailer: null }
  const changes = diffScrapedFields(unpriced, { price_usd: 1683.4, retailer: 'A1 SolarStore' })
  assert.deepEqual(
    changes.map(c => [c.field, c.from, c.to]),
    [['price_usd', null, 1683.4], ['retailer', null, 'A1 SolarStore']],
  )
})

test('an empty string is an absence, not a value', () => {
  assert.equal(normalizeFieldValue('sku', '  '), null)
  assert.deepEqual(diffScrapedFields(LIVE_ROW, { sku: '' }), [], 'a matched-but-empty tag found nothing')
})

test('a price change becomes a proposal carrying both sides', () => {
  const changes = diffScrapedFields(LIVE_ROW, { ...LIVE_ROW, price_usd: 1149 })
  const { proposed, previous } = proposalFrom(changes)
  assert.deepEqual(proposed, { price_usd: 1149 })
  assert.deepEqual(previous, { price_usd: 1299.99 })
})

test('applying a proposal cannot publish a row', () => {
  // The stored jsonb is filtered rather than spread, so nothing outside
  // SCRAPED_FIELDS can ride along into the update.
  const patch = pickScrapedFields({
    price_usd: 1149,
    is_published: true,
    id: 7,
    battery_model_id: 7,
  })
  assert.deepEqual(patch, { price_usd: 1149 })
  assert.ok(!SCRAPED_FIELDS.includes('is_published' as never), 'is_published must never be a scraped field')
})

test('a rejected proposal silences that exact claim and nothing else', () => {
  const rejected = { price_usd: 1149 }
  assert.ok(sameProposal(rejected, { price_usd: 1149 }))
  assert.ok(sameProposal(rejected, { price_usd: '1149.00' }), 'same number, different spelling')
  assert.ok(!sameProposal(rejected, { price_usd: 1099 }), 'a different price proposes again')
  assert.ok(!sameProposal(rejected, { price_usd: 1149, dod_rated: 90 }), 'a wider change proposes again')
  assert.ok(!sameProposal(rejected, { is_published: true }), 'an unrecognised key fails toward proposing')
  assert.ok(!sameProposal(null, { price_usd: 1149 }), 'nothing rejected yet means nothing suppressed')
})

test('the automated checks run against the row as it would be, not as it is', () => {
  // $32/kWh: the proposal picked up a shipping or deposit figure. The live row
  // passes; the candidate must not.
  assert.equal(worstSeverity(reviewBatteryModel(LIVE_ROW)), 'ok')
  const candidate = mergeProposal(LIVE_ROW, { price_usd: 164 })
  const flags = reviewBatteryModel(candidate)
  assert.ok(
    flags.some(f => f.code === 'price-range'),
    `expected a price-range flag on the candidate, got: ${flags.map(f => f.code).join(', ') || 'none'}`,
  )
})

test('a diff cell shows an absence as an absence', () => {
  assert.equal(formatFieldValue('price_usd', null), '—')
  assert.equal(formatFieldValue('price_usd', 1149), '$1149')
  assert.equal(formatFieldValue('voltage', '51.2'), '51.2V')
  assert.equal(formatFieldValue('dod_rated', 80), '80%')
})
