import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  recommendedSystemVoltage,
  systemVoltageAdvice,
  SYSTEM_VOLTAGES,
  VOLTAGE_STEP_KWH,
  SYSTEM_VOLTAGE_SOURCE,
} from '../system-voltage'

test('the bands are the ones the copy claims, at both edges', () => {
  assert.equal(recommendedSystemVoltage(1.9), 12)
  assert.equal(recommendedSystemVoltage(VOLTAGE_STEP_KWH.to24), 24)
  assert.equal(recommendedSystemVoltage(5.9), 24)
  assert.equal(recommendedSystemVoltage(VOLTAGE_STEP_KWH.to48), 48)
  assert.equal(recommendedSystemVoltage(60), 48)
})

test('a bigger bank never recommends a lower voltage', () => {
  // Monotonicity is the property that makes this safe to show as advice: a
  // user adding load must never be told to step DOWN in voltage.
  let previous = 0
  for (let kwh = 0; kwh <= 80; kwh += 0.1) {
    const v = recommendedSystemVoltage(kwh)
    assert.ok(v >= previous, `at ${kwh} kWh: ${v} is below the previous ${previous}`)
    previous = v
  }
})

test('only the three voltages the picker offers are ever returned', () => {
  for (let kwh = 0; kwh <= 200; kwh += 0.37) {
    assert.ok(
      (SYSTEM_VOLTAGES as readonly number[]).includes(recommendedSystemVoltage(kwh)),
      `${kwh} kWh produced a voltage the picker cannot select`,
    )
  }
})

test('junk input falls to the safest floor rather than throwing', () => {
  assert.equal(recommendedSystemVoltage(0), 12)
  assert.equal(recommendedSystemVoltage(-5), 12)
  assert.equal(recommendedSystemVoltage(NaN), 12)
  assert.equal(recommendedSystemVoltage(Infinity), 48)
})

test('the bug this file exists for: a big daily load no longer sits on 24V', () => {
  // 27.82 kWh/day over two days of autonomy is a bank far above the 48V
  // threshold. The page used to render "48V is recommended" beside a
  // pre-selected 24V; the advice must now name 48 and disagree with 24.
  const bankKwh = 27.82 * 2
  const advice = systemVoltageAdvice(bankKwh, 24)
  assert.equal(advice.recommended, 48)
  assert.equal(advice.agrees, false)
  assert.match(advice.why, /48V/)
})

test('advice agrees when the selection already matches', () => {
  const advice = systemVoltageAdvice(30, 48)
  assert.equal(advice.agrees, true)
  assert.equal(advice.recommended, 48)
})

test('the reasoning is given whether or not the selection agrees', () => {
  // A verdict with no derivation is what the old sentence was.
  for (const chosen of [12, 24, 48]) {
    const advice = systemVoltageAdvice(9, chosen)
    assert.ok(advice.why.length > 0, `no reasoning given for a ${chosen}V selection`)
    assert.match(advice.why, /9 kWh/)
  }
})

test('the source names the quantity, and says it is not a code requirement', () => {
  // The original sentence failed precisely by not naming what "2 kWh" measured,
  // while sitting under a field measuring something else.
  assert.match(SYSTEM_VOLTAGE_SOURCE, /bank size, not to daily consumption/i)
  assert.match(SYSTEM_VOLTAGE_SOURCE, /not a code requirement/i)
  assert.match(SYSTEM_VOLTAGE_SOURCE, /continuous power/i)
})
