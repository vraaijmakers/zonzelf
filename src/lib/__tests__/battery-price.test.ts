import { test } from 'node:test'
import assert from 'node:assert/strict'
import { priceDisplay, formatAsOf, PRICE_MAX_AGE_DAYS } from '../battery-price'

const NOW = new Date('2026-09-14T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

// The row that prompted all of this: EG4 LL-S 48V 100AH, $1,536.99 from a
// retailer that delisted it. The specs kept being re-confirmed, so scraped_at
// advanced to the same morning while the price quietly rotted.

test('a price confirmed this week is shown with its date', () => {
  const d = priceDisplay(1536.99, daysAgo(3), NOW)
  assert.equal(d.kind, 'dated')
  assert.equal(d.kind === 'dated' && d.price, 1536.99)
  assert.equal(d.kind === 'dated' && d.ageDays, 3)
})

test('a price nobody has confirmed in six weeks stops being repeated', () => {
  const d = priceDisplay(1536.99, daysAgo(PRICE_MAX_AGE_DAYS + 1), NOW)
  assert.equal(d.kind, 'stale')
  assert.equal(d.kind === 'stale' && d.ageDays, PRICE_MAX_AGE_DAYS + 1)
})

test('the cutoff itself still displays — the boundary is inclusive', () => {
  assert.equal(priceDisplay(1536.99, daysAgo(PRICE_MAX_AGE_DAYS), NOW).kind, 'dated')
})

// Rows written before the column existed. Hiding these would be a regression
// paid for by a migration, and dating them from scraped_at would invent a date
// the project does not have.
test('a price with no date is shown, but claims no date', () => {
  const d = priceDisplay(1536.99, null, NOW)
  assert.equal(d.kind, 'undated')
  assert.equal(d.kind === 'undated' && d.price, 1536.99)
})

test('an operator clearing the price leaves nothing to show', () => {
  assert.equal(priceDisplay(null, daysAgo(1), NOW).kind, 'none')
  assert.equal(priceDisplay(undefined, null, NOW).kind, 'none')
})

// A 0 or negative price is a parse failure wearing a number, not a free
// battery — parsePrice() reads it out of markup that can change shape.
test('a nonsense price is not a price', () => {
  assert.equal(priceDisplay(0, daysAgo(1), NOW).kind, 'none')
  assert.equal(priceDisplay(-5, daysAgo(1), NOW).kind, 'none')
  assert.equal(priceDisplay(Number.NaN, daysAgo(1), NOW).kind, 'none')
})

test('an unparseable timestamp degrades to undated, never to "Invalid Date"', () => {
  const d = priceDisplay(1536.99, 'not-a-timestamp', NOW)
  assert.equal(d.kind, 'undated')
})

// Clock skew between the scraper host and the reader is not freshness, but it
// is not staleness either.
test('a future date is clamped rather than treated as stale', () => {
  const d = priceDisplay(1536.99, daysAgo(-10), NOW)
  assert.equal(d.kind, 'dated')
  assert.equal(d.kind === 'dated' && d.ageDays, 0)
})

test('the as-of date is unambiguous about which number is the month', () => {
  assert.equal(formatAsOf(new Date('2026-09-14T12:00:00Z')), '14 Sep 2026')
})
