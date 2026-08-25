import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeDuty, rowDailyWh, averageWatts, totalDailyKwh,
  ALL_PRESETS, PRESET_GROUPS, suggestedDuty, breakdownByProfile, LOAD_PROFILES, overnightShareFrom,
  coolingShare, heatingShare, isCorrelatedRisk, normalizeBreakdown,
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

test('suggestedDuty offers the corrected value only for cycling presets', () => {
  // Rows saved before duty cycles existed sit at 100%. The UI offers the real
  // figure rather than rewriting stored data underneath the user.
  assert.equal(suggestedDuty('Full-size fridge'), 0.35)
  assert.equal(suggestedDuty('Mini fridge'), 0.30)
  assert.equal(suggestedDuty('  full-size fridge  '), 0.35, 'match should tolerate case and padding')

  // Non-cycling loads and A/C (deliberately unsourced) must offer nothing.
  assert.equal(suggestedDuty('LED light bulb'), undefined)
  assert.equal(suggestedDuty('Window AC (5,000 BTU)'), undefined)
  assert.equal(suggestedDuty('Something the user typed'), undefined)
  assert.equal(suggestedDuty(''), undefined)
})

test('profiles split the load by when it runs', () => {
  const rows = [
    { watts: 1000, hours: 10, qty: 1, profile: 'cooling' as const },   // 10 kWh A/C
    { watts: 100, hours: 5, qty: 1, profile: 'evening' as const },     // 0.5 kWh TV
    { watts: 150, hours: 24, qty: 1, duty: 0.35 },                     // fridge, no profile
  ]
  const b = breakdownByProfile(rows)
  assert.equal(b.cooling, 10)
  assert.equal(b.evening, 0.5)
  assert.ok(Math.abs(b.always - 1.26) < 1e-9, 'a row without a profile counts as always')
  assert.ok(Math.abs(b.total - (b.always + b.daytime + b.evening + b.cooling + b.heating)) < 1e-9)
})

test('air conditioning is daytime, refrigeration is always, television is evening', () => {
  // The tagging that makes both of the in-use observations work.
  const p = (n: string) => ALL_PRESETS.find(x => x.name === n)
  assert.equal(p('Mini-split (12,000 BTU)')?.profile, 'cooling')
  assert.equal(p('Window AC (5,000 BTU)')?.profile, 'cooling')
  assert.equal(p('Heat pump (12,000 BTU)')?.profile, 'heating')
  assert.equal(p('TV (55")')?.profile, 'evening')
  assert.equal(p('Induction cooktop')?.profile, 'evening')
  assert.equal(p('Full-size fridge')?.profile, undefined, 'refrigeration runs regardless')
  assert.equal(p('Router / modem')?.profile, undefined)
})

test('cooling is suppressed by bad weather, heating is amplified, the rest are neutral', () => {
  assert.equal(LOAD_PROFILES.cooling.weather, 'suppressed')
  assert.equal(LOAD_PROFILES.heating.weather, 'amplified')
  assert.equal(LOAD_PROFILES.always.weather, 'none')
  assert.equal(LOAD_PROFILES.daytime.weather, 'none', 'a power tool is not weather-driven')
  assert.equal(LOAD_PROFILES.evening.weather, 'none', 'rain does not stop you watching television')
})

test('heating runs mostly at night, cooling mostly by day', () => {
  const heat = LOAD_PROFILES.heating.overnightShare as number
  const cool = LOAD_PROFILES.cooling.overnightShare as number
  assert.ok(heat > 0.5, 'heating is night-heavy — the coldest hours have no sun')
  assert.ok(cool < 0.25, 'cooling is driven by daytime heat')
  assert.ok(heat > cool, 'the two must not be modelled as the same shape')
})

test('a heating-dominated load is flagged as correlated risk', () => {
  // Alaska: worst weather and highest demand arrive together.
  const alaska = breakdownByProfile([
    { watts: 1500, hours: 10, qty: 1, profile: 'heating' as const },
    { watts: 150, hours: 24, qty: 1, duty: 0.35 },
  ])
  assert.ok(heatingShare(alaska) > 0.8)
  assert.equal(isCorrelatedRisk(alaska), true)

  // Florida: anti-correlated, and must NOT be flagged.
  const florida = breakdownByProfile([
    { watts: 1100, hours: 10, qty: 2, profile: 'cooling' as const },
    { watts: 150, hours: 24, qty: 1, duty: 0.35 },
  ])
  assert.ok(coolingShare(florida) > 0.8)
  assert.equal(isCorrelatedRisk(florida), false)

  // A load with neither is not flagged.
  assert.equal(isCorrelatedRisk(breakdownByProfile([{ watts: 100, hours: 10, qty: 1 }])), false)
})

test('the preset list can heat a house, not only cool one', () => {
  const heaters = ALL_PRESETS.filter(p => p.profile === 'heating')
  assert.ok(heaters.length >= 4, 'a cooling-only preset list quietly assumes a warm climate')
  const coolers = ALL_PRESETS.filter(p => p.profile === 'cooling')
  assert.ok(coolers.length > 0)
})

test('overnight shares reflect when each profile runs', () => {
  assert.equal(LOAD_PROFILES.always.overnightShare, 'proportional')
  assert.ok((LOAD_PROFILES.evening.overnightShare as number) > 0.8, 'evening load is mostly after dark')
  assert.ok((LOAD_PROFILES.daytime.overnightShare as number) < 0.1, 'daytime load barely runs at night')
})

test('the overnight share is derived from the default appliance list', () => {
  // The starter rows: 4 LED bulbs (evening), a ceiling fan (always), a laptop
  // (evening), a mini fridge (always, 30% duty). With 12h of dark the share
  // should land well above the flat 50% a uniform assumption would give,
  // because two of the four are evening loads.
  const rows = [
    { watts: 10, hours: 5, qty: 4, profile: 'evening' as const },
    { watts: 60, hours: 8, qty: 1 },
    { watts: 65, hours: 6, qty: 1, profile: 'evening' as const },
    { watts: 80, hours: 24, qty: 1, duty: 0.3 },
  ]
  const b = breakdownByProfile(rows)
  assert.ok(Math.abs(b.evening - 0.59) < 1e-9, `evening ${b.evening}`)
  assert.ok(Math.abs(b.always - 1.056) < 1e-9, `always ${b.always}`)

  const share = overnightShareFrom(b, 12)
  assert.ok(Math.abs(share - 1.059 / 1.646) < 1e-6, `share ${share}`)
  assert.ok(share > 0.6 && share < 0.7, 'evening-heavy load should exceed a flat 50%')
})

test('an air-conditioning load pulls the overnight share DOWN', () => {
  // Vincent's case: a mini-split dominates the day but barely runs at night.
  // A flat share would badly overstate the overnight bank.
  const withAC = breakdownByProfile([
    { watts: 1100, hours: 10, qty: 2, profile: 'cooling' as const },  // 22 kWh
    { watts: 150, hours: 24, qty: 1, duty: 0.35 },                    // fridge
    { watts: 100, hours: 4, qty: 1, profile: 'evening' as const },    // TV
  ])
  const share = overnightShareFrom(withAC, 12)
  assert.ok(share < 0.25, `A/C-dominated overnight share should be small, got ${share}`)

  // And it is almost entirely cooling, so overcast days shrink it.
  assert.ok(coolingShare(withAC) > 0.9)
})

test('an all-day load with no profiles behaves as before', () => {
  const b = breakdownByProfile([{ watts: 1000, hours: 24, qty: 1 }])
  assert.equal(coolingShare(b), 0, 'nothing weather-driven means no overcast suppression')
  assert.equal(heatingShare(b), 0)
  assert.ok(Math.abs(overnightShareFrom(b, 12) - 0.5) < 1e-9, 'proportional to the night')
  assert.ok(Math.abs(overnightShareFrom(b, 16) - 16 / 24) < 1e-9)
})

test('an empty list never divides by zero', () => {
  const b = breakdownByProfile([])
  assert.equal(b.total, 0)
  assert.equal(overnightShareFrom(b, 12), 0)
  assert.equal(coolingShare(b), 0)
  assert.equal(heatingShare(b), 0)
})

test('a summary saved before cooling and heating existed still loads', () => {
  // localStorage outlives a deploy, so the missing keys are a real runtime case.
  const old = normalizeBreakdown({ always: 1, daytime: 2, evening: 3, total: 6 })
  assert.ok(old)
  assert.equal(old.cooling, 0)
  assert.equal(old.heating, 0)
  assert.equal(old.total, 6)
  assert.equal(isCorrelatedRisk(old), false, 'an old summary must not spuriously warn')

  assert.equal(normalizeBreakdown(undefined), null)
  assert.equal(normalizeBreakdown(null), null)
  assert.equal(normalizeBreakdown({ always: 1 }), null, 'a shape without a total is unusable')
})
