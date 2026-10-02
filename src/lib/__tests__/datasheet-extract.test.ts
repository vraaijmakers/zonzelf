import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractionPrompt, extractionSchema, normalizeExtraction, pdfLinkInHtml } from '../datasheet-extract'
import { INVERTER_FIELDS, PANEL_FIELDS } from '../catalog-view'

// The Seraphim SRP-4x0-BTE-BG sheet (2026-09-30), SRP-440-BTE-BG column, Front STC.
const SERAPHIM_440 = {
  found: true,
  column: 'SRP-440-BTE-BG',
  values: {
    watts_stc: 440, voc_stc: 35.38, vmp_stc: 29.41, isc_stc: 15.8, imp_stc: 14.97,
    beta_voc_pct: -0.25, beta_pmax_pct: -0.29, beta_vmp_pct: null, alpha_isc_pct: 0.046,
    max_series_fuse_a: null, length_mm: 1762, width_mm: 1134, thickness_mm: 30, weight_kg: null,
    cell_type: 'N-type', bifacial: true,
  },
  notes: [
    { field: 'voc_stc', source: 'Open Circuit Voltage - Voc(V), SRP-440-BTE-BG Front STC' },
    { field: 'beta_voc_pct', source: 'Voc Temperature Coefficient' },
    { field: 'not_a_field', source: 'x' },
  ],
  problems: [],
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
  // Nulls stay empty for the reviewer; a note for an unknown field is dropped.
  assert.equal('weight_kg' in e.values, false)
  assert.equal('not_a_field' in e.sources, false)
})

test('"not on this sheet" fills nothing, whatever values came with it', () => {
  const e = normalizeExtraction({ ...SERAPHIM_440, found: false, problems: ['Sheet covers SRP-4x0-BTE-BG only'] }, 'panel')
  assert.equal(e.found, false)
  assert.deepEqual(e.values, {})
  assert.deepEqual(e.problems, ['Sheet covers SRP-4x0-BTE-BG only'])
})

test('fields outside the category, strings posing as numbers, and junk are dropped', () => {
  const e = normalizeExtraction({
    found: true, column: 'X', notes: [], problems: [],
    values: { voc_stc: '35.38', isc_stc: Number.NaN, ac_continuous_w: 6000, vmp_stc: 29.41 },
  }, 'panel')
  assert.deepEqual(e.values, { vmp_stc: '29.41' })
})

test('an inverter kind outside the three known kinds is not passed through', () => {
  const base = { found: true, column: '6000XP', notes: [], problems: [], values: { ac_continuous_w: 6000 } }
  assert.equal(normalizeExtraction({ ...base, values: { ...base.values, kind: 'hybrid' } }, 'inverter').values.kind, 'hybrid')
  assert.equal('kind' in normalizeExtraction({ ...base, values: { ...base.values, kind: 'grid-tie' } }, 'inverter').values, false)
})

test('a malformed answer is treated as not found, not as an empty success', () => {
  assert.equal(normalizeExtraction(null, 'panel').found, false)
  assert.equal(normalizeExtraction({ values: { voc_stc: 40 } }, 'panel').found, false)
})

test('the schema asks for every form field, and nothing else', () => {
  const panel = extractionSchema('panel').properties.values
  assert.deepEqual([...panel.required].sort(), [...PANEL_FIELDS.map(f => f.name), 'cell_type', 'bifacial'].sort())
  const inverter = extractionSchema('inverter').properties.values
  assert.deepEqual([...inverter.required].sort(), [...INVERTER_FIELDS.map(f => f.name), 'kind'].sort())
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
