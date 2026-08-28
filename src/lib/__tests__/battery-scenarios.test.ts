import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildScenarios, scenarioRange, roundBank, roundKwh, defaultOvernightShare,
  weatherAdjustedDailyKwh, DEFAULT_OVERCAST_FACTOR, DEFAULT_COLD_FACTOR,
} from '../battery-scenarios'

const base = {
  dailyDeliveredKwh: 32,
  overnightShare: 0.5,
  autonomyDays: 3,
  depthOfDischarge: 0.8,
  systemVoltage: 48,
}

test('overnight is smaller than one day, which is smaller than the extended run', () => {
  // The whole point: "1 day of autonomy" is NOT "survive the night", and the
  // old UI conflated them.
  const [night, oneDay, extended] = buildScenarios(base)
  assert.ok(night.bankKwh < oneDay.bankKwh, 'a night must need less than a full sunless day')
  assert.ok(oneDay.bankKwh < extended.bankKwh, 'three days must need more than one')
})

test('the scenarios reproduce the worked example', () => {
  // 32 kWh/day delivered, 50% after dark, 80% DoD.
  const [night, oneDay, extended] = buildScenarios(base)
  assert.equal(night.energyKwh, 16)
  assert.equal(night.bankKwh, 20)          // 16 / 0.8
  assert.equal(oneDay.bankKwh, 40)         // 32 / 0.8
  assert.equal(extended.bankKwh, 120)      // 96 / 0.8
  assert.equal(extended.bankAh, (120 * 1000) / 48)
})

test('the band spans the real decision, not a decorative +/-', () => {
  const { min, max } = scenarioRange(buildScenarios(base))
  assert.equal(min, 20)
  assert.equal(max, 120)
  assert.ok(max / min > 5, 'the spread is the point — it must not be collapsed')
})

test('depth of discharge scales every scenario, not just one', () => {
  const lithium = buildScenarios({ ...base, depthOfDischarge: 0.8 })
  const lead = buildScenarios({ ...base, depthOfDischarge: 0.5 })
  for (let i = 0; i < lithium.length; i++) {
    assert.ok(lead[i].bankKwh > lithium[i].bankKwh, `${lithium[i].id} should grow at lower DoD`)
    // Energy delivered is unchanged; only the bank needed to deliver it grows.
    assert.equal(lead[i].energyKwh, lithium[i].energyKwh)
  }
})

test('the default overnight share follows the dark hours', () => {
  assert.equal(defaultOvernightShare(12), 0.5)
  assert.equal(defaultOvernightShare(16), 16 / 24)   // Dutch December
  assert.equal(defaultOvernightShare(8), 8 / 24)     // Dutch June
  assert.equal(defaultOvernightShare(0), 0)
  assert.equal(defaultOvernightShare(30), 1, 'clamped to a whole day')
  assert.equal(defaultOvernightShare(-5), 0)
})

test('winter nights need a bigger bank than summer nights', () => {
  const june = buildScenarios({ ...base, overnightShare: defaultOvernightShare(8) })
  const december = buildScenarios({ ...base, overnightShare: defaultOvernightShare(16) })
  assert.ok(december[0].bankKwh > june[0].bankKwh)
  assert.ok(Math.abs(december[0].bankKwh / june[0].bankKwh - 2) < 1e-9, 'twice the dark, twice the bank')

  // Only the overnight case moves — a sunless day is a sunless day.
  assert.equal(june[1].bankKwh, december[1].bankKwh)
})

test('the extended label matches the number of days', () => {
  assert.equal(buildScenarios({ ...base, autonomyDays: 1 })[2].label, '1 sunless day')
  assert.equal(buildScenarios({ ...base, autonomyDays: 5 })[2].label, '5 sunless days')
})

test('degenerate input never yields NaN or a negative bank', () => {
  for (const bad of [Number.NaN, -10, Number.POSITIVE_INFINITY]) {
    for (const s of buildScenarios({ ...base, dailyDeliveredKwh: bad })) {
      assert.ok(Number.isFinite(s.bankKwh), `${s.id} bank not finite for ${bad}`)
      assert.ok(s.bankKwh >= 0)
      assert.ok(Number.isFinite(s.bankAh))
    }
  }
  // Zero volts must not divide by zero.
  for (const s of buildScenarios({ ...base, systemVoltage: 0 })) {
    assert.ok(Number.isFinite(s.bankAh))
  }
  // Autonomy below one day still means at least one day.
  assert.equal(buildScenarios({ ...base, autonomyDays: 0 })[2].energyKwh, base.dailyDeliveredKwh)
})

test('rounding drops precision the inputs do not justify', () => {
  assert.equal(roundBank(4.31), 4.5)
  assert.equal(roundBank(40.04), 40)
  assert.equal(roundBank(119.6), 120)
  assert.equal(roundBank(122), 120)
  assert.equal(roundBank(0), 0)
  assert.equal(roundBank(-5), 0)
})

test('every scenario explains what it assumes', () => {
  for (const s of buildScenarios(base)) {
    assert.ok(s.meaning.length > 30, `${s.id} needs a real explanation, not a label`)
    assert.ok(s.label.length > 0)
  }
})

test('an overcast day suppresses only the weather-driven part of the load', () => {
  // Raised in use: a sunless day is sunless because it is overcast, which means
  // cooler, which means a cooling load largely goes away. The shortage and the
  // load are anti-correlated, and treating load as constant overstates the bank.
  const constant = buildScenarios(base)
  const acHeavy = buildScenarios({ ...base, coolingShare: 0.75, overcastFactor: 0.35 })

  assert.ok(acHeavy[1].energyKwh < constant[1].energyKwh, 'a sunless day must need less when the load is weather-driven')
  assert.ok(acHeavy[2].energyKwh < constant[2].energyKwh)

  // 32 kWh, 75% weather-driven surviving at 35%: 32*0.25 + 32*0.75*0.35 = 16.4
  assert.ok(Math.abs(acHeavy[1].energyKwh - 16.4) < 1e-9, `got ${acHeavy[1].energyKwh}`)

  // The overnight case is unaffected — that is governed by the profiles, not weather.
  assert.equal(acHeavy[0].energyKwh, constant[0].energyKwh)
})

test('no suppression by default, so an absent breakdown never shrinks a bank', () => {
  const plain = buildScenarios(base)
  const explicit = buildScenarios({ ...base, coolingShare: 0, overcastFactor: 0.3 })
  assert.equal(plain[1].energyKwh, explicit[1].energyKwh)
  assert.equal(plain[1].energyKwh, base.dailyDeliveredKwh, 'a fully weather-independent load is unchanged')
})

test('a fully weather-driven load collapses to the overcast factor', () => {
  const s = buildScenarios({ ...base, coolingShare: 1, overcastFactor: 0.25 })
  assert.ok(Math.abs(s[1].energyKwh - base.dailyDeliveredKwh * 0.25) < 1e-9)
})

test('overcast inputs are clamped rather than inverting the model', () => {
  const over = buildScenarios({ ...base, coolingShare: 5, overcastFactor: 5 })
  assert.equal(over[1].energyKwh, base.dailyDeliveredKwh, 'factor above 1 must not increase the load')
  const under = buildScenarios({ ...base, coolingShare: -1, overcastFactor: -1 })
  assert.ok(under[1].energyKwh >= 0)
})

test('heating INCREASES the sunless-day load — the sign error this fixes', () => {
  // Alaska, not Florida. A cold grey day means the heating runs harder, so
  // demand rises exactly as generation falls. Treating heating like cooling
  // subtracted where it should add.
  const constant = buildScenarios(base)
  const heated = buildScenarios({ ...base, heatingShare: 0.6, coldFactor: 1.5 })

  assert.ok(heated[1].energyKwh > constant[1].energyKwh, 'a sunless day must need MORE with heating')
  assert.ok(heated[2].energyKwh > constant[2].energyKwh)

  // 32 kWh, 60% heating at 1.5x: 32*(0.4 + 0.6*1.5) = 32*1.3 = 41.6
  assert.ok(Math.abs(heated[1].energyKwh - 41.6) < 1e-9, `got ${heated[1].energyKwh}`)
})

test('cooling and heating move the sunless day in opposite directions', () => {
  const florida = buildScenarios({ ...base, coolingShare: 0.7, overcastFactor: 0.35 })
  const alaska = buildScenarios({ ...base, heatingShare: 0.7, coldFactor: 1.6 })
  assert.ok(florida[1].energyKwh < base.dailyDeliveredKwh, 'cooling shrinks the bad day')
  assert.ok(alaska[1].energyKwh > base.dailyDeliveredKwh, 'heating grows it')
  assert.ok(alaska[2].bankKwh > florida[2].bankKwh * 2,
    'the same load in a heating climate needs a far bigger bank')
})

test('a mixed load nets the two effects without double-counting', () => {
  const mixed = buildScenarios({
    ...base, coolingShare: 0.3, overcastFactor: 0.4, heatingShare: 0.3, coldFactor: 1.5,
  })
  // 0.4 neutral + 0.3*0.4 + 0.3*1.5 = 0.4 + 0.12 + 0.45 = 0.97
  assert.ok(Math.abs(mixed[1].energyKwh - base.dailyDeliveredKwh * 0.97) < 1e-9)
})

test('the cold factor can never behave like suppression', () => {
  // Floored at 1: a heating load must never shrink on a bad day, whatever the
  // slider says.
  const sabotage = buildScenarios({ ...base, heatingShare: 1, coldFactor: 0.2 })
  assert.ok(sabotage[1].energyKwh >= base.dailyDeliveredKwh)
  const absurd = buildScenarios({ ...base, heatingShare: 1, coldFactor: 99 })
  assert.ok(absurd[1].energyKwh <= base.dailyDeliveredKwh * 4, 'capped so a slider cannot run away')
})

test('weatherAdjustedDailyKwh is the same maths the scenarios use', () => {
  const typical = 10
  const adjusted = weatherAdjustedDailyKwh({
    typicalKwh: typical, coolingShare: 0.5, overcastFactor: DEFAULT_OVERCAST_FACTOR,
    heatingShare: 0.2, coldFactor: DEFAULT_COLD_FACTOR,
  })
  // 0.3 neutral + 0.5*0.4 + 0.2*1.5 = 0.3 + 0.2 + 0.3 = 0.8
  assert.ok(Math.abs(adjusted - 8) < 1e-9, `got ${adjusted}`)
  const [ , oneDay] = buildScenarios({
    ...base, dailyDeliveredKwh: typical, coolingShare: 0.5, overcastFactor: 0.4,
    heatingShare: 0.2, coldFactor: 1.5,
  })
  assert.equal(oneDay.energyKwh, adjusted)
})

test('roundKwh is the same function as roundBank', () => {
  assert.equal(roundKwh(4.31), roundBank(4.31))
  assert.equal(roundKwh(0), 0)
})

test('cooling and heating shares cannot together exceed the whole load', () => {
  const s = buildScenarios({ ...base, coolingShare: 0.8, heatingShare: 0.8, coldFactor: 2 })
  // heating is clamped into what cooling left, so the load never doubles.
  assert.ok(s[1].energyKwh <= base.dailyDeliveredKwh * 2)
  assert.ok(Number.isFinite(s[1].energyKwh))
})
