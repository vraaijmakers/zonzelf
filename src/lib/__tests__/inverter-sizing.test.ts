import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  peakDemand, inverterFit, suggestedContinuousW, CONTINUOUS_HEADROOM,
  INVERTER_PRESETS,
} from '../inverter-sizing'
import { normalizeSurge, suggestedSurge, ALL_PRESETS } from '../appliance-load'

test('a row saved before surge existed counts as 1x', () => {
  assert.equal(normalizeSurge(undefined), 1)
  assert.equal(normalizeSurge(NaN), 1)
  // Never below 1 — a "surge" that reduces the draw is not a surge.
  assert.equal(normalizeSurge(0.5), 1)
  // A typo must not size a 60 kW inverter.
  assert.equal(normalizeSurge(400), 10)
})

test('demand with no surging load is just everything running at once', () => {
  const d = peakDemand([
    { watts: 100, hours: 5, qty: 2 },
    { watts: 50, hours: 3, qty: 1 },
  ])
  assert.equal(d.continuousW, 250)
  assert.equal(d.surgeW, 250)
  assert.equal(d.driver, null)
})

test('surge is the largest SINGLE start-up, never the sum of them', () => {
  // Two 3x motors. Summing both surges would give 200 + 400 + 800 = 1400W.
  // Only the harder one starts at any moment: 600 running + 800 extra.
  const d = peakDemand([
    { name: 'Small pump', watts: 200, hours: 1, qty: 1, surge: 3 },
    { name: 'Well pump', watts: 400, hours: 1, qty: 1, surge: 3 },
  ])
  assert.equal(d.continuousW, 600)
  assert.equal(d.surgeHeadroomW, 800)
  assert.equal(d.surgeW, 1400)
  assert.equal(d.driver?.name, 'Well pump')
})

test('quantity multiplies the running load but not the start-up', () => {
  // Two identical fridges both run; they do not start in the same half-second.
  const d = peakDemand([{ name: 'Fridge', watts: 150, hours: 24, qty: 2, surge: 3 }])
  assert.equal(d.continuousW, 300)
  assert.equal(d.surgeHeadroomW, 300, 'one unit surging, not both')
  assert.equal(d.surgeW, 600)
})

test('the driver is the biggest surge, not the biggest load', () => {
  // The heater draws far more but is resistive; the pump sets the surge.
  const d = peakDemand([
    { name: 'Heater', watts: 1500, hours: 4, qty: 1 },
    { name: 'Pump', watts: 400, hours: 1, qty: 1, surge: 3 },
  ])
  assert.equal(d.largestSingleW, 1500)
  assert.equal(d.driver?.name, 'Pump')
  assert.equal(d.continuousW, 1900)
  assert.equal(d.surgeHeadroomW, 800)
  assert.equal(d.surgeW, 2700)
})

test('an empty list produces zeroes, never NaN', () => {
  const d = peakDemand([])
  assert.equal(d.continuousW, 0)
  assert.equal(d.surgeW, 0)
  assert.equal(d.largestSingleW, 0)
  assert.equal(d.driver, null)
})

test('fit reports tight rather than collapsing it into pass or fail', () => {
  const d = peakDemand([{ watts: 1000, hours: 4, qty: 1 }])
  // Exactly enough continuously, but under the headroom target.
  const tight = inverterFit({ acContinuousW: 1000, acSurgeW: 2000 }, d)
  assert.equal(tight.continuous, 'tight')
  const ok = inverterFit({ acContinuousW: 1000 * (1 + CONTINUOUS_HEADROOM), acSurgeW: 2000 }, d)
  assert.equal(ok.continuous, 'ok')
  const short = inverterFit({ acContinuousW: 900, acSurgeW: 2000 }, d)
  assert.equal(short.continuous, 'short')
})

test('an unstated surge column reads as unknown, never as a pass', () => {
  const d = peakDemand([{ watts: 400, hours: 1, qty: 1, surge: 3 }])
  const fit = inverterFit({ acContinuousW: 5000, acSurgeW: undefined }, d)
  assert.equal(fit.surge, 'unknown')
  assert.equal(fit.surgeRatio, null)
  // The continuous half is still judged normally.
  assert.equal(fit.continuous, 'ok')
})

test('a unit that carries the load but not the start-up is called short', () => {
  // 400W pump at 3x wants 1200W peak; a 1000W/1000W unit trips.
  const d = peakDemand([{ watts: 400, hours: 1, qty: 1, surge: 3 }])
  const fit = inverterFit({ acContinuousW: 1000, acSurgeW: 1000 }, d)
  assert.equal(fit.continuous, 'ok')
  assert.equal(fit.surge, 'short')
})

test('the suggested size clears the demand with headroom', () => {
  const d = peakDemand([{ watts: 2000, hours: 4, qty: 1 }])
  const size = suggestedContinuousW(d)
  assert.ok(size !== null && size >= 2000 * (1 + CONTINUOUS_HEADROOM))
})

test('a demand past the biggest common size returns null rather than lying', () => {
  const d = peakDemand([{ watts: 40000, hours: 1, qty: 1 }])
  assert.equal(suggestedContinuousW(d), null)
})

test('every preset carrying a surge factor offers it to a row that lacks one', () => {
  const withSurge = ALL_PRESETS.filter(p => p.surgeFactor !== undefined)
  assert.ok(withSurge.length > 20, 'the motor presets should all be tagged')
  for (const p of withSurge) {
    assert.equal(suggestedSurge(p.name, undefined), p.surgeFactor, p.name)
    // Already correct — nothing to offer.
    assert.equal(suggestedSurge(p.name, p.surgeFactor), undefined, p.name)
  }
})

test('inverter-driven mini-splits are not tagged as hard-starting compressors', () => {
  // The distinction is the point: tagging a soft-start mini-split at 3x would
  // oversize an inverter by thousands of watts for a spike that never happens.
  const mini = ALL_PRESETS.find(p => p.name === 'Mini-split (12,000 BTU)')
  const window = ALL_PRESETS.find(p => p.name === 'Window AC (12,000 BTU)')
  assert.equal(mini?.surgeFactor, 1.5)
  assert.equal(window?.surgeFactor, 3)
})

test('resistive loads carry no surge factor at all', () => {
  for (const name of ['Electric heater (1.5kW)', 'Toaster', 'Laptop', 'Water heater (elec)']) {
    const p = ALL_PRESETS.find(x => x.name === name)
    assert.equal(p?.surgeFactor, undefined, name)
  }
})

test('every admitted preset cites a manufacturer datasheet and a sane window', () => {
  // The list is empty today by design — the gate is what is being locked here,
  // so that the first row added has to satisfy it.
  for (const spec of INVERTER_PRESETS) {
    assert.ok(/^https:\/\//.test(spec.sourceUrl), `${spec.model}: needs a source`)
    assert.ok(spec.mpptMinV < spec.mpptMaxV, `${spec.model}: window is inverted`)
    assert.ok(
      spec.mpptMaxV <= spec.pvMaxInputV,
      `${spec.model}: the tracking ceiling cannot exceed the damage ceiling`,
    )
    assert.ok(spec.pvMaxCurrentA > 0 && spec.pvMaxPowerW > 0, `${spec.model}: PV limits missing`)
  }
})
