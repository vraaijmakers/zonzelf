// Reading a manufacturer datasheet into the /admin/catalog verify form.
//
// WHY A MODEL READS IT AND NOT A PARSER. Panel datasheets put six models in
// side-by-side columns, each with a front-STC and a bifacial-gain sub-column
// (the Seraphim SRP-4x0-BTE-BG sheet, 2026-09-30). Plain PDF text extraction
// scrambles that table — values come out separated from their labels and from
// their column — so a pattern parser would sooner or later read the wrong
// column, silently. Claude reads the page as a page.
//
// WHAT THIS IS NOT. It does not verify anything. It fills empty form fields
// and says, per field, where on the sheet it read the value; the admin still
// checks them against the PDF and clicks Verify, and the physics checks in
// catalog-view.ts still run. The admission gate is unchanged: a human
// confirming the manufacturer's document.
//
// Pure: schema, prompt, link resolution and the shape check live here so CI
// can test them; the network calls live in the server action.

import { INVERTER_FIELDS, PANEL_FIELDS } from './catalog-view'

export type ExtractCategory = 'panel' | 'inverter'

/** Datasheets above this are refused rather than sent. */
export const MAX_DATASHEET_BYTES = 20 * 1024 * 1024

const UNITS: Record<string, string> = {
  watts_stc: 'watts at STC, front side only (not the bifacial/BNPI column)',
  voc_stc: 'volts, STC', vmp_stc: 'volts, STC', isc_stc: 'amps, STC', imp_stc: 'amps, STC',
  beta_voc_pct: '%/°C, negative', beta_pmax_pct: '%/°C, negative', beta_vmp_pct: '%/°C',
  alpha_isc_pct: '%/°C, positive', max_series_fuse_a: 'amps',
  length_mm: 'millimetres, the longer side', width_mm: 'millimetres', thickness_mm: 'millimetres (frame depth)',
  weight_kg: 'kilograms, the module itself (convert from lb if needed)',
  ac_continuous_w: 'watts', ac_surge_w: 'watts', ac_surge_seconds: 'seconds', dc_system_voltage: 'volts, NOMINAL battery voltage (48, not 40-60)',
  pv_max_input_v: 'volts — the ABSOLUTE maximum PV open-circuit input (damage limit)',
  mppt_min_v: 'volts — bottom of the MPPT operating range', mppt_max_v: 'volts — top of the MPPT operating range',
  mppt_start_v: 'volts — start-up voltage', mppt_count: 'number of independent MPPT trackers',
  pv_max_power_w: 'watts — maximum PV array power', pv_max_current_a: 'amps PER TRACKER — max USABLE input current',
  pv_max_isc_a: 'amps PER TRACKER — max short-circuit current', max_charge_current_a: 'amps — max battery charge current',
}

function fieldsFor(category: ExtractCategory) {
  return category === 'panel' ? PANEL_FIELDS : INVERTER_FIELDS
}

/**
 * The structured-output schema: every form field as number-or-null, plus the
 * column the model read and one source note per field it filled.
 */
export function extractionSchema(category: ExtractCategory) {
  const values: Record<string, unknown> = {}
  for (const f of fieldsFor(category)) {
    values[f.name] = { type: ['number', 'null'], description: UNITS[f.name] ?? f.label }
  }
  if (category === 'panel') {
    values.cell_type = { type: ['string', 'null'], description: 'e.g. Monocrystalline, N-type TOPCon, PERC' }
    values.bifacial = { type: ['boolean', 'null'] }
  } else {
    values.kind = {
      type: ['string', 'null'],
      enum: ['hybrid', 'inverter-only', 'charge-controller', null],
      description: 'hybrid = inverter + MPPT solar charger + battery charger in one box',
    }
  }
  return {
    type: 'object',
    additionalProperties: false,
    required: ['found', 'column', 'values', 'notes', 'problems'],
    properties: {
      found: { type: 'boolean', description: 'false if this datasheet does not cover the requested model' },
      column: { type: ['string', 'null'], description: 'the exact model heading of the column you read, as printed' },
      values: {
        type: 'object',
        additionalProperties: false,
        required: Object.keys(values),
        properties: values,
      },
      notes: {
        type: 'array',
        description: 'one entry per non-null value: the field name and the label it was printed under',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['field', 'source'],
          properties: { field: { type: 'string' }, source: { type: 'string' } },
        },
      },
      problems: {
        type: 'array',
        items: { type: 'string' },
        description: 'anything a reviewer must know: unreadable cells, ambiguous columns, values given only as ranges',
      },
    },
  } as const
}

export function extractionPrompt(category: ExtractCategory, model: { brand: string; model: string; mpn: string | null }): string {
  const target = `${model.brand} ${model.model}${model.mpn ? ` (part number ${model.mpn})` : ''}`
  return [
    `This is a manufacturer datasheet. Read the specifications for exactly one product: ${target}.`,
    '',
    'Datasheets often cover several models in side-by-side columns. Find the column whose heading matches this product',
    'and read every value from that column only. Report the heading you used in "column". If no column matches, or the',
    'match is ambiguous, set "found" to false and explain in "problems" — never fall back to a neighbouring column.',
    '',
    category === 'panel'
      ? 'Use the STC figures for the FRONT side. Ignore bifacial-gain, BNPI, NOCT/NMOT and rear-power columns.'
      : 'Keep the absolute maximum PV input voltage separate from the MPPT operating range, and the usable input current separate from the short-circuit current. Currents are per tracker.',
    '',
    'Copy numbers as printed; convert units only to the unit each field asks for. Leave a field null when the sheet does',
    'not state it — never estimate, derive or assume a typical value. For each value you fill, add a note naming the',
    'printed label it came from.',
  ].join('\n')
}

/**
 * A link that is a share page rather than the PDF itself (imagerelay, which
 * Signature Solar uses) carries the real file as a signed link in its HTML.
 * Returns that link, or null. One hop only — this is not a crawler.
 */
export function pdfLinkInHtml(html: string): string | null {
  const m = html.match(/https:\/\/[^"'\s<>]+?\.pdf(?:\?[^"'\s<>]*)?/i)
  return m ? m[0].replace(/&amp;/g, '&') : null
}

export type Extraction = {
  found: boolean
  column: string | null
  /** Form field name → value as the form shows it. Only fields with a value. */
  values: Record<string, string>
  /** Form field name → where on the sheet it was read. */
  sources: Record<string, string>
  problems: string[]
}

/**
 * Checks the model's answer before it reaches the form: unknown fields are
 * dropped, numbers must be finite, and a "not found" answer fills nothing.
 * The form's own validation and the physics checks run again on Verify.
 */
export function normalizeExtraction(raw: unknown, category: ExtractCategory): Extraction {
  const r = (raw ?? {}) as {
    found?: unknown; column?: unknown; values?: Record<string, unknown>; notes?: unknown; problems?: unknown
  }
  const problems = Array.isArray(r.problems) ? r.problems.filter((p): p is string => typeof p === 'string') : []
  const column = typeof r.column === 'string' && r.column.trim() ? r.column.trim() : null
  if (r.found !== true) {
    return { found: false, column, values: {}, sources: {}, problems: problems.length ? problems : ['The datasheet does not appear to cover this model.'] }
  }

  const allowed = new Set(fieldsFor(category).map(f => f.name))
  const values: Record<string, string> = {}
  for (const [k, v] of Object.entries(r.values ?? {})) {
    if (allowed.has(k) && typeof v === 'number' && Number.isFinite(v)) values[k] = String(v)
  }
  if (category === 'panel') {
    const cell = r.values?.cell_type
    if (typeof cell === 'string' && cell.trim()) values.cell_type = cell.trim()
    if (typeof r.values?.bifacial === 'boolean') values.bifacial = r.values.bifacial ? 'on' : ''
  } else {
    const kind = r.values?.kind
    if (kind === 'hybrid' || kind === 'inverter-only' || kind === 'charge-controller') values.kind = kind
  }

  const sources: Record<string, string> = {}
  if (Array.isArray(r.notes)) {
    for (const n of r.notes as { field?: unknown; source?: unknown }[]) {
      if (typeof n?.field === 'string' && typeof n?.source === 'string' && n.field in values) sources[n.field] = n.source
    }
  }
  return { found: true, column, values, sources, problems }
}
