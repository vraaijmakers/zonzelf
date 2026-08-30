import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CIRCUIT_RUNS, resolveRuns, combinerAdvice, runById, mpptArrival, looksLikeBatteryVoltage,
} from '../circuit-runs'
import { sizingFactor } from '../awg'
import {
  METAL_PROPERTIES, CREEP_CYCLE, IDENTIFY_CCA, CCA_WARNING, COPPER_ONLY_HEADLINE,
} from '../conductor-material'
import type { ArraySummary, InverterSummary } from '../calc-storage'

const ARRAY: ArraySummary = {
  series: 7, parallel: 2, panels: 14, arrayWatts: 7700,
  vocColdV: 409.9, vmpHotV: 246.6, designIscA: 17.5,
  panelIscA: 14.03, stringsPerTracker: 1,
  designLowC: -25.9, designHighC: 32, stringFuseRequired: false,
}
const INVERTER: InverterSummary = {
  acContinuousW: 10000, acSurgeW: 20000, dcSystemVoltage: 48,
  pvMaxInputV: 500, mpptMinV: 125, mpptMaxV: 425, mpptCount: 2,
  pvMaxPowerW: 11000, pvMaxCurrentA: 22,
}

test('every run names a distinct physical cable', () => {
  const ids = CIRCUIT_RUNS.map(r => r.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const r of CIRCUIT_RUNS) {
    assert.ok(r.where.length > 20, `${r.id} must say where the cable physically goes`)
    assert.ok(r.note.length > 40, `${r.id} must say what catches people out`)
    assert.ok(r.typicalFeet > 0 && r.suggestedDropPercent > 0)
  }
  assert.equal(runById('battery-inverter').kind, 'general')
  assert.equal(runById('pv-string').kind, 'pv-source')
})

test('the battery run is the shortest suggested and the tightest on drop', () => {
  // It carries the most current, so its drop costs the most and its length
  // should be a few feet, not a few tens.
  const battery = runById('battery-inverter')
  for (const other of CIRCUIT_RUNS.filter(r => r.id !== 'battery-inverter')) {
    assert.ok(battery.typicalFeet <= other.typicalFeet, `${other.id} suggested shorter`)
    assert.ok(battery.suggestedDropPercent <= other.suggestedDropPercent, `${other.id} tighter`)
  }
})

test('currents are RAW, so the code factor is not applied twice', () => {
  // The cable step multiplies a PV source circuit by 1.56 itself. Handing it
  // the array summary's already-multiplied designIscA would apply it twice.
  const runs = resolveRuns({ array: ARRAY, inverter: INVERTER })
  const pv = runs.find(r => r.id === 'pv-string')!
  assert.equal(pv.amps, ARRAY.panelIscA, 'must be one panel Isc, raw')
  assert.notEqual(pv.amps, ARRAY.designIscA, 'must NOT be the pre-multiplied figure')
  assert.equal(sizingFactor('pv-source', true).factor, 1.56)
})

test('the battery run derives its current from the inverter, losses included', () => {
  const runs = resolveRuns({ array: ARRAY, inverter: INVERTER, load: null })
  const b = runs.find(r => r.id === 'battery-inverter')!
  // 10000W / (0.85 x 48V) = 245A.
  assert.ok(b.amps !== null && Math.abs(b.amps - 245.1) < 0.5, `got ${b.amps}`)
  assert.equal(b.volts, 48)
  assert.match(b.derivation ?? '', /supplies the losses/)
  // And it is far and away the biggest current in the system.
  for (const other of runs.filter(r => r.id !== 'battery-inverter' && r.amps !== null)) {
    assert.ok(b.amps! > other.amps! * 2, `${other.id} is closer than expected`)
  }
})

test('the combiner run does not apply when there is one string per tracker', () => {
  const runs = resolveRuns({ array: ARRAY, inverter: INVERTER })
  assert.equal(runs.find(r => r.id === 'pv-combined')!.applies, false)
  const twoPerTracker = resolveRuns({
    array: { ...ARRAY, stringsPerTracker: 2 }, inverter: INVERTER,
  })
  const combined = twoPerTracker.find(r => r.id === 'pv-combined')!
  assert.equal(combined.applies, true)
  assert.equal(combined.amps, 28.06, 'two strings of 14.03A, not rounded away')
  // Parallel adds current, never voltage.
  assert.equal(combined.volts, runs.find(r => r.id === 'pv-string')!.volts)
})

test('missing upstream steps give nulls, never a guessed current', () => {
  for (const run of resolveRuns({})) {
    assert.equal(run.amps, null, `${run.id} invented a current`)
    assert.equal(run.volts, null, `${run.id} invented a voltage`)
    assert.equal(run.derivation, null)
  }
})

test('a 240V AC run carries half the current of a 120V one', () => {
  const ac = resolveRuns({ inverter: INVERTER }).find(r => r.id === 'inverter-ac')!
  assert.ok(Math.abs(ac.amps! - 41.7) < 0.1, `got ${ac.amps}`)
  assert.equal(ac.volts, 240)
  assert.match(ac.derivation ?? '', /83\.3A/)
})

test('combiner advice follows from the array, not a new question', () => {
  assert.equal(combinerAdvice(null), null)
  const one = combinerAdvice(ARRAY)!
  assert.equal(one.needed, false)
  assert.match(one.why, /nothing to combine/)

  const three = combinerAdvice({ ...ARRAY, stringsPerTracker: 3, stringFuseRequired: true })!
  assert.equal(three.needed, true)
  assert.equal(three.fused, true)
  assert.match(three.why, /690\.9\(A\)/)

  // An unknown module fuse rating is reported as unknown, not assumed either way.
  const unknown = combinerAdvice({ ...ARRAY, stringsPerTracker: 3, stringFuseRequired: null })!
  assert.equal(unknown.fused, null)
  assert.match(unknown.why, /module label/)
})

// ---------------------------------------------------------------------------
// Conductor material
// ---------------------------------------------------------------------------

test('exactly one metal property is marked decisive, and it is expansion', () => {
  const decisive = METAL_PROPERTIES.filter(m => m.decisive)
  assert.equal(decisive.length, 1, 'naming two decisive properties teaches neither')
  assert.match(decisive[0].label, /expansion/i)
})

test('the resistance coefficient is explicitly NOT the differentiator', () => {
  // The property people name is the one that barely differs. Saying so is the
  // whole point of listing it.
  const resistance = METAL_PROPERTIES.find(m => /coefficient of resistance/i.test(m.label))
  assert.ok(resistance, 'the commonly-named property must appear, to be corrected')
  assert.equal(resistance.decisive, false)
  assert.match(resistance.soWhat, /NOT the difference|not the problem/i)
})

test('the creep cycle is a closed loop that explains the delay', () => {
  assert.ok(CREEP_CYCLE.length >= 5, 'the mechanism needs its steps')
  const joined = CREEP_CYCLE.join(' ').toLowerCase()
  for (const beat of ['expand', 'cool', 'looser', 'resistance', 'heat']) {
    assert.ok(joined.includes(beat), `the cycle never mentions ${beat}`)
  }
  assert.match(CREEP_CYCLE[CREEP_CYCLE.length - 1], /repeat/i, 'it must close the loop')
})

test('identifying CCA leads with the test anyone can actually do', () => {
  assert.ok(IDENTIFY_CCA.length >= 3)
  assert.match(IDENTIFY_CCA[0], /weigh|dens/i, 'weight is the quickest honest test')
  assert.match(CCA_WARNING, /not listed|impermissible/i, 'say it is not merely worse')
  assert.match(COPPER_ONLY_HEADLINE, /copper/i)
})

test('each run says what its voltage MEANS, because the label was wrong', () => {
  // "System voltage" is a term of art meaning the battery bank nominal. The
  // field was labelled that and offered 12/24/48/120/240 for every run,
  // including PV strings — where the real figure is the series total, often
  // ten times higher. It is used to express drop as a percentage, so getting
  // it wrong changes the gauge, not just the wording.
  for (const run of CIRCUIT_RUNS) {
    assert.ok(run.voltageMeans.length > 40, `${run.id} must say what its voltage is`)
  }
  // The PV runs cannot offer fixed buttons: a string is whatever its panels
  // add up to, and 12/24/48 is never the answer.
  assert.deepEqual(runById('pv-string').voltageOptions, [])
  assert.deepEqual(runById('pv-combined').voltageOptions, [])
  assert.match(runById('pv-string').voltageMeans, /NOT your battery/i)
  // The DC and AC runs do have standard values.
  assert.deepEqual(runById('battery-inverter').voltageOptions, [12, 24, 48])
  assert.deepEqual(runById('inverter-ac').voltageOptions, [120, 240])
})

test('no run offers a battery voltage for a PV circuit', () => {
  for (const run of CIRCUIT_RUNS.filter(r => r.kind === 'pv-source')) {
    for (const v of run.voltageOptions) {
      assert.ok(v > 60, `${run.id} offers ${v}V, which is a battery voltage on a PV run`)
    }
  }
})

test('the PV string voltage comes from the array, not from a preset', () => {
  const runs = resolveRuns({ array: ARRAY, inverter: INVERTER })
  const pv = runs.find(r => r.id === 'pv-string')!
  // Seven panels in series, working hot — nowhere near any battery voltage.
  assert.equal(pv.volts, Math.round(ARRAY.vmpHotV))
  assert.ok(pv.volts! > 200, `got ${pv.volts}V, which cannot be a string`)
})

test('the arrival check answers the question the percentage only proxies', () => {
  // 246.6V hot string, 0.8V lost in 10 AWG, against a 125V floor.
  const a = mpptArrival(246.6, 0.8, 125)!
  assert.ok(Math.abs(a.arrivingV - 245.8) < 0.01)
  assert.equal(a.clears, true)
  assert.ok(Math.abs(a.marginV - 120.8) < 0.01)
})

test('a short string can be inside its percentage budget and still fall under', () => {
  // This is why the percentage is only a proxy: 2% of 130V is 2.6V, well
  // within budget, and the string still arrives below a 130V floor.
  const a = mpptArrival(130, 2.6, 130)!
  assert.equal(a.clears, false)
  assert.ok(a.marginV < 0)
  assert.ok(a.dropV / a.sourceV < 0.021, 'the drop percentage alone would have passed this')
})

test('arrival refuses to compute from nonsense rather than returning a number', () => {
  assert.equal(mpptArrival(0, 1, 125), null)
  assert.equal(mpptArrival(246, 1, 0), null)
  assert.equal(mpptArrival(246, Number.NaN, 125), null)
  // A negative drop cannot add voltage back.
  assert.equal(mpptArrival(246, -5, 125)!.arrivingV, 246)
})

test('a battery voltage on a PV run is caught by value, not by guesswork', () => {
  for (const v of [12, 24, 48, 120, 240]) {
    assert.equal(looksLikeBatteryVoltage('pv-source', v), true, `${v}V should be flagged`)
  }
  // A real string voltage is not flagged.
  assert.equal(looksLikeBatteryVoltage('pv-source', 287), false)
  assert.equal(looksLikeBatteryVoltage('pv-source', 410), false)
  // And the same values are perfectly correct on a non-PV run.
  for (const v of [12, 24, 48, 120, 240]) {
    assert.equal(looksLikeBatteryVoltage('general', v), false)
  }
})
