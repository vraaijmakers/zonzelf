import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DIY_9KW_BOM, DIY_9KW_WATTS, US_INSTALLED_USD_PER_W, SECTION_232, INSTALLED_COST_SHARE,
  bomTotal, lineTotal, dollarsPerWatt, costLadder, floorUpliftFraction, upliftAgainstSystem, usd, pricedOnLabel,
} from '../solar-cost'

// THE ERROR THESE EXIST TO CATCH. The roadmap row that specified this page
// quoted "roughly $1.05/W" for this basket. The basket adds to $1.08/W. A
// stated total that disagrees with its own line items is exactly the decay
// this page is about, committed inside the page about it.
test('the ladder is derived from the line items, not asserted', () => {
  const [parts, withPermits, withLabour] = costLadder(DIY_9KW_BOM, DIY_9KW_WATTS)
  assert.equal(parts.total, 6250)
  assert.equal(parts.perWatt, 0.69)
  assert.equal(withPermits.total, 6750)
  assert.equal(withPermits.perWatt, 0.75)
  assert.equal(withLabour.total, 9750)
  assert.equal(withLabour.perWatt, 1.08)
})

test('every rung is the sum of its own lines', () => {
  const hardware = DIY_9KW_BOM.filter(l => l.group === 'hardware')
  assert.equal(bomTotal(DIY_9KW_BOM, ['hardware']), hardware.reduce((s, l) => s + lineTotal(l), 0))
  assert.equal(bomTotal(DIY_9KW_BOM), DIY_9KW_BOM.reduce((s, l) => s + lineTotal(l), 0))
})

// Doing the work yourself deletes labour. It does not delete the county.
test('permits are their own rung, and DIY does not remove them', () => {
  const groups = new Set(DIY_9KW_BOM.map(l => l.group))
  assert.ok(groups.has('permit') && groups.has('labour'))
  assert.notEqual(
    bomTotal(DIY_9KW_BOM, ['hardware']),
    bomTotal(DIY_9KW_BOM, ['hardware', 'permit']),
    'permits must not be folded into hardware',
  )
})

test('the DIY build lands well under an installed price for the same watts', () => {
  const diy = dollarsPerWatt(bomTotal(DIY_9KW_BOM, ['hardware', 'permit']), DIY_9KW_WATTS)
  assert.ok(diy < US_INSTALLED_USD_PER_W / 3, `${diy} should be under a third of installed`)
})

test('dollarsPerWatt refuses to divide by a nonsense array size', () => {
  assert.equal(dollarsPerWatt(9750, 0), 0)
  assert.equal(dollarsPerWatt(9750, -1), 0)
  assert.equal(dollarsPerWatt(9750, Number.NaN), 0)
})

// THE PAGE'S CENTRAL ARITHMETIC. Identical policy, two very different numbers
// depending on what you divide by — which is the reader this page is for.
test('the import floor is ~40% on a module and ~4% on an installed system', () => {
  const onModule = floorUpliftFraction(SECTION_232.medianModuleUsdPerW, SECTION_232.moduleFloorUsdPerW)
  assert.ok(onModule > 0.39 && onModule < 0.41, `${onModule}`)

  const onSystem = upliftAgainstSystem(
    DIY_9KW_WATTS, SECTION_232.medianModuleUsdPerW, SECTION_232.moduleFloorUsdPerW, US_INSTALLED_USD_PER_W,
  )
  assert.ok(onSystem > 0.03 && onSystem < 0.04, `${onSystem}`)
  assert.ok(onModule > onSystem * 10, 'the whole point is the order-of-magnitude gap')
})

test('a market price already above the floor means no uplift, never a negative one', () => {
  assert.equal(floorUpliftFraction(0.5, 0.38) < 0, true)
  assert.equal(upliftAgainstSystem(9000, 0.5, 0.38, 3), 0)
})

test('floorUpliftFraction does not divide by zero', () => {
  assert.equal(floorUpliftFraction(0, 0.38), 0)
  assert.equal(floorUpliftFraction(Number.NaN, 0.38), 0)
})

test('the cell floor is below the module floor, as a cell is part of a module', () => {
  assert.ok(SECTION_232.cellFloorUsdPerW < SECTION_232.moduleFloorUsdPerW)
})

test('the effective date is after the proclamation date', () => {
  assert.ok(new Date(SECTION_232.effectiveOn) > new Date(SECTION_232.proclaimedOn))
})

test('the cost shares are fractions, and modules are the smallest of them', () => {
  for (const s of INSTALLED_COST_SHARE) {
    assert.ok(s.share > 0 && s.share < 1, `${s.label} share out of range`)
  }
  const modules = INSTALLED_COST_SHARE.find(s => s.label.includes('modules'))!
  assert.ok(INSTALLED_COST_SHARE.every(s => s.share >= modules.share))
})

test('usd formats without cents and with separators', () => {
  assert.equal(usd(9750), '$9,750')
  assert.equal(usd(27000), '$27,000')
  assert.equal(usd(1.4), '$1')
})

// A slashed date is ambiguous to half this site's readers, which is why
// battery-price.ts formats dates by hand. The first draft of the cost guide
// rendered 15/09/2026 and a screenshot caught it.
test('the basket date renders unambiguously, never as slashes', () => {
  assert.equal(pricedOnLabel('2026-09-15'), '15 Sep 2026')
  assert.ok(!pricedOnLabel().includes('/'))
  assert.equal(pricedOnLabel('not-a-date'), 'not-a-date')
})
