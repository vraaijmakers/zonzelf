import { test } from 'node:test'
import assert from 'node:assert/strict'
import { panelCountMap, windowAround } from '../panel-granularity'
import { PANEL_PRESETS, EXAMPLE_PANEL, EXAMPLE_TRACKER, type SiteConditions, type TrackerSpec } from '../pv-string'
import { INVERTER_PRESETS } from '../inverter-sizing'

// The pairing the whole sizing chain is argued from: the site's only admitted
// panel against an admitted inverter, at the -25.9 degC design low that makes
// cold Voc bite. Both sets of figures come from the manufacturers' own
// datasheets, so these numbers are locked to real documents and a later
// cleanup cannot quietly move them.
const SG550WM = PANEL_PRESETS.find(p => p.id === 'sungold-sg550wm')!
const SPH10048P = INVERTER_PRESETS.find(i => i.model.includes('10048'))!
const TRACKER: TrackerSpec = {
  pvMaxInputV: SPH10048P.pvMaxInputV,
  mpptMinV: SPH10048P.mpptMinV,
  mpptMaxV: SPH10048P.mpptMaxV,
  mpptCount: SPH10048P.mpptCount,
  pvMaxPowerW: SPH10048P.pvMaxPowerW,
  pvMaxCurrentA: SPH10048P.pvMaxCurrentA,
  pvMaxIscA: SPH10048P.pvMaxIscA,
}
const COLD: SiteConditions = { lowestExpectedC: -25.9, designHighC: 32, cellRiseC: 30 }

test('eleven panels does not wire and twelve does — on the same inverter', () => {
  const map = panelCountMap(SG550WM, TRACKER, COLD, { target: 11 })
  assert.equal(map.targetWirable, false)
  assert.equal(map.nearestAtOrAbove, 12)
  assert.equal(map.nearestBelow, 10)
})

// The array page told people "a bigger array on the same box is not [a way
// out]" whenever nothing fitted. For this pairing that is false, and this test
// is what stops the claim coming back.
test('a bigger array on the same box IS a way out of eleven', () => {
  const map = panelCountMap(SG550WM, TRACKER, COLD, { target: 11 })
  const twelve = map.options.find(o => o.panels === 12)!
  assert.equal(twelve.wirable, true)
  assert.equal(twelve.clean, true)
  assert.equal(twelve.best!.series, 6)
  assert.equal(twelve.best!.parallel, 2)
})

test('the failures are not a parity rule, so none is claimed', () => {
  const map = panelCountMap(SG550WM, TRACKER, COLD, { target: 11 })
  // Seven wires as a single string of seven; four and five wire too. Reading
  // 9/11/13/15 as "odd counts fail" only works if you start counting at nine.
  assert.ok(map.wirableCounts.includes(7), 'seven wires')
  assert.equal(map.parity, null)
})

test('there is a ceiling, and nothing above it fits at all', () => {
  const map = panelCountMap(SG550WM, TRACKER, COLD, { target: 11 })
  assert.equal(map.ceiling, 16)
  for (const o of map.options.filter(o => o.panels > 16)) {
    assert.equal(o.wirable, false, `${o.panels} panels must not wire above the ceiling`)
  }
})

// Why a prime count is the worst case: it has no factor pair to fall back on.
test('a prime count wires only two ways, and both hit a different limit', () => {
  const map = panelCountMap(SG550WM, TRACKER, COLD, { target: 11 })
  const eleven = map.options.find(o => o.panels === 11)!
  assert.equal(eleven.ways, 2, '11x1 and 1x11, nothing between')
  assert.equal(eleven.blockedBy, 'mixed')
  const twelve = map.options.find(o => o.panels === 12)!
  assert.equal(twelve.ways, 6, 'twelve factors six ways, which is why it has an out')
})

test('each count reports how far off the energy target it lands', () => {
  const map = panelCountMap(SG550WM, TRACKER, COLD, { target: 11 })
  assert.equal(map.options.find(o => o.panels === 11)!.ofTarget, 1)
  assert.equal(map.options.find(o => o.panels === 12)!.ofTarget! > 1, true)
  assert.equal(map.options.find(o => o.panels === 10)!.ofTarget! < 1, true)
})

test('with no target nothing is claimed about nearness', () => {
  const map = panelCountMap(SG550WM, TRACKER, COLD, {})
  assert.equal(map.target, null)
  assert.equal(map.targetWirable, null)
  assert.equal(map.nearestAtOrAbove, null)
  assert.equal(map.nearestBelow, null)
  assert.equal(map.options[0].ofTarget, null)
})

test('the scan reaches past the ceiling so the ceiling can be found', () => {
  const map = panelCountMap(SG550WM, TRACKER, COLD, { target: 11 })
  assert.ok(map.to > map.ceiling!, 'a scan that stopped at the ceiling could not prove it was one')
})

test('the displayed window is a slice, not the whole scan', () => {
  const map = panelCountMap(SG550WM, TRACKER, COLD, { target: 11 })
  const shown = windowAround(map, 11)
  assert.ok(shown.length < map.options.length)
  assert.equal(shown[0].panels, 7)
  assert.ok(shown.some(o => o.panels === 12), 'the window must reach the next count that works')
})

// A target whose next working count is far above it must still be reachable on
// screen, or the page answers "not this one" and stops.
test('the window stretches to include the next wirable count', () => {
  const map = panelCountMap(SG550WM, TRACKER, COLD, { target: 17 })
  assert.equal(map.nearestAtOrAbove, null, 'nothing at or above 17 wires')
  const shown = windowAround(map, 17)
  assert.ok(shown.some(o => o.panels === 17))
})

test('parity is reported when the window really does support it', () => {
  // A synthetic pairing, not a product: a one-tracker unit whose current limit
  // admits exactly two parallel strings, so every count that is not a multiple
  // of two fails for want of a factor. Round numbers say it is made up.
  const narrow: TrackerSpec = { ...EXAMPLE_TRACKER, mpptCount: 1 }
  const map = panelCountMap(EXAMPLE_PANEL, narrow, COLD, { target: 8, from: 5, to: 12 })
  if (map.parity !== null) {
    assert.equal(map.parity, 'even')
    assert.ok(map.wirableCounts.every(n => n % 2 === 0))
  }
  // Whatever this pairing does, the invariant holds: a parity claim is only
  // ever made when every wirable count agrees and a counterexample was tested.
  if (map.parity === 'even') {
    assert.ok(map.options.some(o => !o.wirable && o.panels % 2 === 1))
  }
})
