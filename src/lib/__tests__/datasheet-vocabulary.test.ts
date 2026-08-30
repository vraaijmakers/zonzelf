import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DATASHEET_FIELDS, fieldHelp, fieldsFor } from '../datasheet-vocabulary'
import { INVERTER_PRESETS } from '../inverter-sizing'
import { reviewInverterSpec } from '../inverter-review'
import { worstSeverity } from '../battery-review'

const PAGES = {
  inverter: 'src/app/calculators/inverter/page.tsx',
  panel: 'src/app/calculators/strings/page.tsx',
} as const

/**
 * Every spec field on a page. Brand and model are excluded: they identify the
 * product rather than coming off a specification table, so there is nothing to
 * translate.
 */
const IDENTITY_FIELDS = new Set(['unit-brand', 'unit-model'])

function specInputIds(file: string, prefix: string): string[] {
  const src = readFileSync(file, 'utf8')
  const ids = new Set<string>()
  for (const m of src.matchAll(/id="([a-z0-9-]+)"/g)) {
    if (m[1].startsWith(prefix) && !IDENTITY_FIELDS.has(m[1])) ids.add(m[1])
  }
  return [...ids].sort()
}

test('every inverter spec field on the form has a datasheet translation', () => {
  // THE regression guard. A field added to the form without an entry here is
  // a field a beginner will leave blank, which is exactly what happened on a
  // Sun Gold SPH10048P: five of nine blank, all of them stated on the sheet.
  const onForm = specInputIds(PAGES.inverter, 'unit-')
  assert.ok(onForm.length >= 10, `expected the spec fields, found ${onForm.length}`)
  for (const id of onForm) {
    assert.ok(fieldHelp(id), `${id} is on the inverter form with no entry in datasheet-vocabulary`)
  }
})

test('every panel spec field on the form has a datasheet translation', () => {
  const onForm = specInputIds(PAGES.panel, 'panel-')
  assert.ok(onForm.length >= 8, `expected the panel fields, found ${onForm.length}`)
  for (const id of onForm) {
    assert.ok(fieldHelp(id), `${id} is on the array form with no entry in datasheet-vocabulary`)
  }
})

test('no entry describes a field that does not exist', () => {
  const real = new Set([
    ...specInputIds(PAGES.inverter, 'unit-'),
    ...specInputIds(PAGES.panel, 'panel-'),
  ])
  for (const f of DATASHEET_FIELDS) {
    assert.ok(real.has(f.id), `${f.id} is translated but is on no form`)
  }
})

test('every field offers real alternative wording', () => {
  for (const f of DATASHEET_FIELDS) {
    assert.ok(f.alsoCalled.length >= 2, `${f.id} needs more than one alias to be useful`)
    assert.ok(f.section.length > 0, `${f.id} must say where on the sheet to look`)
    // An alias identical to our own label teaches nothing.
    assert.ok(
      !f.alsoCalled.some(a => a.toLowerCase() === f.label.toLowerCase()),
      `${f.id} lists our own name as an alias`,
    )
  }
})

test('the fields that actually caught someone out are covered', () => {
  // Verbatim from the Sun Gold SPH10048P manual V1.3, pages 58-59.
  const cases: [string, string][] = [
    ['unit-ac-surge', 'Max. Peak Power'],
    ['unit-pv-power', 'Max. Input Power'],
    ['unit-pv-current', 'Max. Input Current'],
    ['unit-charge', 'Max. PV Charge Current'],
    ['unit-pv-max-v', 'Max. Open Circuit Voltage'],
  ]
  for (const [id, printed] of cases) {
    const help = fieldHelp(id)
    assert.ok(help, id)
    assert.ok(
      help.alsoCalled.some(a => a.toLowerCase().includes(printed.toLowerCase().replace(/\.$/, ''))),
      `${id} does not list "${printed}", which is what the datasheet actually prints`,
    )
  }
  // The MPPT range is one row and two boxes; both halves must say so.
  for (const id of ['unit-mppt-min', 'unit-mppt-max']) {
    assert.match(fieldHelp(id)!.alsoCalled.join(' '), /MPPT Operating Voltage Range/)
  }
  assert.match(fieldHelp('unit-mppt-max')!.gotcha ?? '', /one row/i)
  // And "22/22 A" gets an explicit warning, because it reads as a fraction.
  assert.match(fieldHelp('unit-pv-current')!.gotcha ?? '', /22\/22/)
})

test('both steps are covered', () => {
  assert.ok(fieldsFor('inverter').length >= 10)
  assert.ok(fieldsFor('panel').length >= 8)
})

// ---------------------------------------------------------------------------
// The library
// ---------------------------------------------------------------------------

test('every admitted preset passes review with no failures', () => {
  assert.ok(INVERTER_PRESETS.length > 0, 'the library should not be empty any more')
  for (const spec of INVERTER_PRESETS) {
    const flags = reviewInverterSpec(spec)
    assert.notEqual(
      worstSeverity(flags), 'fail',
      `${spec.model}: ${flags.filter(f => f.severity === 'fail').map(f => f.message).join('; ')}`,
    )
  }
})

test('preset ids are unique and every row cites the manufacturer', () => {
  const ids = INVERTER_PRESETS.map(p => p.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate preset id')
  for (const p of INVERTER_PRESETS) {
    assert.match(p.sourceUrl, /^https:\/\//, p.model)
  }
})

test('the Sun Gold rows match the manual, including the two-ceiling split', () => {
  const ten = INVERTER_PRESETS.find(p => p.model === 'SPH10048P')
  assert.ok(ten, 'SPH10048P should be in the library')
  assert.equal(ten.acContinuousW, 10000)
  assert.equal(ten.acSurgeW, 20000)
  assert.equal(ten.dcSystemVoltage, 48)
  // The whole point of the row: 500 is the damage ceiling, 425 the window top.
  assert.equal(ten.pvMaxInputV, 500)
  assert.equal(ten.mpptMaxV, 425)
  assert.equal(ten.mpptMinV, 125)
  assert.notEqual(ten.pvMaxInputV, ten.mpptMaxV, 'the two ceilings must stay distinct')
  assert.equal(ten.mpptCount, 2)
  assert.equal(ten.pvMaxPowerW, 11000)
  // "22/22 A" is 22 per tracker, not 44 across two.
  assert.equal(ten.pvMaxCurrentA, 22)
  assert.equal(ten.maxChargeCurrentA, 200)

  const eight = INVERTER_PRESETS.find(p => p.model === 'SPH8048P')
  assert.ok(eight)
  assert.equal(eight.acContinuousW, 8000)
  assert.equal(eight.acSurgeW, 16000)
  assert.equal(eight.maxChargeCurrentA, 180)
  // The PV side is shared across the series.
  assert.equal(eight.pvMaxPowerW, ten.pvMaxPowerW)
  assert.equal(eight.pvMaxInputV, ten.pvMaxInputV)
})

test('review catches the swap this list exists to prevent', () => {
  const good = INVERTER_PRESETS[0]
  const swapped = { ...good, pvMaxInputV: good.mpptMaxV, mpptMaxV: good.pvMaxInputV }
  const flags = reviewInverterSpec(swapped)
  assert.equal(worstSeverity(flags), 'fail')
  assert.ok(flags.some(f => f.code === 'window-above-ceiling'))
})

test('review catches an inverted window, a low surge, and a total-not-per-tracker current', () => {
  const good = INVERTER_PRESETS[0]
  assert.ok(reviewInverterSpec({ ...good, mpptMinV: 450, mpptMaxV: 120 })
    .some(f => f.code === 'window-inverted'))
  assert.ok(reviewInverterSpec({ ...good, acSurgeW: 1000 })
    .some(f => f.code === 'surge-below-continuous'))
  assert.ok(reviewInverterSpec({ ...good, pvMaxCurrentA: 88 })
    .some(f => f.code === 'pv-current-range'))
})
