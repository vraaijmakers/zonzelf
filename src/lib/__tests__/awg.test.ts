// First tests in the repo. Deliberately starting here: conductor ampacity is
// the number that, when wrong, starts a fire, and it was wrong until now.
//
// Run with `npm test` (node:test via tsx — no new dependencies).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  AWG_SPECS, awgLabel, usableAmpacity, isOcpdLimited,
  evaluateGauges, passingGauges, thinnestByAmpacity,
  type TempColumn,
} from '../awg'

const spec = (awg: number) => {
  const s = AWG_SPECS.find(s => s.awg === awg)
  assert.ok(s, `no spec for AWG ${awg}`)
  return s
}

test('310.16 values match the published table', () => {
  // Spot-checks across the range, cross-checked against two independent
  // reproductions of NEC Table 310.16 (copper).
  const expected: [number, TempColumn, number][] = [
    [14, 60, 15], [14, 75, 20], [14, 90, 25],
    [12, 60, 20], [12, 75, 25], [12, 90, 30],
    [10, 60, 30], [10, 75, 35], [10, 90, 40],
    [8, 75, 50], [6, 75, 65], [4, 75, 85], [2, 75, 115],
    [0, 75, 150], [-3, 75, 230], [-3, 90, 260],
  ]
  for (const [awg, column, amps] of expected) {
    assert.equal(spec(awg).ampacity[column], amps, `AWG ${awgLabel(awg)} @ ${column}C`)
  }
})

test('the old chassis ratings are gone', () => {
  // The bug this file exists to prevent: AWG 10 was listed at 55A and AWG 12 at
  // 41A. Nothing in the table may approach those again.
  assert.ok(spec(10).ampacity[90] < 55, 'AWG 10 must not be rated near the old 55A')
  assert.ok(spec(12).ampacity[90] < 41, 'AWG 12 must not be rated near the old 41A')
  // Sizes below 14 AWG are not in Table 310.16 and must not be offered.
  for (const s of AWG_SPECS) assert.ok(s.awg <= 14, `AWG ${s.awg} is not covered by 310.16`)
})

test('240.4(D) caps small conductors below their ampacity', () => {
  // 10 AWG at 90C is a 40A conductor by ampacity but a 30A conductor in practice.
  assert.equal(spec(10).ampacity[90], 40)
  assert.equal(usableAmpacity(spec(10), 90), 30)
  assert.equal(isOcpdLimited(spec(10), 90), true)

  assert.equal(usableAmpacity(spec(12), 90), 20)
  assert.equal(usableAmpacity(spec(14), 90), 15)

  // At 60C the table value already equals the cap, so the rule does not bite.
  assert.equal(usableAmpacity(spec(10), 60), 30)
  assert.equal(isOcpdLimited(spec(10), 60), false)

  // The rule applies only to 14/12/10 AWG.
  assert.equal(spec(8).ocpdCap, undefined)
  assert.equal(usableAmpacity(spec(8), 75), 50)
})

test('ampacity never exceeds the code value for the chosen column', () => {
  for (const s of AWG_SPECS) {
    for (const column of [60, 75, 90] as TempColumn[]) {
      assert.ok(
        usableAmpacity(s, column) <= s.ampacity[column],
        `AWG ${awgLabel(s.awg)} @ ${column}C exceeds its table value`,
      )
    }
  }
})

test('ampacity increases monotonically with conductor size', () => {
  for (let i = 1; i < AWG_SPECS.length; i++) {
    const thinner = AWG_SPECS[i - 1]
    const thicker = AWG_SPECS[i]
    assert.ok(thicker.awg < thinner.awg, 'specs must run thin to thick')
    assert.ok(
      thicker.ampacity[75] > thinner.ampacity[75],
      `AWG ${awgLabel(thicker.awg)} should carry more than ${awgLabel(thinner.awg)}`,
    )
    assert.ok(thicker.resistancePer100ft < thinner.resistancePer100ft, 'thicker wire has less resistance')
  }
})

test('voltage drop uses the round trip, not the one-way length', () => {
  // 10 AWG, 0.100 ohm/100ft. 10 ft one way = 20 ft of copper = 0.020 ohm.
  // At 30A that is 0.600V.
  const r = evaluateGauges({ amps: 30, oneWayFeet: 10, volts: 24, maxDropPercent: 3, column: 75 })
    .find(r => r.spec.awg === 10)
  assert.ok(r)
  assert.ok(Math.abs(r.voltageDrop - 0.6) < 1e-9, `expected 0.600V, got ${r.voltageDrop}`)
  assert.ok(Math.abs(r.voltageDropPercent - 2.5) < 1e-9)
  assert.ok(Math.abs(r.powerLossWatts - 18) < 1e-9)
})

test('a 30A load rejects 10 AWG at 75C on ampacity', () => {
  // 10 AWG usable is 30A, so 30A exactly meets it; 31A must not.
  const at30 = evaluateGauges({ amps: 30, oneWayFeet: 5, volts: 24, maxDropPercent: 3, column: 75 })
  const at31 = evaluateGauges({ amps: 31, oneWayFeet: 5, volts: 24, maxDropPercent: 3, column: 75 })
  assert.equal(at30.find(r => r.spec.awg === 10)?.meetsAmpacity, true)
  assert.equal(at31.find(r => r.spec.awg === 10)?.meetsAmpacity, false)
})

test('passingGauges returns a set, thinnest first, all satisfying both limits', () => {
  const input = { amps: 30, oneWayFeet: 10, volts: 24, maxDropPercent: 3, column: 75 as TempColumn }
  const passing = passingGauges(input)
  assert.ok(passing.length > 1, 'a set, not a single verdict')
  for (const p of passing) {
    assert.ok(p.meetsAmpacity && p.meetsVoltageDrop)
    assert.ok(p.usableAmpacity >= input.amps)
    assert.ok(p.voltageDropPercent <= input.maxDropPercent)
  }
  for (let i = 1; i < passing.length; i++) {
    assert.ok(passing[i].spec.awg < passing[i - 1].spec.awg, 'ordered thin to thick')
  }
})

test('a long run is driven by voltage drop, not ampacity', () => {
  // 30A over 50 ft at 12V: ampacity allows 10 AWG, voltage drop does not.
  const input = { amps: 30, oneWayFeet: 50, volts: 12, maxDropPercent: 3, column: 75 as TempColumn }
  const byAmpacity = thinnestByAmpacity(input)
  const firstPassing = passingGauges(input)[0]
  assert.ok(byAmpacity && firstPassing)
  assert.ok(
    firstPassing.spec.awg < byAmpacity.spec.awg,
    'voltage drop should force a thicker conductor than ampacity alone',
  )
})

test('zero system voltage does not produce NaN', () => {
  const r = evaluateGauges({ amps: 30, oneWayFeet: 10, volts: 0, maxDropPercent: 3, column: 75 })
  for (const g of r) {
    assert.ok(!Number.isNaN(g.voltageDropPercent), 'percent must never be NaN')
    assert.equal(g.meetsVoltageDrop, false, 'an unknown voltage cannot pass the drop limit')
  }
})

test('no gauge passes when the load exceeds every conductor', () => {
  assert.equal(
    passingGauges({ amps: 5000, oneWayFeet: 10, volts: 48, maxDropPercent: 3, column: 90 }).length,
    0,
  )
})
