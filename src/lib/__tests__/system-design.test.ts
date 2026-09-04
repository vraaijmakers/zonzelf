import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  chainState, disagreements, assumptions, confidence, chainComplete, outstandingSteps,
  type ChainSummaries,
} from '../system-design'
import { CALC_STEPS } from '../calc-steps'
import { DEFAULTS as EFF } from '../system-efficiency'

const LOAD = { rawKwh: 3.5, efficiency: 0.85, adjustedKwh: 4.12 }
const BATTERY = {
  chemistry: 'lifepo4', roundTrip: 0.97, dod: 0.8,
  bankKwh: 10.3, bankAh: 215, autonomyDays: 2, systemVoltage: 48,
  scenarioLabel: 'Two sunless days', bandMinKwh: 5.1, bandMaxKwh: 12.4,
}
const INVERTER = {
  acContinuousW: 10000, acSurgeW: 20000, dcSystemVoltage: 48,
  pvMaxInputV: 500, mpptMinV: 125, mpptMaxV: 425, mpptCount: 2,
  pvMaxPowerW: 11000, pvMaxCurrentA: 22,
}
const PANELS = {
  peakSunHours: 4.5, worstMonthHours: 2.1, worstMonthName: 'December',
  arrayWatts: 7700, arrayDerate: 0.8, panelWatt: 550, panels: 14,
}
const ARRAY = {
  series: 7, parallel: 2, panels: 14, arrayWatts: 7700,
  vocColdV: 409.9, vmpHotV: 246.6, designIscA: 17.5,
  panelIscA: 14.03, stringsPerTracker: 1,
  designLowC: -25.9, designHighC: 32, stringFuseRequired: false,
}
const FULL: ChainSummaries = {
  load: LOAD, battery: BATTERY, inverter: INVERTER, panels: PANELS, array: ARRAY,
}

test('chain state covers every step, in order', () => {
  const steps = chainState(FULL)
  assert.equal(steps.length, CALC_STEPS.length)
  assert.deepEqual(steps.map(s => s.n), CALC_STEPS.map(s => s.n))
  for (const id of ['load', 'battery', 'inverter', 'panels', 'array']) {
    assert.equal(steps.find(s => s.id === id)!.done, true, `${id} should read as done`)
  }
})

test('an empty chain reports nothing done and invents no headlines', () => {
  const steps = chainState({})
  assert.ok(steps.every(s => !s.done))
  assert.ok(steps.every(s => s.headline === null))
  assert.equal(chainComplete({}), false)
})

test('THE CASE: panel sizing and array wiring can disagree on the count', () => {
  // Energy sizing rounds UP to a whole panel count. Array wiring must factor
  // that into whole strings inside a voltage window. For the SG550WM against
  // an SPH10048P at -25.9C, every ODD count has no safe arrangement — so the
  // panel page says 11 and the array page says 10, and neither is wrong.
  const conflicted: ChainSummaries = {
    ...FULL,
    panels: { ...PANELS, panels: 11 },
    array: { ...ARRAY, panels: 10, series: 5, parallel: 2 },
  }
  const found = disagreements(conflicted)
  const mismatch = found.find(d => d.id === 'panel-count-mismatch')
  assert.ok(mismatch, 'the count mismatch must be reported')
  assert.equal(mismatch.severity, 'blocking')
  assert.match(mismatch.title, /11/)
  assert.match(mismatch.title, /10/)
  // It must say neither page is wrong on its own terms — that is the insight.
  assert.match(mismatch.detail, /Neither figure is wrong/)
  assert.deepEqual(mismatch.steps, ['panels', 'array'])
})

test('a matching count raises no mismatch', () => {
  assert.equal(disagreements(FULL).find(d => d.id === 'panel-count-mismatch'), undefined)
})

test('the resolution differs depending on which way the counts fall', () => {
  const more = disagreements({
    ...FULL, panels: { ...PANELS, panels: 11 }, array: { ...ARRAY, panels: 12 },
  }).find(d => d.id === 'panel-count-mismatch')!
  assert.match(more.resolution, /simpler fix/)

  const fewer = disagreements({
    ...FULL, panels: { ...PANELS, panels: 13 }, array: { ...ARRAY, panels: 12 },
  }).find(d => d.id === 'panel-count-mismatch')!
  assert.match(fewer.resolution, /shortfall/)
})

test('a battery and inverter at different voltages is blocking', () => {
  const found = disagreements({
    ...FULL, battery: { ...BATTERY, systemVoltage: 24 },
  })
  const v = found.find(d => d.id === 'voltage-mismatch')
  assert.ok(v)
  assert.equal(v.severity, 'blocking')
  // It must also say the amp-hour figure is wrong, not just the pairing.
  assert.match(v.detail, /Ah figure is wrong/)
})

test('an array past the PV input escalates with how far past it is', () => {
  const mild = disagreements({
    ...FULL, array: { ...ARRAY, arrayWatts: 12000 },
  }).find(d => d.id === 'array-over-pv-input')!
  assert.equal(mild.severity, 'note')

  const bad = disagreements({
    ...FULL, array: { ...ARRAY, arrayWatts: 20000 },
  }).find(d => d.id === 'array-over-pv-input')!
  assert.equal(bad.severity, 'warning')
})

test('string fusing is reported as required, not required, or unknown', () => {
  assert.ok(disagreements({ ...FULL, array: { ...ARRAY, stringFuseRequired: true } })
    .some(d => d.id === 'string-fuses-needed'))
  assert.ok(disagreements({ ...FULL, array: { ...ARRAY, stringFuseRequired: null } })
    .some(d => d.id === 'fuse-rating-unknown'))
  // False is a real answer and needs no card.
  const quiet = disagreements(FULL)
  assert.ok(!quiet.some(d => d.id === 'string-fuses-needed' || d.id === 'fuse-rating-unknown'))
})

test('sizing panels without wiring them is flagged', () => {
  const found = disagreements({ ...FULL, array: null })
  assert.ok(found.some(d => d.id === 'array-not-wired'))
})

test('assumptions carry their step, so the page can link back three steps', () => {
  const facts = assumptions(FULL)
  assert.ok(facts.length >= 6, `only ${facts.length} assumptions surfaced`)
  const ids = CALC_STEPS.map(s => s.id)
  for (const a of facts) {
    assert.ok(ids.includes(a.step), `${a.id} cites an unknown step`)
    assert.ok(a.affects.length > 20, `${a.id} must say what it changes`)
    assert.ok(a.value.length > 0)
  }
})

test('assumptions are ordered by leverage, not by step', () => {
  const facts = assumptions(FULL)
  const rank = { high: 0, medium: 1, low: 2 } as const
  for (let i = 1; i < facts.length; i++) {
    assert.ok(
      rank[facts[i - 1].sensitivity] <= rank[facts[i].sensitivity],
      'a lower-leverage assumption was listed above a higher one',
    )
  }
  assert.equal(facts[0].sensitivity, 'high')
})

test('a default value is flagged, a chosen one is not', () => {
  const atDefault = assumptions({ ...FULL, panels: { ...PANELS, arrayDerate: EFF.array } })
    .find(a => a.id === 'array-derate')!
  assert.equal(atDefault.atDefault, true)

  const chosen = assumptions({ ...FULL, panels: { ...PANELS, arrayDerate: 0.72 } })
    .find(a => a.id === 'array-derate')!
  assert.equal(chosen.atDefault, false)
  assert.match(chosen.value, /72%/)
})

test('peak sun is always flagged as regional, never as a site measurement', () => {
  const sun = assumptions(FULL).find(a => a.id === 'peak-sun')!
  assert.equal(sun.sensitivity, 'high')
  assert.match(sun.caveat ?? '', /not a measurement of your roof/)
})

test('a summary saved before cooling existed does not crash the assumptions', () => {
  // Rule 12b: older breakdowns have no `cooling` key at all.
  const old = {
    ...FULL,
    load: { ...LOAD, breakdown: { always: 1, daytime: 1, evening: 1, total: 3 } },
  }
  assert.doesNotThrow(() => assumptions(old))
  assert.ok(!assumptions(old).some(a => a.id === 'cooling-duty'))
})

test('confidence is a word with reasons, never a fabricated percentage', () => {
  const c = confidence(FULL)
  assert.ok(['wide', 'moderate', 'narrow'].includes(c.level))
  assert.ok(c.drivers.length > 0, 'the reasons are the useful part')
  // No invented interval anywhere in the output.
  const text = c.summary + c.drivers.join(' ')
  assert.ok(!/[±+]\/?-?\s*\d+\s*%/.test(text), 'a numeric interval was invented')
})

test('confidence widens with missing steps and blocking conflicts', () => {
  assert.equal(confidence({ load: LOAD }).level, 'wide', 'barely started should be wide')

  const conflicted = confidence({
    ...FULL, battery: { ...BATTERY, systemVoltage: 24 },
  })
  assert.equal(conflicted.level, 'wide', 'a blocking disagreement must widen the band')
  assert.ok(conflicted.drivers.some(d => /disagree/.test(d)))
})

test('a complete chain with no conflicts still refuses to call itself certain', () => {
  const c = confidence(FULL)
  assert.match(c.summary, /estimate|sketch|starting/i)
  assert.ok(!/certain|guaranteed|correct/i.test(c.summary))
})

test('the system step is a destination, not outstanding work', () => {
  // Lighting up step 7's href made every "is this outstanding?" check count
  // the destination as unfinished, which made chainComplete permanently false
  // and left the confidence band permanently reporting a missing step.
  const outstanding = outstandingSteps(FULL)
  assert.ok(!outstanding.some(s => s.id === 'system'), 'the system step is not a task')
  // Protection publishes no summary, so it genuinely cannot be detected done.
  assert.ok(outstanding.some(s => s.id === 'protection'))
})

test('confidence does not report the system page itself as a missing step', () => {
  const c = confidence(FULL)
  assert.ok(
    !c.drivers.some(d => /your system/i.test(d)),
    'the destination was counted as an unfinished step',
  )
})

test('a chain with every real step done reads as complete', () => {
  // Protection is the only outstanding one in FULL; nothing publishes for it,
  // so completeness is judged on the steps that do.
  const outstanding = outstandingSteps(FULL).map(s => s.id)
  assert.deepEqual(outstanding, ['protection'])
})

test('temperatures in the assumptions follow the display unit', () => {
  const f = assumptions(FULL, 'F').find(a => a.id === 'design-low')!
  const c = assumptions(FULL, 'C').find(a => a.id === 'design-low')!
  assert.match(f.value, /°F/)
  assert.match(c.value, /°C/)
  assert.equal(c.value, '-25.9°C')
  // -25.9C is -15F.
  assert.equal(f.value, '-15°F')
})

test('the cell rise is a DELTA and converts without the offset', () => {
  const f = assumptions(FULL, 'F').find(a => a.id === 'cell-rise')!
  // 30 Celsius degrees of rise is 54 Fahrenheit degrees, not 86.
  assert.match(f.value, /54°F/)
  assert.ok(!/86/.test(f.value), 'the absolute conversion was used on a difference')
})

test('one disagreement reads as two steps, not "1 step disagree"', () => {
  const c = confidence({ ...FULL, battery: { ...BATTERY, systemVoltage: 24 } })
  const line = c.drivers.find(d => /disagree/.test(d))!
  assert.match(line, /Two steps disagree/)
  assert.ok(!/1 step disagree/.test(line))
})

// ---------------------------------------------------------------------------
// The protection step can finally be detected as done
// ---------------------------------------------------------------------------

const PROTECTION = {
  runs: [
    {
      runId: 'battery-inverter', label: 'Battery → inverter',
      amps: 245, volts: 48, oneWayFeet: 5, awg: -3, awgLabel: '4/0',
      ocpdOptionsA: [300, 350], dropPercent: 0.9, kind: 'general', column: 75,
    },
    {
      runId: 'pv-string', label: 'One panel string → combiner',
      amps: 14.03, volts: 247, oneWayFeet: 30, awg: 10, awgLabel: '10',
      ocpdOptionsA: [25, 30], dropPercent: 0.3, kind: 'pv-source', column: 75,
    },
  ],
}

test('protection was the one step that could never read as done', () => {
  // It published nothing, so the chain dead-ended there: every other step
  // could be detected complete and this one never could.
  const without = chainState(FULL).find(s => s.id === 'protection')!
  assert.equal(without.done, false)
  assert.equal(without.headline, null)

  const withIt = chainState({ ...FULL, protection: PROTECTION })
    .find(s => s.id === 'protection')!
  assert.equal(withIt.done, true)
  assert.match(withIt.headline ?? '', /2 cable runs sized/)
  assert.match(withIt.headline ?? '', /4\/0/)
})

test('a complete chain now actually reaches complete', () => {
  // Before the protection summary existed this could never be true.
  assert.equal(chainComplete(FULL), false)
  assert.equal(chainComplete({ ...FULL, protection: PROTECTION }), true)
  assert.deepEqual(outstandingSteps({ ...FULL, protection: PROTECTION }), [])
})

test('confidence stops citing protection once its runs are sized', () => {
  const before = confidence(FULL)
  assert.ok(before.drivers.some(d => /cable|protection/i.test(d)))

  const after = confidence({ ...FULL, protection: PROTECTION })
  assert.ok(
    !after.drivers.some(d => /cable|protection/i.test(d)),
    'protection was still reported as outstanding after being sized',
  )
  // Not 'narrow': this fixture still has four high-leverage assumptions at
  // their defaults, and the band is right to say so. Completing every step
  // does not by itself make an estimate tight.
  assert.equal(after.level, 'moderate')
  assert.ok(after.drivers.some(d => /still at their defaults/.test(d)))
})

test('narrow is reachable, but only when the defaults have been replaced too', () => {
  const chosen = {
    ...FULL,
    protection: PROTECTION,
    load: { ...LOAD, efficiency: 0.92 },
    battery: { ...BATTERY, autonomyDays: 3 },
    panels: { ...PANELS, arrayDerate: 0.74 },
  }
  const c = confidence(chosen)
  assert.equal(c.level, 'narrow')
  // Even at its narrowest it refuses to sound certain.
  assert.match(c.summary, /still an estimate/i)
})

test('an empty run list is not the same as having sized nothing', () => {
  // A summary object with zero runs must not read as done.
  const empty = chainState({ ...FULL, protection: { runs: [] } })
    .find(s => s.id === 'protection')!
  assert.equal(empty.done, false)
})
