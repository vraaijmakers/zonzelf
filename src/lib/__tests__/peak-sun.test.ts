import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PEAK_SUN_REGIONS, DEFAULT_ANNUAL, DEFAULT_WORST_MONTH,
  highlightedRegion, normalizePeakSun, regionForAnnual, regionForHours, seasonalRatio,
  worstMonthIsSunnier,
} from '../peak-sun'

test('every region has a worst month strictly below its annual figure', () => {
  for (const r of PEAK_SUN_REGIONS) {
    assert.ok(r.annual > 0, `${r.region} annual must be positive`)
    assert.ok(r.worstMonth > 0, `${r.region} worst month must be positive`)
    assert.ok(r.worstMonth < r.annual, `${r.region}: worst month ${r.worstMonth}h is not below annual ${r.annual}h`)
    assert.ok(r.worstMonthName.length > 0, `${r.region} must name the month`)
  }
})

test('the published annual figures did not change', () => {
  // The panel page already taught these numbers. Relabelling them as annual
  // must not quietly retune the estimate.
  const byRegion = Object.fromEntries(PEAK_SUN_REGIONS.map(r => [r.region, r.annual]))
  assert.equal(byRegion['Netherlands / Belgium'], 2.5)
  assert.equal(byRegion['UK / Ireland'], 2.8)
  assert.equal(byRegion['Germany / Austria'], 3.0)
  assert.equal(byRegion['Texas / Arizona (US)'], 5.5)
  assert.equal(byRegion['Australia (avg)'], 5.5)
})

test('Netherlands December is about 1 hour, not the annual 2.5', () => {
  const nl = PEAK_SUN_REGIONS.find(r => r.region.startsWith('Netherlands'))
  assert.ok(nl)
  assert.equal(nl.worstMonth, 1.0)
  assert.equal(nl.worstMonthName, 'December')
})

test('Australia winter is June, not December', () => {
  const au = PEAK_SUN_REGIONS.find(r => r.region.startsWith('Australia'))
  assert.ok(au)
  assert.equal(au.worstMonthName, 'June')
})

test('defaults match Germany, whose worst month is 1h', () => {
  const de = regionForAnnual(DEFAULT_ANNUAL)
  assert.ok(de)
  assert.equal(de.region, 'Germany / Austria')
  assert.equal(DEFAULT_WORST_MONTH, de.worstMonth)
})

test('normalizePeakSun clamps rather than emitting NaN', () => {
  assert.equal(normalizePeakSun(3), 3)
  assert.equal(normalizePeakSun(-1), 0)
  assert.equal(normalizePeakSun(99), 12)
  assert.equal(normalizePeakSun(Number.NaN), 0)
})

test('seasonal ratio is how much bigger the winter array is', () => {
  assert.equal(seasonalRatio(2.5, 1.0), 2.5)
  assert.equal(seasonalRatio(5.5, 3.5), 5.5 / 3.5)
  assert.equal(seasonalRatio(2.5, 0), null)
  assert.equal(seasonalRatio(Number.NaN, 1), null)
})

test('a sunnier "worst month" is not a ratio of "more panels"', () => {
  // The screenshot bug: 5h annual with 6h December printed "0.8× more".
  assert.equal(seasonalRatio(5, 6), null)
  assert.equal(worstMonthIsSunnier(5, 6), true)
  assert.equal(worstMonthIsSunnier(2.5, 1), false)
})

test('5.0h annual is not enough to name a region — Spain and Florida share it', () => {
  assert.equal(regionForAnnual(5.0), undefined)
  assert.equal(regionForHours(5.0, 2.5)?.region, 'Spain / Italy (S)')
  assert.equal(regionForHours(5.0, 3.4)?.region, 'Florida (US)')
  assert.equal(regionForHours(5.0, 6), undefined)
})

test('one preset row highlights, never two — the 5.0h Spain/Florida collision', () => {
  // The screenshot bug: 5h annual lit both Spain / Italy (S) and Florida.
  assert.equal(highlightedRegion(5.0, 3.4)?.region, 'Florida (US)')
  assert.equal(highlightedRegion(5.0, 2.5)?.region, 'Spain / Italy (S)')
  // A custom worst month claims neither, so neither row takes the 5h.
  assert.equal(highlightedRegion(5.0, 4.0), undefined)
  // A unique annual figure still highlights on its own, custom worst month or not.
  assert.equal(highlightedRegion(2.5, 4.0)?.region, 'Netherlands / Belgium')
  // Clicking any preset highlights that preset and no other.
  for (const r of PEAK_SUN_REGIONS) {
    assert.equal(highlightedRegion(r.annual, r.worstMonth), r, `${r.region} must select itself`)
  }
})
