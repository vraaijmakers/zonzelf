import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rechargeCheck } from '../recharge'
import { energyChain, arrayWatts } from '../system-efficiency'

const close = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${b}, got ${a}`)

const base = {
  arrayWatts: 2000,
  peakSunHours: 5,
  arrayDerate: 0.8,
  fromBatteryKwh: 10 / 0.85,
  batteryRoundTrip: 0.97,
}

test('an array sized by the shared model closes the loop at those sun hours', () => {
  // The whole point of one efficiency model: recommended watts at a given
  // peak-sun figure must, by construction, refill the bank at that figure.
  const chain = energyChain({ rawKwh: 10, inverter: 0.85, batteryRoundTrip: 0.97, array: 0.8 })
  const watts = arrayWatts(chain.fromArrayKwh, 2.5)
  const result = rechargeCheck({
    arrayWatts: watts,
    peakSunHours: 2.5,
    arrayDerate: 0.8,
    fromBatteryKwh: chain.fromBatteryKwh,
    batteryRoundTrip: 0.97,
  })
  assert.equal(result.closes, true)
  close(result.ratio, 1, 1e-9)
})

test('the same array fails the loop in a 1h December', () => {
  const chain = energyChain({ rawKwh: 10, inverter: 0.85, batteryRoundTrip: 0.97, array: 0.8 })
  const watts = arrayWatts(chain.fromArrayKwh, 2.5)
  const winter = rechargeCheck({
    arrayWatts: watts,
    peakSunHours: 1.0,
    arrayDerate: 0.8,
    fromBatteryKwh: chain.fromBatteryKwh,
    batteryRoundTrip: 0.97,
  })
  assert.equal(winter.closes, false)
  close(winter.ratio, 1 / 2.5, 1e-9)
  assert.ok(winter.shortfallKwh > 0)
})

test('generated energy is watts × hours × derate', () => {
  const r = rechargeCheck(base)
  close(r.generatedKwh, 2000 * 5 * 0.8 / 1000)
  close(r.intoBatteryKwh, base.fromBatteryKwh / 0.97)
  close(r.deliveredKwh, r.generatedKwh * 0.97)
})

test('a zero load vacuously closes; a zero array with a load does not', () => {
  const empty = rechargeCheck({ ...base, fromBatteryKwh: 0 })
  assert.equal(empty.closes, true)
  assert.equal(empty.ratio, 1)
  assert.equal(empty.shortfallKwh, 0)

  const noArray = rechargeCheck({ ...base, arrayWatts: 0 })
  assert.equal(noArray.closes, false)
  assert.equal(noArray.generatedKwh, 0)
  assert.ok(noArray.shortfallKwh > 0)
})

test('degenerate input never yields NaN or Infinity', () => {
  for (const bad of [Number.NaN, -10, Number.POSITIVE_INFINITY]) {
    const r = rechargeCheck({
      arrayWatts: bad,
      peakSunHours: bad,
      arrayDerate: bad,
      fromBatteryKwh: bad,
      batteryRoundTrip: bad,
    })
    assert.ok(Number.isFinite(r.generatedKwh), `generated not finite for ${bad}`)
    assert.ok(Number.isFinite(r.intoBatteryKwh), `intoBattery not finite for ${bad}`)
    assert.ok(Number.isFinite(r.deliveredKwh), `delivered not finite for ${bad}`)
    assert.ok(Number.isFinite(r.ratio), `ratio not finite for ${bad}`)
    assert.ok(r.generatedKwh >= 0 && r.shortfallKwh >= 0)
  }
})

test('zero peak sun with a real load does not close', () => {
  const r = rechargeCheck({ ...base, peakSunHours: 0 })
  assert.equal(r.closes, false)
  assert.equal(r.generatedKwh, 0)
})
