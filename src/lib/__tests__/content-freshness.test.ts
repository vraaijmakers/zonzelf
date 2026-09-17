import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  claimFreshness, needsReview, mustCaveat,
  CADENCE_POLICY, CADENCE_TECHNICAL, CADENCE_EVERGREEN,
  type Claim,
} from '../content-freshness'
import { GUIDE_CLAIMS, allClaims, claimsFor } from '../guide-claims'

const NOW = new Date('2026-09-16T12:00:00Z')
const MS_PER_DAY = 86_400_000
const isoDaysAgo = (n: number) =>
  new Date(NOW.getTime() - n * MS_PER_DAY).toISOString().slice(0, 10)

const claim = (over: Partial<Claim> = {}): Claim => ({
  id: 'test-claim',
  statement: 'A thing that could stop being true.',
  kind: 'policy',
  checkedOn: isoDaysAgo(1),
  source: 'Somewhere a maintainer can look again',
  ...over,
})

test('a claim checked yesterday is current, and says when it comes due', () => {
  const f = claimFreshness(claim(), NOW)
  assert.equal(f.kind, 'current')
  assert.equal(f.kind === 'current' && f.ageDays, 1)
  assert.equal(f.kind === 'current' && f.dueInDays, CADENCE_POLICY.warn - 1)
})

test('past the warn threshold CI asks, but the page does not change what it says', () => {
  const f = claimFreshness(claim({ checkedOn: isoDaysAgo(CADENCE_POLICY.warn + 1) }), NOW)
  assert.equal(f.kind, 'due')
  assert.equal(needsReview(f), true)
  assert.equal(mustCaveat(f), false)
})

test('past the stale threshold the page must caveat it', () => {
  const f = claimFreshness(claim({ checkedOn: isoDaysAgo(CADENCE_POLICY.stale + 1) }), NOW)
  assert.equal(f.kind, 'stale')
  assert.equal(f.kind === 'stale' && f.overdueDays, 1)
  assert.equal(mustCaveat(f), true)
})

test('both thresholds are inclusive — the boundary day itself has not lapsed', () => {
  assert.equal(claimFreshness(claim({ checkedOn: isoDaysAgo(CADENCE_POLICY.warn) }), NOW).kind, 'current')
  assert.equal(claimFreshness(claim({ checkedOn: isoDaysAgo(CADENCE_POLICY.stale) }), NOW).kind, 'due')
})

// The three cadences are the whole argument for not reviewing everything at one
// rate, so the ordering is asserted rather than left to the constants.
test('policy decays faster than technical, which decays faster than evergreen', () => {
  assert.ok(CADENCE_POLICY.warn < CADENCE_TECHNICAL.warn)
  assert.ok(CADENCE_TECHNICAL.warn < CADENCE_EVERGREEN.warn)
  assert.ok(CADENCE_POLICY.warn < CADENCE_POLICY.stale)
})

test('the same age reads differently depending on what kind of claim it is', () => {
  const at = isoDaysAgo(200)
  assert.equal(claimFreshness(claim({ kind: 'policy', checkedOn: at }), NOW).kind, 'stale')
  assert.equal(claimFreshness(claim({ kind: 'technical', checkedOn: at }), NOW).kind, 'current')
  assert.equal(claimFreshness(claim({ kind: 'evergreen', checkedOn: at }), NOW).kind, 'current')
})

// THE CASE THE AGE TEST CANNOT CATCH. The Section 232 import floor takes effect
// 4 Dec 2026 and 26 U.S.C. 25D already ended 31 Dec 2025: a claim checked
// yesterday is still wrong the morning after a published effective date passes.
test('a known change date supersedes a claim however recently it was checked', () => {
  const f = claimFreshness(
    claim({ checkedOn: isoDaysAgo(1), changesOn: isoDaysAgo(0) }),
    NOW,
  )
  assert.equal(f.kind, 'superseded')
  assert.equal(mustCaveat(f), true)
})

test('a change date still in the future does not disturb a fresh claim', () => {
  const soon = new Date(NOW.getTime() + 30 * MS_PER_DAY).toISOString().slice(0, 10)
  assert.equal(claimFreshness(claim({ changesOn: soon }), NOW).kind, 'current')
})

test('re-checking AFTER the change date clears it — that is how you answer the alarm', () => {
  const changed = isoDaysAgo(10)
  assert.equal(claimFreshness(claim({ checkedOn: isoDaysAgo(20), changesOn: changed }), NOW).kind, 'superseded')
  assert.equal(claimFreshness(claim({ checkedOn: isoDaysAgo(5), changesOn: changed }), NOW).kind, 'current')
})

test('a change date on the day itself counts as passed, not pending', () => {
  const today = NOW.toISOString().slice(0, 10)
  assert.equal(claimFreshness(claim({ checkedOn: isoDaysAgo(5), changesOn: today }), NOW).kind, 'superseded')
})

// Operator input, via the same reasoning battery-price.ts applies to a scrape
// timestamp: a date problem is never quietly rounded into "fine".
test('an unparseable date is unknown, and unknown must caveat', () => {
  for (const bad of ['', 'yesterday', '2026-13-40', '16-09-2026', '2026-09']) {
    const f = claimFreshness(claim({ checkedOn: bad }), NOW)
    assert.equal(f.kind, 'unknown', `${bad} should not parse`)
    assert.equal(mustCaveat(f), true)
  }
})

test('a future checkedOn is treated as today, not as a year of runway', () => {
  const future = new Date(NOW.getTime() + 400 * MS_PER_DAY).toISOString().slice(0, 10)
  const f = claimFreshness(claim({ checkedOn: future }), NOW)
  assert.equal(f.kind, 'current')
  assert.equal(f.kind === 'current' && f.ageDays, 0)
})

// The registry is data a human edits by hand, so it gets the same shape checks
// a scraped row would get.
test('every registered claim has a unique id within its guide and a real source', () => {
  for (const guide of GUIDE_CLAIMS) {
    const ids = guide.claims.map(c => c.id)
    assert.equal(new Set(ids).size, ids.length, `${guide.slug} has duplicate claim ids`)
    for (const c of guide.claims) {
      assert.ok(c.source.trim().length > 0, `${guide.slug}/${c.id} has no source`)
      assert.ok(c.statement.trim().length > 0, `${guide.slug}/${c.id} has no statement`)
      assert.notEqual(
        claimFreshness(c, NOW).kind, 'unknown',
        `${guide.slug}/${c.id} has an unparseable checkedOn`,
      )
    }
  }
})

test('every registered guide slug is a real route under src/app/guides', async () => {
  const { existsSync } = await import('node:fs')
  for (const guide of GUIDE_CLAIMS) {
    assert.ok(
      existsSync(new URL(`../../app/guides/${guide.slug}/page.tsx`, import.meta.url)),
      `${guide.slug} is registered but has no page`,
    )
  }
})

test('allClaims and claimsFor agree with the registry', () => {
  assert.equal(allClaims().length, GUIDE_CLAIMS.reduce((n, g) => n + g.claims.length, 0))
  assert.deepEqual(claimsFor('one-ground-system'), GUIDE_CLAIMS[0].claims)
  assert.deepEqual(claimsFor('a-guide-that-does-not-exist'), [])
})
