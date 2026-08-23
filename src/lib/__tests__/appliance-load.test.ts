import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeDuty, rowDailyWh, averageWatts, totalDailyKwh,
  ALL_PRESETS, PRESET_GROUPS,
} from '../appliance-load'

const preset = (name: string) => {
  const p = ALL_PRESETS.find(p => p.name === name)
  assert.ok(p, `no preset named ${name}`)
  return p
}

/** kWh/day a preset contributes at quantity 1. */
const presetKwh = (name: string) => {
  const p = preset(name)
  return rowDailyWh({ watts: p.watts, hours: p.hours, qty: 1, duty: p.duty }) / 1000
}

test('the fridge presets land in the real-world band, not nameplate x 24h', () => {
  // The bug: 150W x 24h = 3.6 kWh/day. Two independent sources put a modern
  // full-size fridge at 1-2 kWh/day.
  const full = presetKwh('Full-size fridge')
  assert.ok(full >= 1 && full <= 2, `full-size fridge ${full.toFixed(2)} kWh/day outside 1-2`)
  assert.ok(full < 3.6, 'must be below the old nameplate x 24h figure')

  // Mini fridges are smaller: roughly 200-300 kWh/year is 0.55-0.8 kWh/day.
  const mini = presetKwh('Mini fridge')
  assert.ok(mini >= 0.4 && mini <= 0.9, `mini fridge ${mini.toFixed(2)} kWh/day outside 0.4-0.9`)
  assert.ok(mini < 1.92, 'must be below the old nameplate x 24h figure')
})

test('refrigeration duty cycles sit in the sourced 30-40% band', () => {
  for (const name of ['Mini fridge', 'Full-size fridge', 'Chest freezer']) {
    const d = preset(name).duty
    assert.ok(d !== undefined, `${name} must carry a duty cycle`)
    assert.ok(d >= 0.25 && d <= 0.45, `${name} duty ${d} outside the sourced band`)
  }
})

test('every preset carrying a duty cycle explains itself and is flagged as cycling', () => {
  for (const p of ALL_PRESETS) {
    if (p.duty !== undefined && p.duty < 1) {
      assert.ok(p.cycles, `${p.name} has a duty cycle but is not flagged as cycling`)
      assert.ok(p.note, `${p.name} reduces its energy without explaining why`)
    }
  }
})

test('A/C presets stay at 100% — no invented duty cycle', () => {
  // Deliberate: no two-source figure was established for A/C, and guessing one
  // would repeat the error this module exists to fix.
  const ac = PRESET_GROUPS.find(g => g.label === 'Cooling (A/C)')
  assert.ok(ac)
  for (const p of ac.items) {
    assert.equal(p.duty, undefined, `${p.name} must not carry an unsourced duty cycle`)
    assert.ok(p.cycles, `${p.name} should still be flagged as a cycling load`)
  }
})

test('a missing duty cycle means 100%, so saved rows are never silently reduced', () => {
  assert.equal(normalizeDuty(undefined), 1)
  assert.equal(rowDailyWh({ watts: 100, hours: 10, qty: 1 }), 1000)
  assert.equal(rowDailyWh({ watts: 100, hours: 10, qty: 1, duty: 1 }), 1000)
})

test('duty cycle scales energy linearly', () => {
  assert.equal(rowDailyWh({ watts: 100, hours: 10, qty: 1, duty: 0.5 }), 500)
  assert.equal(rowDailyWh({ watts: 100, hours: 10, qty: 2, duty: 0.25 }), 500)
})

test('running watts stay separate from average watts', () => {
  // Inverter sizing needs the running figure; energy needs the average.
  const p = preset('Full-size fridge')
  assert.equal(p.watts, 150, 'running watts must remain the nameplate figure')
  assert.ok(averageWatts({ watts: p.watts, hours: p.hours, qty: 1, duty: p.duty }) < p.watts)
})

test('out-of-range inputs are clamped rather than producing nonsense', () => {
  assert.equal(normalizeDuty(-1), 0)
  assert.equal(normalizeDuty(5), 1)
  assert.equal(normalizeDuty(Number.NaN), 1)
  assert.equal(rowDailyWh({ watts: -50, hours: 10, qty: 1 }), 0, 'negative watts')
  assert.equal(rowDailyWh({ watts: 100, hours: 48, qty: 1 }), 2400, 'hours capped at 24')
  assert.equal(rowDailyWh({ watts: 100, hours: 10, qty: -3 }), 0, 'negative quantity')
})

test('totalDailyKwh sums rows in kWh', () => {
  assert.equal(totalDailyKwh([
    { watts: 100, hours: 10, qty: 1 },
    { watts: 500, hours: 2, qty: 1, duty: 0.5 },
  ]), 1.5)
  assert.equal(totalDailyKwh([]), 0)
})

test('no preset draws for more than 24 hours a day', () => {
  for (const p of ALL_PRESETS) {
    assert.ok(p.hours > 0 && p.hours <= 24, `${p.name} has ${p.hours} hours`)
    assert.ok(p.watts > 0, `${p.name} has ${p.watts} watts`)
  }
})
