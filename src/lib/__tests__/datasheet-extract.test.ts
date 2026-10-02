import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractionPrompt, extractionSchema, normalizeExtraction, pdfLinkInHtml } from '../datasheet-extract'
import { INVERTER_FIELDS, PANEL_FIELDS } from '../catalog-view'

// The Seraphim SRP-4x0-BTE-BG sheet (2026-09-30), SRP-440-BTE-BG column, Front STC.
const r = (field: string, value: number, source = `${field} label`) => ({ field, value, source })
const SERAPHIM_440 = {
  found: true,
  column: 'SRP-440-BTE-BG',
  readings: [
    r('watts_stc', 440), r('voc_stc', 35.38, 'Open Circuit Voltage - Voc(V), SRP-440-BTE-BG Front STC'),
    r('vmp_stc', 29.41), r('isc_stc', 15.8), r('imp_stc', 14.97),
    r('beta_voc_pct', -0.25, 'Voc Temperature Coefficient'), r('beta_pmax_pct', -0.29), r('alpha_isc_pct', 0.046),
    r('length_mm', 1762), r('width_mm', 1134), r('thickness_mm', 30),
    r('not_a_field', 1),
  ],
  problems: [],
  cell_type: 'N-type',
  bifacial: 'yes',
}

test('a read column fills the form as strings, with the label each came from', () => {
  const e = normalizeExtraction(SERAPHIM_440, 'panel')
  assert.equal(e.found, true)
  assert.equal(e.column, 'SRP-440-BTE-BG')
  assert.equal(e.values.voc_stc, '35.38')
  assert.equal(e.values.beta_voc_pct, '-0.25')
  assert.equal(e.values.bifacial, 'on')
  assert.equal(e.values.cell_type, 'N-type')
  assert.equal(e.sources.voc_stc, 'Open Circuit Voltage - Voc(V), SRP-440-BTE-BG Front STC')
  // Unstated figures stay empty for the reviewer; unknown fields are dropped.
  assert.equal('weight_kg' in e.values, false)
  assert.equal('not_a_field' in e.values, false)
})

test('two readings for one field leave it empty, with a problem raised', () => {
  const e = normalizeExtraction({ ...SERAPHIM_440, readings: [r('voc_stc', 35.38), r('voc_stc', 35.46)] }, 'panel')
  assert.equal('voc_stc' in e.values, false)
  assert.match(e.problems.join(' '), /Two different readings for voc_stc/)
})

test('"not on this sheet" fills nothing, whatever values came with it', () => {
  const e = normalizeExtraction({ ...SERAPHIM_440, found: false, problems: ['Sheet covers SRP-4x0-BTE-BG only'] }, 'panel')
  assert.equal(e.found, false)
  assert.deepEqual(e.values, {})
  assert.deepEqual(e.problems, ['Sheet covers SRP-4x0-BTE-BG only'])
})

test('fields outside the category, strings posing as numbers, and junk are dropped', () => {
  const e = normalizeExtraction({
    found: true, column: 'X', problems: [], cell_type: '', bifacial: 'unknown',
    readings: [{ field: 'voc_stc', value: '35.38' }, r('isc_stc', Number.NaN), r('ac_continuous_w', 6000), r('vmp_stc', 29.41)],
  }, 'panel')
  assert.deepEqual(e.values, { vmp_stc: '29.41' })
})

test('an inverter kind outside the three known kinds is not passed through', () => {
  const base = { found: true, column: '6000XP', problems: [], readings: [r('ac_continuous_w', 6000)] }
  assert.equal(normalizeExtraction({ ...base, kind: 'hybrid' }, 'inverter').values.kind, 'hybrid')
  assert.equal('kind' in normalizeExtraction({ ...base, kind: 'unknown' }, 'inverter').values, false)
  assert.equal('kind' in normalizeExtraction({ ...base, kind: 'grid-tie' }, 'inverter').values, false)
})

test('a malformed answer is treated as not found, not as an empty success', () => {
  assert.equal(normalizeExtraction(null, 'panel').found, false)
  assert.equal(normalizeExtraction({ readings: [r('voc_stc', 40)] }, 'panel').found, false)
})

test('the schema can name every form field, and nothing else', () => {
  const panel = extractionSchema('panel').properties.readings.items.properties.field.enum
  assert.deepEqual([...panel].sort(), PANEL_FIELDS.map(f => f.name).sort())
  const inverter = extractionSchema('inverter').properties.readings.items.properties.field.enum
  assert.deepEqual([...inverter].sort(), INVERTER_FIELDS.map(f => f.name).sort())
})

// The API refuses a structured-output schema with more than 16 union-typed
// parameters; the first version had 17 nullable fields and was rejected on
// its first real call (2026-10-01). Keep it at zero, not merely under 16.
test('the schema has no nullable or union types at all', () => {
  const unions: string[] = []
  const walk = (node: unknown, path: string) => {
    if (!node || typeof node !== 'object') return
    const n = node as Record<string, unknown>
    if (Array.isArray(n.type) || 'anyOf' in n || 'oneOf' in n) unions.push(path)
    for (const [k, v] of Object.entries(n)) walk(v, `${path}.${k}`)
  }
  for (const c of ['panel', 'inverter'] as const) walk(extractionSchema(c), c)
  assert.deepEqual(unions, [])
})

test('the prompt names the exact part number and forbids a neighbouring column', () => {
  const p = extractionPrompt('panel', { brand: 'Seraphim Solar', model: '440W Bifacial Solar Panel', mpn: 'SRP-440-BTE-BG' })
  assert.match(p, /SRP-440-BTE-BG/)
  assert.match(p, /never fall back to a neighbouring column/)
  assert.match(p, /FRONT side/)
})

// The imagerelay share page Signature Solar links as "Spec Sheet", 2026-09-30.
test('a share page resolves to the signed PDF link it carries, entities decoded', () => {
  const html = `<a href="https://s3.amazonaws.com/imagerelay-assets/client/5264/assets/213478885/SRP-450-BTE-Full-Black-BG.pdf?AWSAccessKeyId=AKIA&amp;Expires=2106480428&amp;Signature=8Qup1&amp;response-content-disposition=inline">`
  assert.equal(
    pdfLinkInHtml(html),
    'https://s3.amazonaws.com/imagerelay-assets/client/5264/assets/213478885/SRP-450-BTE-Full-Black-BG.pdf?AWSAccessKeyId=AKIA&Expires=2106480428&Signature=8Qup1&response-content-disposition=inline',
  )
  assert.equal(pdfLinkInHtml('<a href="http://insecure.example/a.pdf">'), null)
  assert.equal(pdfLinkInHtml('<p>no file here</p>'), null)
})
