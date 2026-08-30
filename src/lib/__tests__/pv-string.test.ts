import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  vocAtTemperature, vmpAtTemperature, cellTempHot, vmpCoefficient,
  maxSeries, minSeries, stringFuseRequired, stringFuseOptions,
  checkArrangement, evaluateArrangements,
  stringVocProtectionView, stringCurrentProtectionView, stringFuseProtectionView,
  PV_IRRADIANCE_FACTOR, DEFAULT_CELL_RISE_C, DEFAULT_MPPT_HEADROOM,
  PANEL_PRESETS, EXAMPLE_PANEL, EXAMPLE_TRACKER,
  type PanelSpec, type TrackerSpec, type SiteConditions,
} from '../pv-string'
import { assertProtectionView } from '../calc-register'
import { reviewPanelSpec } from '../panel-review'
import { worstSeverity } from '../battery-review'

// The panel from the guide's worked example, and the one in the plan's
// regression case: 450W, Voc 49.5, betaVoc -0.28.
const PANEL: PanelSpec = {
  wattsStc: 450, vocStc: 49.5, vmpStc: 41.5, iscStc: 11.5, impStc: 10.9,
  betaVoc: -0.28, betaPmax: -0.35, maxSeriesFuseA: 20,
}
const TRACKER: TrackerSpec = {
  pvMaxInputV: 500, mpptMinV: 120, mpptMaxV: 450, pvMaxCurrentA: 25, pvMaxPowerW: 8000,
}
const COLD: SiteConditions = { lowestExpectedC: -20, designHighC: 35 }

test('Voc rises as it gets colder — the sign trap', () => {
  // 49.5 x [1 + (-0.28/100)(-45)] = 49.5 x 1.126 = 55.74
  const cold = vocAtTemperature(49.5, -0.28, -20)
  assert.ok(Math.abs(cold - 55.74) < 0.01, `got ${cold}`)
  assert.ok(cold > 49.5, 'colder must mean HIGHER, not lower')
  // At STC it is exactly nameplate.
  assert.equal(vocAtTemperature(49.5, -0.28, 25), 49.5)
  // And hotter is lower.
  assert.ok(vocAtTemperature(49.5, -0.28, 60) < 49.5)
})

test('Vmp sags in heat, and cell temperature is above air temperature', () => {
  assert.equal(cellTempHot(35), 35 + DEFAULT_CELL_RISE_C)
  const hot = vmpAtTemperature(41.5, -0.35, cellTempHot(35))
  // 41.5 x [1 + (-0.35/100)(65 - 25)] = 41.5 x 0.86 = 35.69
  assert.ok(Math.abs(hot - 35.69) < 0.01, `got ${hot}`)
  assert.ok(hot < 41.5)
})

test('Vmp never goes negative on an absurd coefficient', () => {
  assert.equal(vmpAtTemperature(40, -5, 100), 0)
})

test('the Vmp coefficient falls back in the documented order', () => {
  assert.deepEqual(vmpCoefficient({ ...PANEL, betaVmp: -0.4 }), { beta: -0.4, from: 'vmp' })
  assert.deepEqual(vmpCoefficient(PANEL), { beta: -0.35, from: 'pmax' })
  const bare = { ...PANEL, betaPmax: undefined }
  assert.deepEqual(vmpCoefficient(bare), { beta: -0.28, from: 'voc' })
  // The betaVoc fallback understates the sag, so it must be the LAST resort.
  const withPmax = vmpAtTemperature(41.5, vmpCoefficient(PANEL).beta, 65)
  const withVoc = vmpAtTemperature(41.5, vmpCoefficient(bare).beta, 65)
  assert.ok(withVoc > withPmax, 'the betaVoc fallback is the optimistic one')
})

test('THE REGRESSION CASE: 12 panels in series looks fine at STC and is not', () => {
  // What the datasheet implies.
  assert.equal(PANEL.vocStc * 12, 594)
  // What actually arrives on a -20 degC morning.
  const cold = vocAtTemperature(PANEL.vocStc, PANEL.betaVoc, -20) * 12
  assert.ok(cold > 668 && cold < 669, `got ${cold}`)
  assert.ok(cold > TRACKER.pvMaxInputV, 'this is the destroyed inverter')

  const check = checkArrangement(PANEL, TRACKER, COLD, 12, 1)
  assert.equal(check.exceedsDamageCeiling, true)
  assert.equal(check.safe, false)
  // 500 / 55.74 = 8.97 -> 8, never 9.
  assert.equal(maxSeries(PANEL, COLD, TRACKER.pvMaxInputV), 8)
})

test('the series limit floors and never rounds up', () => {
  // Contrived so the division is almost exactly a whole number.
  const panel = { ...PANEL, vocStc: 50, betaVoc: 0 }
  assert.equal(maxSeries(panel, { ...COLD, lowestExpectedC: 25 }, 500), 10)
  // One volt less of headroom must cost a whole panel.
  assert.equal(maxSeries(panel, { ...COLD, lowestExpectedC: 25 }, 499), 9)
})

test('a colder site allows fewer panels in series, never more', () => {
  let previous = Number.POSITIVE_INFINITY
  for (const lowestExpectedC of [10, 0, -10, -20, -30, -40]) {
    const n = maxSeries(PANEL, { ...COLD, lowestExpectedC }, TRACKER.pvMaxInputV)
    assert.ok(n <= previous, `${lowestExpectedC} degC allowed more than the warmer case`)
    previous = n
  }
})

test('the minimum series count respects the headroom target', () => {
  // At the bare floor the string only has to clear mpptMinV.
  const bare = minSeries(PANEL, COLD, TRACKER.mpptMinV, 0)
  const withHeadroom = minSeries(PANEL, COLD, TRACKER.mpptMinV, DEFAULT_MPPT_HEADROOM)
  assert.ok(withHeadroom >= bare)
  // Vmp hot is 35.69V; 120 x 1.25 = 150 -> ceil(150/35.69) = 5.
  assert.equal(withHeadroom, 5)
  assert.equal(bare, 4)
})

test('there is a workable band between the two limits for this pairing', () => {
  const lo = minSeries(PANEL, COLD, TRACKER.mpptMinV)
  const hi = maxSeries(PANEL, COLD, TRACKER.pvMaxInputV)
  assert.ok(lo <= hi, `no arrangement fits: ${lo}..${hi}`)
  const ok = checkArrangement(PANEL, TRACKER, COLD, 8, 1)
  assert.equal(ok.safe, true)
  assert.equal(ok.exceedsDamageCeiling, false)
  assert.equal(ok.belowWindow, false)
})

test('a string below the window is a capacity failure, not a safety one', () => {
  // Two in series: 71.4V hot, under the 120V floor.
  const check = checkArrangement(PANEL, TRACKER, COLD, 2, 1)
  assert.equal(check.belowWindow, true)
  assert.equal(check.exceedsDamageCeiling, false, 'nothing is damaged by too little voltage')
  assert.equal(check.safe, false, 'it still does not work')
})

test('the tracking ceiling and the damage ceiling are different verdicts', () => {
  // 9 in series: 501.7V cold — over BOTH here.
  const over = checkArrangement(PANEL, TRACKER, COLD, 9, 1)
  assert.equal(over.exceedsDamageCeiling, true)
  assert.equal(over.exceedsTrackingCeiling, false, 'damage takes precedence in reporting')
  // A unit whose window top is well under its absolute maximum.
  const wide = { ...TRACKER, mpptMaxV: 380, pvMaxInputV: 600 }
  const clipping = checkArrangement(PANEL, wide, COLD, 9, 1)
  assert.equal(clipping.exceedsDamageCeiling, false)
  assert.equal(clipping.exceedsTrackingCeiling, true)
  assert.equal(clipping.safe, true, 'clipping harvest is not a safety failure')
})

test('parallel is limited by current, with the irradiance factor applied', () => {
  const two = checkArrangement(PANEL, TRACKER, COLD, 6, 2)
  assert.equal(two.arrayIscA, 23)
  assert.ok(Math.abs(two.designIscA - 28.75) < 0.001)
  assert.equal(two.exceedsCurrent, true, '28.75A is past the 25A input')
  const one = checkArrangement(PANEL, TRACKER, COLD, 6, 1)
  assert.ok(Math.abs(one.designIscA - 14.375) < 0.001)
  assert.equal(one.exceedsCurrent, false)
})

test('current has a damage limit and a harvest limit, like voltage', () => {
  // The EG4 6000XP's real pair: 17A usable, 25A short-circuit. A 6A panel at
  // 1.25 is 7.5A a string, so three strings is 22.5A — past what the tracker
  // converts, inside what it survives.
  const small = { ...PANEL, iscStc: 6 }
  const pair: TrackerSpec = { ...TRACKER, pvMaxCurrentA: 17, pvMaxIscA: 25 }

  const three = checkArrangement(small, pair, COLD, 4, 3)
  assert.equal(three.designIscA, 22.5)
  assert.equal(three.exceedsCurrent, false, '22.5A is inside the 25A short-circuit rating')
  assert.equal(three.exceedsUsableCurrent, true, '22.5A is past the 17A it can convert')
  assert.equal(three.safe, true, 'clipping current is not a safety failure')
  assert.equal(three.ideal, false, 'but it is not the arrangement to reach for')

  const four = checkArrangement(small, pair, COLD, 3, 4)
  assert.equal(four.designIscA, 30)
  assert.equal(four.exceedsCurrent, true, '30A is past the 25A rating')
  assert.equal(four.safe, false)
})

test('a single stated current figure is treated as the damage limit', () => {
  // The conservative reading, matching the single-voltage rule.
  const only: TrackerSpec = { ...TRACKER, pvMaxCurrentA: 17, pvMaxIscA: undefined }
  const small = { ...PANEL, iscStc: 6 }
  const three = checkArrangement(small, only, COLD, 4, 3)
  assert.equal(three.designIscA, 22.5)
  assert.equal(three.exceedsCurrent, true, 'with one figure, 22.5A must be refused')
  assert.equal(three.exceedsUsableCurrent, false, 'never both at once')
})

test('the current protection view is sized against the short-circuit rating', () => {
  const small = { ...PANEL, iscStc: 6 }
  const pair: TrackerSpec = { ...TRACKER, pvMaxCurrentA: 17, pvMaxIscA: 25 }
  const view = stringCurrentProtectionView(small, pair)
  assertProtectionView(view)
  // 25 / 7.5 = 3.33 -> 3 strings safe; 17 / 7.5 = 2.27 -> 2 without clipping.
  assert.equal(view.options.length, 3)
  const body = view.steps.map(x => x.body).join(' ')
  assert.match(body, /SHORT-CIRCUIT/)
  assert.match(body, /17A/, 'the usable figure must appear as the harvest limit')
})

test('string fusing flips at exactly three parallel strings', () => {
  // (n-1) x 11.5 x 1.25 against a 20A module fuse:
  //   n=2 -> 14.375A, under.  n=3 -> 28.75A, over.
  assert.equal(stringFuseRequired(1, 11.5, 20), false)
  assert.equal(stringFuseRequired(2, 11.5, 20), false)
  assert.equal(stringFuseRequired(3, 11.5, 20), true)
  assert.equal(stringFuseRequired(4, 11.5, 20), true)
})

test('an unknown module fuse rating returns null rather than guessing', () => {
  assert.equal(stringFuseRequired(4, 11.5, undefined), null)
  assert.deepEqual(stringFuseOptions(11.5, undefined), [])
})

test('string fuse options sit between 156% of Isc and the module rating', () => {
  // 11.5 x 1.25 x 1.25 = 17.97 -> 20A is the only standard size at or under 20.
  assert.deepEqual(stringFuseOptions(11.5, 20), [20])
  // A lower-current panel has more room.
  assert.deepEqual(stringFuseOptions(6, 20), [15, 20])
  // No room at all is reported as an empty set, never as a bigger fuse.
  assert.deepEqual(stringFuseOptions(15, 20), [])
})

test('arrangements are whole strings only', () => {
  const all = evaluateArrangements(PANEL, TRACKER, COLD, 12)
  for (const a of all) {
    assert.equal(a.series * a.parallel, 12)
    assert.equal(12 % a.series, 0)
  }
  // 12 factors as 1,2,3,4,6,12.
  assert.equal(all.length, 6)
})

test('the arrangement list puts workable options first', () => {
  const all = evaluateArrangements(PANEL, TRACKER, COLD, 8)
  const firstUnsafe = all.findIndex(a => !a.safe)
  const lastSafe = all.map(a => a.safe).lastIndexOf(true)
  if (firstUnsafe !== -1 && lastSafe !== -1) {
    assert.ok(lastSafe < firstUnsafe, 'a failing arrangement was sorted above a working one')
  }
})

test('when nothing is safe, the LEAST dangerous option is listed first', () => {
  // 12 panels against this tracker: every arrangement fails. Sorting the
  // failures by series count put 12S1P — 668V into a 500V input, a destroyed
  // inverter — at the top, which is the worst thing to show first.
  const all = evaluateArrangements(PANEL, TRACKER, COLD, 12)
  assert.ok(all.every(a => !a.safe), 'this fixture is meant to have no safe option')
  assert.equal(all[0].exceedsDamageCeiling, false, 'a destroying arrangement led the list')
  const destroying = all.findIndex(a => a.exceedsDamageCeiling)
  assert.ok(destroying > 0, 'the destroying arrangement must not be first')
  // And within the failures, a merely-sagging string outranks an over-current one.
  const harm = (c: typeof all[number]) =>
    (c.exceedsDamageCeiling ? 4 : 0) + (c.exceedsCurrent ? 2 : 0) + (c.belowWindow ? 1 : 0)
  for (let i = 1; i < all.length; i++) {
    assert.ok(harm(all[i - 1]) <= harm(all[i]), `row ${i} is less harmful than the one above it`)
  }
})

test('zero panels produces no arrangements rather than throwing', () => {
  assert.deepEqual(evaluateArrangements(PANEL, TRACKER, COLD, 0), [])
})

test('the Voc view is a set of series counts with the arithmetic shown', () => {
  const view = stringVocProtectionView(PANEL, TRACKER, COLD)
  assertProtectionView(view)
  assert.equal(view.options.length, 8)
  assert.equal(view.options[7], '8 in series')
  assert.ok(view.steps.some(s => /690\.7|lowest ambient/i.test(s.body + s.title)))
  assert.ok(view.sources.some(s => /690\.7/.test(s)))
  // The STC figure must appear, because that is the number that misleads.
  assert.ok(view.steps.some(s => /396/.test(s.body)), 'shows what STC would have implied')
})

test('the Voc view refuses the pairing when even one panel is over', () => {
  const tiny = { ...TRACKER, pvMaxInputV: 50 }
  const view = stringVocProtectionView(PANEL, tiny, COLD)
  assertProtectionView(view)
  assert.equal(view.options.length, 0)
  assert.match(view.empty ?? '', /cannot be used together/)
})

test('the current view is a set of parallel counts', () => {
  const view = stringCurrentProtectionView(PANEL, TRACKER)
  assertProtectionView(view)
  // 25 / (11.5 x 1.25) = 1.73 -> 1 string.
  assert.deepEqual(view.options, ['1 in parallel'])
  assert.ok(view.sources.some(s => /690\.8/.test(s)))
})

test('the fuse view says plainly when no fuses are needed', () => {
  const view = stringFuseProtectionView(PANEL, 2)
  assertProtectionView(view)
  assert.deepEqual(view.options, ['No string fuses required'])
  assert.ok(view.steps.some(s => /back-feed/i.test(s.body)))
})

test('the fuse view gives ratings once fusing is required', () => {
  const view = stringFuseProtectionView(PANEL, 3)
  assertProtectionView(view)
  assert.deepEqual(view.options, ['20 A per string'])
  assert.ok(view.steps.some(s => /28\.8A|28\.75A/.test(s.body)))
})

test('the fuse view asks for the missing rating instead of inventing one', () => {
  const view = stringFuseProtectionView({ ...PANEL, maxSeriesFuseA: undefined }, 4)
  assertProtectionView(view)
  assert.equal(view.options.length, 0)
  assert.match(view.empty ?? '', /module label/)
})

test('no protection view can headline a recommendation', () => {
  for (const view of [
    stringVocProtectionView(PANEL, TRACKER, COLD),
    stringCurrentProtectionView(PANEL, TRACKER),
    stringFuseProtectionView(PANEL, 3),
    stringFuseProtectionView(PANEL, 1),
  ]) {
    assert.doesNotThrow(() => assertProtectionView(view))
    assert.ok(!/\brecommended\b/i.test(view.title))
  }
})

test('the worked example is coherent and is nobody’s product', () => {
  // Vmp x Imp must land near the nameplate, or the example teaches a wrong shape.
  const implied = EXAMPLE_PANEL.vmpStc * EXAMPLE_PANEL.impStc
  assert.ok(Math.abs(implied - EXAMPLE_PANEL.wattsStc) / EXAMPLE_PANEL.wattsStc < 0.05)
  assert.ok(EXAMPLE_PANEL.vmpStc < EXAMPLE_PANEL.vocStc)
  assert.ok(EXAMPLE_PANEL.impStc < EXAMPLE_PANEL.iscStc)
  assert.ok(EXAMPLE_PANEL.betaVoc < 0, 'the coefficient is negative')
  assert.ok(EXAMPLE_TRACKER.mpptMaxV <= EXAMPLE_TRACKER.pvMaxInputV)
  assert.ok(EXAMPLE_TRACKER.mpptMinV < EXAMPLE_TRACKER.mpptMaxV)
})

test('every admitted panel preset satisfies the gate and passes review', () => {
  assert.ok(PANEL_PRESETS.length > 0, 'the panel library should not be empty any more')
  const ids = PANEL_PRESETS.map(p => p.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate panel preset id')
  for (const p of PANEL_PRESETS) {
    assert.ok(/^https:\/\//.test(p.sourceUrl), `${p.model}: needs a datasheet`)
    const flags = reviewPanelSpec(p)
    assert.notEqual(
      worstSeverity(flags), 'fail',
      `${p.model}: ${flags.filter(f => f.severity === 'fail').map(f => f.message).join('; ')}`,
    )
  }
})

test('the SG550WM matches its datasheet', () => {
  const p = PANEL_PRESETS.find(x => x.model === 'SG550WM')
  assert.ok(p, 'the Sun Gold SG550WM should be in the library')
  assert.equal(p.wattsStc, 550)
  assert.equal(p.vocStc, 49.7)
  assert.equal(p.vmpStc, 41.0)
  assert.equal(p.iscStc, 14.03)
  assert.equal(p.impStc, 13.45)
  assert.equal(p.betaVoc, -0.35)
  assert.equal(p.betaPmax, -0.38)
  assert.equal(p.maxSeriesFuseA, 25)
  // Vmp x Imp must land on the nameplate, or a row was read across.
  assert.ok(Math.abs(p.vmpStc * p.impStc - p.wattsStc) / p.wattsStc < 0.01)
})

test('a steep Voc coefficient costs real panels in a string', () => {
  // The SG550WM is at the steep end (-0.35%/degC), so it gains more voltage in
  // cold than most. Against a 500V input at a -25.9 degC design low it takes
  // eight in series where the STC label suggests ten — which is the entire
  // reason this correction exists.
  const p = PANEL_PRESETS.find(x => x.model === 'SG550WM')!
  const site: SiteConditions = { lowestExpectedC: -25.9, designHighC: 32 }
  assert.equal(Math.floor(500 / p.vocStc), 10, 'the naive STC answer')
  assert.equal(maxSeries(p, site, 500), 8, 'the corrected answer')
  const cold = vocAtTemperature(p.vocStc, p.betaVoc, -25.9)
  assert.ok(cold > 58 && cold < 59, `got ${cold}`)
})

test('panel review catches a dropped minus sign and a swapped pair', () => {
  const p = PANEL_PRESETS[0]
  assert.ok(reviewPanelSpec({ ...p, betaVoc: 0.35 }).some(f => f.code === 'beta-voc-sign'))
  assert.ok(reviewPanelSpec({ ...p, vmpStc: p.vocStc, vocStc: p.vmpStc }).some(f => f.code === 'vmp-above-voc'))
  assert.ok(reviewPanelSpec({ ...p, impStc: p.iscStc + 1 }).some(f => f.code === 'imp-above-isc'))
  // Nameplate read off another row.
  assert.ok(reviewPanelSpec({ ...p, wattsStc: 400 }).some(f => f.code === 'power-math'))
  // A fuse that would blow in normal sun.
  assert.ok(reviewPanelSpec({ ...p, maxSeriesFuseA: 10 }).some(f => f.code === 'fuse-below-isc'))
})

test('the irradiance factor is the code value, not a rounded one', () => {
  assert.equal(PV_IRRADIANCE_FACTOR, 1.25)
})

// ---------------------------------------------------------------------------
// The guide at /guides/strings-and-mppt prints worked numbers. A guide that
// disagrees with the calculator it teaches is worse than no guide, so every
// figure it states is locked here. If one of these fails, fix BOTH.
// ---------------------------------------------------------------------------

const GUIDE_SITE: SiteConditions = { lowestExpectedC: -12, designHighC: 35 }

test('guide: one example panel reaches 49.7V at -12 degC, 10.4% over label', () => {
  const cold = vocAtTemperature(EXAMPLE_PANEL.vocStc, EXAMPLE_PANEL.betaVoc, -12)
  assert.equal(cold.toFixed(1), '49.7')
  assert.equal(((cold / EXAMPLE_PANEL.vocStc - 1) * 100).toFixed(1), '10.4')
})

test('guide: the series table matches, including 11 panels being fatal', () => {
  const cold = vocAtTemperature(EXAMPLE_PANEL.vocStc, EXAMPLE_PANEL.betaVoc, -12)
  const expected: Record<number, [string, string]> = {
    8:  ['360', '397'],
    9:  ['405', '447'],
    10: ['450', '497'],
    11: ['495', '546'],
  }
  for (const [n, [stc, hot]] of Object.entries(expected)) {
    const count = Number(n)
    assert.equal((EXAMPLE_PANEL.vocStc * count).toFixed(0), stc, `${n} at STC`)
    assert.equal((cold * count).toFixed(0), hot, `${n} cold`)
  }
  // 11 x 45 = 495 looks safe against a 500V input and is not.
  assert.ok(EXAMPLE_PANEL.vocStc * 11 < EXAMPLE_TRACKER.pvMaxInputV)
  assert.ok(cold * 11 > EXAMPLE_TRACKER.pvMaxInputV)
  assert.equal(maxSeries(EXAMPLE_PANEL, GUIDE_SITE, EXAMPLE_TRACKER.pvMaxInputV), 10)
})

test('guide: the hot Vmp worked example matches', () => {
  assert.equal(cellTempHot(35), 65)
  const { beta, from } = vmpCoefficient(EXAMPLE_PANEL)
  assert.equal(from, 'pmax')
  const hot = vmpAtTemperature(EXAMPLE_PANEL.vmpStc, beta, 65)
  assert.equal(hot.toFixed(1), '32.3')
  // The guide's four-panel string at 129V.
  assert.equal((hot * 4).toFixed(0), '129')
})

test('guide: 5 in series is the minimum with headroom, 1 string per tracker', () => {
  assert.equal(minSeries(EXAMPLE_PANEL, GUIDE_SITE, EXAMPLE_TRACKER.mpptMinV), 5)
  const perString = EXAMPLE_PANEL.iscStc * PV_IRRADIANCE_FACTOR
  assert.equal(Math.floor(EXAMPLE_TRACKER.pvMaxCurrentA / perString), 1)
})

test('guide: the back-feed table matches, and 20 panels is exactly 8 kW', () => {
  const step = EXAMPLE_PANEL.iscStc * PV_IRRADIANCE_FACTOR
  assert.equal((step * 1).toFixed(1), '14.4')
  assert.equal((step * 2).toFixed(1), '28.8')
  assert.equal((step * 3).toFixed(1), '43.1')
  assert.equal(stringFuseRequired(2, EXAMPLE_PANEL.iscStc, EXAMPLE_PANEL.maxSeriesFuseA), false)
  assert.equal(stringFuseRequired(3, EXAMPLE_PANEL.iscStc, EXAMPLE_PANEL.maxSeriesFuseA), true)
  // 10 in series on each of two trackers, at 400W a panel.
  assert.equal(10 * 2 * EXAMPLE_PANEL.wattsStc, EXAMPLE_TRACKER.pvMaxPowerW)
})
