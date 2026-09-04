import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BATTERY_PRESETS, findBatteryPreset, batteryPresetsFor, presetVoltageFamily,
} from '../battery-preset'
import { reviewBatteryPreset } from '../battery-preset-review'
import { worstSeverity } from '../battery-review'

test('every admitted battery preset passes review with no failures', () => {
  assert.ok(BATTERY_PRESETS.length > 0, 'the library should not be empty any more')
  const ids = BATTERY_PRESETS.map(p => p.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate preset id')
  for (const spec of BATTERY_PRESETS) {
    assert.match(spec.sourceUrl, /^https:\/\//, spec.model)
    const flags = reviewBatteryPreset(spec)
    assert.notEqual(
      worstSeverity(flags), 'fail',
      `${spec.model}: ${flags.filter(f => f.severity === 'fail').map(f => f.message).join('; ')}`,
    )
  }
})

test('the SG48100P matches its manual, including the 16S derivation', () => {
  const p = BATTERY_PRESETS.find(x => x.model === 'SG48100P')
  assert.ok(p, 'SG48100P should be in the library')
  assert.equal(p.id, 'sungold-sg48100p')
  assert.equal(p.chemistry, 'lifepo4')
  assert.equal(p.voltage, 51.2)
  assert.equal(presetVoltageFamily(p), 48)
  assert.equal(p.capacityAh, 100)
  assert.equal(p.capacityKwh, 5.12)
  // The sheet prints 51.2 V, not "16S". 16 × 3.2 is the number the SPH menu needs.
  assert.equal(p.seriesCount, 16)
  assert.equal(p.seriesCount * 3.2, p.voltage)

  // The disagreement this row exists to preserve: 54.5 from the battery sheet,
  // not the SPH L16 boost of 56.8.
  assert.equal(p.recommendedChargeV, 54.5)
  assert.notEqual(p.recommendedChargeV, 56.8)
  assert.equal(p.chargeLimitV, 57.6)
  assert.equal(p.fullChargeV, 56)
  assert.equal(p.fullChargeCutoffA, 5)
  assert.equal(p.dischargeCutoffV, 43.2)

  assert.equal(p.socMinPct, 20)
  assert.equal(p.socMaxPct, 95)
  assert.equal(p.cycleDodPct, 80)

  assert.equal(p.standardChargeA, 50)
  assert.equal(p.maxChargeA, 100)
  assert.equal(p.maxDischargeA, 100)
  assert.equal(p.maxParallel, 63)

  assert.deepEqual(p.comms, ['can', 'rs485', 'rs232'])
  assert.equal(p.canBaud, 500_000)
  assert.equal(p.rs485Baud, 9600)
  assert.equal(p.chargeMinC, 0)
  assert.equal(p.chargeMaxC, 45)
  assert.equal(p.dischargeMinC, -20)
  assert.equal(p.dischargeMaxC, 60)

  assert.match(p.sourceUrl, /SG48100P/)
  assert.equal(findBatteryPreset('sungold-sg48100p'), p)
})

test('the pack is offered for 48 V LiFePO4 and not for the other families', () => {
  assert.equal(batteryPresetsFor('lifepo4', 48).length, 1)
  assert.equal(batteryPresetsFor('lifepo4', 24).length, 0)
  assert.equal(batteryPresetsFor('agm', 48).length, 0)
})

test('review catches a 15S slip on a 51.2 V pack', () => {
  const good = BATTERY_PRESETS[0]
  const slipped = { ...good, seriesCount: 15 }
  const flags = reviewBatteryPreset(slipped)
  assert.equal(worstSeverity(flags), 'fail')
  assert.ok(flags.some(f => f.code === 'series-count'))
})

test('review refuses the inverter L16 boost copied onto the battery row', () => {
  const good = BATTERY_PRESETS[0]
  const flattened = { ...good, recommendedChargeV: 56.8 }
  const flags = reviewBatteryPreset(flattened)
  assert.equal(worstSeverity(flags), 'fail')
  assert.ok(flags.some(f => f.code === 'charge-per-cell'))
})

test('review catches swapped charge voltages, capacity math, and a frozen charge floor', () => {
  const good = BATTERY_PRESETS[0]
  assert.ok(reviewBatteryPreset({ ...good, recommendedChargeV: 57.6, chargeLimitV: 54.5 })
    .some(f => f.code === 'charge-order'))
  assert.ok(reviewBatteryPreset({ ...good, capacityKwh: 10 })
    .some(f => f.code === 'capacity-math'))
  assert.ok(reviewBatteryPreset({ ...good, chargeMinC: -20 })
    .some(f => f.code === 'charge-frozen'))
})
