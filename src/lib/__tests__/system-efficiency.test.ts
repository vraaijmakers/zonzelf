// Locks the one efficiency model. Before this existed, the load, battery and
// panel calculators each applied losses differently, and because the stages
// feed each other the disagreement multiplied down the chain.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  energyChain, bankKwh, arrayWatts, panelCount, panelCountBand, surplusPercent, describeChain, DEFAULTS, BOUNDS,
} from '../system-efficiency'

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${b}, got ${a}`)

test('the battery pays only the inverter; the array pays everything', () => {
  const c = energyChain({ rawKwh: 10, inverter: 0.85, batteryRoundTrip: 0.97, array: 0.8 })
  close(c.fromBatteryKwh, 10 / 0.85)
  close(c.fromArrayKwh, 10 / 0.85 / 0.97 / 0.8)
  assert.ok(c.fromArrayKwh > c.fromBatteryKwh, 'the array must always generate more than the battery delivers')
})

test('every loss makes the requirement larger, never smaller', () => {
  const c = energyChain({ rawKwh: 5 })
  assert.ok(c.fromBatteryKwh > c.rawKwh, 'inverter losses must increase the battery draw')
  assert.ok(c.fromArrayKwh > c.fromBatteryKwh, 'storage and array losses must increase generation')
})

test('battery chemistry actually changes array sizing', () => {
  // The bug: battery.efficiency was defined per chemistry and never applied.
  // Flooded lead-acid at 80% round trip must demand a meaningfully bigger array
  // than lithium at 97%.
  // The figures the app actually uses: midpoints of the ranges the batteries
  // guide publishes, not the best case of each.
  const lithium = energyChain({ rawKwh: 10, batteryRoundTrip: 0.965 })
  const flooded = energyChain({ rawKwh: 10, batteryRoundTrip: 0.75 })
  assert.ok(flooded.fromArrayKwh > lithium.fromArrayKwh)
  const ratio = flooded.fromArrayKwh / lithium.fromArrayKwh
  assert.ok(ratio > 1.25 && ratio < 1.32, `expected ~29% more array, got ${((ratio - 1) * 100).toFixed(1)}%`)

  // Bank sizing is unaffected by round trip — the bank does not pay it.
  close(lithium.fromBatteryKwh, flooded.fromBatteryKwh)
})

test('the old model undersized the array', () => {
  // Old panel maths: raw / arrayEfficiency, with no inverter and no round trip.
  const oldWay = 10 / 0.8
  const now = energyChain({ rawKwh: 10, batteryRoundTrip: 0.965 }).fromArrayKwh
  assert.ok(now > oldWay, 'the corrected chain must ask for more generation, not less')
})

test('defaults are applied when a stage is not specified', () => {
  const c = energyChain({ rawKwh: 1 })
  assert.equal(c.inverter, DEFAULTS.inverter)
  assert.equal(c.array, DEFAULTS.array)
  assert.equal(c.batteryRoundTrip, DEFAULTS.batteryRoundTrip)
})

test('efficiencies are clamped rather than allowed to produce nonsense', () => {
  const high = energyChain({ rawKwh: 1, inverter: 5, array: 5, batteryRoundTrip: 5 })
  assert.equal(high.inverter, BOUNDS.inverter.max)
  assert.equal(high.array, BOUNDS.array.max)
  assert.equal(high.batteryRoundTrip, BOUNDS.batteryRoundTrip.max)

  const low = energyChain({ rawKwh: 1, inverter: -1, array: 0, batteryRoundTrip: -3 })
  assert.equal(low.inverter, BOUNDS.inverter.min)
  assert.equal(low.array, BOUNDS.array.min)
  assert.equal(low.batteryRoundTrip, BOUNDS.batteryRoundTrip.min)

  // No efficiency may be zero, or the chain divides by zero.
  assert.ok(BOUNDS.inverter.min > 0 && BOUNDS.array.min > 0 && BOUNDS.batteryRoundTrip.min > 0)
})

test('degenerate input never yields NaN or Infinity', () => {
  for (const raw of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
    const c = energyChain({ rawKwh: raw })
    assert.ok(Number.isFinite(c.fromBatteryKwh), `fromBatteryKwh not finite for raw=${raw}`)
    assert.ok(Number.isFinite(c.fromArrayKwh), `fromArrayKwh not finite for raw=${raw}`)
    assert.ok(c.fromBatteryKwh >= 0 && c.fromArrayKwh >= 0)
  }
})

test('bank sizing divides by depth of discharge and scales with autonomy', () => {
  close(bankKwh(10, 2, 0.8), 25)
  close(bankKwh(10, 1, 0.5), 20)
  // Lead-acid at 50% DoD needs a bigger bank than lithium at 80% for the same energy.
  assert.ok(bankKwh(10, 2, 0.5) > bankKwh(10, 2, 0.8))
  assert.equal(bankKwh(10, 0, 0.8), 0)
})

test('array watts divides generation by peak sun hours, and guards zero sun', () => {
  close(arrayWatts(5, 5), 1000)
  close(arrayWatts(5, 2.5), 2000)
  assert.equal(arrayWatts(5, 0), 0, 'zero peak sun must not divide by zero')
  assert.equal(arrayWatts(5, -1), 0)
})

test('panel count rounds up and never divides by zero', () => {
  assert.equal(panelCount(1000, 400), 3)
  assert.equal(panelCount(800, 400), 2)
  assert.equal(panelCount(0, 400), 0)
  assert.equal(panelCount(1000, 0), 0)
  assert.equal(panelCount(1000, -400), 0)
  assert.equal(panelCount(Number.NaN, 400), 0)
})

test('a panel band is always low to high, even when winter is sunnier', () => {
  assert.deepEqual(panelCountBand(21, 18), { min: 18, max: 21 })
  assert.deepEqual(panelCountBand(8, 20), { min: 8, max: 20 })
  assert.deepEqual(panelCountBand(12, 12), { min: 12, max: 12 })
  assert.equal(panelCountBand(0, 0), null)
})

test('34 kWh/day at 5h and 500W is 21 panels under the lithium chain — not a 12-panel kit', () => {
  // The SunGold SGR-10K25S (12 × 550W, 10 kW inverter, 25.6 kWh battery) quotes
  // 26 kWh/day as nameplate × 4h with no losses. This load is a different
  // system: 34 kWh at the SOCKET, so the array has to cover inverter, round
  // trip and derate as well.
  const c = energyChain({ rawKwh: 34.05, inverter: 0.85, batteryRoundTrip: 0.965, array: 0.8 })
  assert.equal(panelCount(arrayWatts(c.fromArrayKwh, 5), 500), 21)
})

test('a 12 × 550W kit at 4h delivers ~17 kWh at the socket, not the 26 kWh on the box', () => {
  const nameplateKwh = 12 * 550 * 4 / 1000
  assert.ok(Math.abs(nameplateKwh - 26.4) < 0.05)
  const delivered = 12 * 550 * 4 * 0.8 * 0.965 * 0.85 / 1000
  assert.ok(delivered > 17 && delivered < 18, `got ${delivered.toFixed(2)} kWh`)
})

test('surplus percent is null when the target is zero, never NaN', () => {
  close(surplusPercent(12, 10) ?? NaN, 20)
  assert.equal(surplusPercent(5, 0), null)
  assert.equal(surplusPercent(5, Number.NaN), null)
  assert.equal(surplusPercent(Number.NaN, 10), null)
  assert.equal(surplusPercent(0, 0), null)
})

test('the description states the same numbers the maths produced', () => {
  const c = energyChain({ rawKwh: 10, inverter: 0.85, batteryRoundTrip: 0.97, array: 0.8 })
  const text = describeChain(c)
  assert.ok(text.includes(c.fromBatteryKwh.toFixed(2)), 'copy must quote the computed battery figure')
  assert.ok(text.includes(c.fromArrayKwh.toFixed(2)), 'copy must quote the computed array figure')
  assert.ok(text.includes('85%') && text.includes('97%') && text.includes('80%'))
})
