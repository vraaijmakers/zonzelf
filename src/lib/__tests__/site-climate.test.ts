import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SITE_CLIMATES, SITE_CLIMATE_WINDOW, SITE_CLIMATE_SOURCE,
  siteById, sitesByRegion, searchSites, nearestSite, recordMargin,
  DEFAULT_DESIGN_LOW_C, DEFAULT_DESIGN_HIGH_C,
} from '../site-climate'

test('the table is big enough to be worth having, with unique ids', () => {
  // The place list in scripts/derive-site-climate.ts declares 91; Open-Meteo's
  // free tier rate-limits the heavy 30-year requests, so the file is filled in
  // over more than one run. The floor here is what makes the table WORTH
  // having against the ten regions it replaced, not the target — re-run the
  // script (it resumes from cache) and raise this as the rest land.
  assert.ok(SITE_CLIMATES.length >= 50, `only ${SITE_CLIMATES.length} places`)
  const ids = SITE_CLIMATES.map(s => s.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate site id')
})

test('every row is internally coherent', () => {
  for (const s of SITE_CLIMATES) {
    // The record is the single coldest day, so it can never be warmer than the
    // mean of the annual minimums.
    assert.ok(s.recordLowC <= s.designLowC, `${s.place}: record ${s.recordLowC} above design ${s.designLowC}`)
    assert.ok(s.recordHighC >= s.designHighC, `${s.place}: record high below design high`)
    assert.ok(s.designLowC < s.designHighC, `${s.place}: low is not below high`)
    // Sanity bounds — nothing on Earth's populated surface sits outside these.
    assert.ok(s.recordLowC > -70 && s.recordLowC < 30, `${s.place}: record low ${s.recordLowC} implausible`)
    assert.ok(s.recordHighC > 0 && s.recordHighC < 60, `${s.place}: record high ${s.recordHighC} implausible`)
    assert.ok(Math.abs(s.lat) <= 90 && Math.abs(s.lon) <= 180, `${s.place}: bad coordinates`)
    assert.ok(s.place.length > 1 && s.region.length > 1)
  }
})

test('the spread inside one region is why regions were abandoned', () => {
  // The justification for replacing the old ten-region table, asserted rather
  // than argued: a single "Arizona" figure cannot describe both of these, and
  // being wrong on the warm side is what destroys inverters.
  const phoenix = siteById('us-phoenix-az')
  const flagstaff = siteById('us-flagstaff-az')
  assert.ok(phoenix && flagstaff)
  assert.ok(
    phoenix.designLowC - flagstaff.designLowC > 8,
    `expected a wide spread, got ${phoenix.designLowC} vs ${flagstaff.designLowC}`,
  )
})

test('search finds a place by prefix, substring and region', () => {
  assert.ok(searchSites('phoen').some(s => s.id === 'us-phoenix-az'))
  assert.ok(searchSites('PHOENIX').some(s => s.id === 'us-phoenix-az'))
  assert.ok(searchSites('canada').length >= 4, 'region search should work')
  assert.deepEqual(searchSites(''), [])
  assert.deepEqual(searchSites('   '), [])
  assert.ok(searchSites('zzzzzz').length === 0)
})

test('search puts prefix matches above substring matches', () => {
  const hits = searchSites('port')
  assert.ok(hits.length > 0)
  assert.ok(hits[0].place.toLowerCase().startsWith('port'), `got ${hits[0].place} first`)
})

test('search respects its limit', () => {
  assert.ok(searchSites('a', 5).length <= 5)
})

test('grouping keeps every place exactly once', () => {
  const groups = sitesByRegion()
  const total = groups.reduce((n, g) => n + g.sites.length, 0)
  assert.equal(total, SITE_CLIMATES.length)
  assert.equal(new Set(groups.map(g => g.region)).size, groups.length, 'duplicate region group')
})

test('nearest site is a real distance, not a guess', () => {
  // Scottsdale, next to Phoenix.
  const near = nearestSite(33.49, -111.93)
  assert.ok(near)
  assert.equal(near.site.id, 'us-phoenix-az')
  assert.ok(near.km < 30, `${near.km}km is too far for Scottsdale`)
  // Mid-Atlantic — far from everything, and it must say so rather than throw.
  const far = nearestSite(30, -40)
  assert.ok(far && far.km > 1000)
  assert.equal(nearestSite(NaN, 0), null)
})

test('the record margin is only offered when it is meaningfully colder', () => {
  for (const s of SITE_CLIMATES) {
    const margin = recordMargin(s)
    if (margin !== null) {
      assert.ok(margin >= 0.5, `${s.place}: margin ${margin} should have been null`)
      assert.ok(Math.abs(margin - (s.designLowC - s.recordLowC)) < 0.06, `${s.place}: margin maths`)
    }
  }
})

test('the source line cites the window and the standard it implements', () => {
  assert.match(SITE_CLIMATE_SOURCE, /ERA5/)
  assert.match(SITE_CLIMATE_SOURCE, /690\.7/)
  assert.ok(SITE_CLIMATE_SOURCE.includes(SITE_CLIMATE_WINDOW.start))
  // It must admit what it is not.
  assert.match(SITE_CLIMATE_SOURCE, /grid|smooth/i)
})

test('the window is the thirty-year climatological period', () => {
  const years =
    Number(SITE_CLIMATE_WINDOW.end.slice(0, 4)) - Number(SITE_CLIMATE_WINDOW.start.slice(0, 4)) + 1
  assert.equal(years, 30)
})

test('the defaults are stated, plausible, and not pretending to be a site', () => {
  assert.ok(DEFAULT_DESIGN_LOW_C < 0 && DEFAULT_DESIGN_LOW_C > -30)
  assert.ok(DEFAULT_DESIGN_HIGH_C > 20 && DEFAULT_DESIGN_HIGH_C < 50)
  assert.equal(siteById(''), undefined)
  assert.equal(siteById('not-a-place'), undefined)
})
