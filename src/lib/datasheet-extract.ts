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

import { BATTERY_FIELDS, INVERTER_FIELDS, PANEL_FIELDS } from './catalog-view'

export type ExtractCategory = 'panel' | 'inverter' | 'battery'

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
  voltage: 'volts — NOMINAL pack voltage (e.g. 51.2), not the charge or cut-off voltage',
  capacity_ah: 'amp-hours, nominal, ONE unit (not a multi-pack)', capacity_kwh: 'kilowatt-hours, nominal energy of ONE unit',
  dod_rated: 'percent — the rated or recommended depth of discharge',
}

function fieldsFor(category: ExtractCategory) {
  return category === 'panel' ? PANEL_FIELDS : category === 'battery' ? BATTERY_FIELDS : INVERTER_FIELDS
}

/**
 * The structured-output schema.
 *
 * NO NULLABLE OR UNION TYPES, and that is a hard API limit rather than taste:
 * structured outputs refuse a schema with more than 16 union-typed parameters
 * ("exponential compilation cost"), and the first version — every form field
 * as number-or-null — had 17 for a panel. So the figures come back as a LIST
 * of readings, each naming its field: a value the sheet does not state is
 * simply absent. The source label rides on each reading, so there is no
 * separate notes array to keep in step with it.
 */
export function extractionSchema(category: ExtractCategory) {
  const fieldNames = fieldsFor(category).map(f => f.name)
  const units = fieldNames.map(n => `${n}: ${UNITS[n] ?? n}`).join('; ')
  const extra = category === 'panel'
    ? {
        cell_type: { type: 'string', description: 'e.g. Monocrystalline, N-type TOPCon, PERC; empty string if not stated' },
        bifacial: { type: 'string', enum: ['yes', 'no', 'unknown'] },
      }
    : category === 'battery'
    ? {
        chemistry: { type: 'string', enum: ['lifepo4', 'agm', 'gel', 'flooded', 'unknown'], description: 'lifepo4 = LiFePO4 / lithium iron phosphate' },
      }
    : {
        kind: {
          type: 'string',
          enum: ['hybrid', 'inverter-only', 'charge-controller', 'unknown'],
          description: 'hybrid = inverter + MPPT solar charger + battery charger in one box',
        },
      }
  return {
    type: 'object',
    additionalProperties: false,
    required: ['found', 'column', 'readings', 'problems', ...Object.keys(extra)],
    properties: {
      found: { type: 'boolean', description: 'false if this datasheet does not cover the requested model' },
      column: { type: 'string', description: 'the exact model heading of the column you read, as printed; empty string if none' },
      readings: {
        type: 'array',
        description: `One entry per figure the sheet states for this model. Omit figures it does not state. Units — ${units}`,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['field', 'value', 'source'],
          properties: {
            field: { type: 'string', enum: fieldNames },
            value: { type: 'number' },
            source: { type: 'string', description: 'the printed label (and column) the value was read from' },
          },
        },
      },
      problems: {
        type: 'array',
        items: { type: 'string' },
        description: 'anything a reviewer must know: unreadable cells, ambiguous columns, values given only as ranges',
      },
      ...extra,
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
      : category === 'battery'
      ? 'Give the figures for ONE battery unit: nominal voltage, capacity and energy — not a system of several units, and not charge or cut-off voltages.'
      : 'Keep the absolute maximum PV input voltage separate from the MPPT operating range, and the usable input current separate from the short-circuit current. Currents are per tracker.',
    '',
    'Copy numbers as printed; convert units only to the unit each field asks for. Leave out any figure the sheet does',
    'not state it — never estimate, derive or assume a typical value. Give each figure as one reading, with the',
    'printed label it came from as its source.',
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
    found?: unknown; column?: unknown; readings?: unknown; problems?: unknown
    cell_type?: unknown; bifacial?: unknown; kind?: unknown
  }
  const problems = Array.isArray(r.problems) ? r.problems.filter((p): p is string => typeof p === 'string') : []
  const column = typeof r.column === 'string' && r.column.trim() ? r.column.trim() : null
  if (r.found !== true) {
    return { found: false, column, values: {}, sources: {}, problems: problems.length ? problems : ['The datasheet does not appear to cover this model.'] }
  }

  const allowed = new Set(fieldsFor(category).map(f => f.name))
  const values: Record<string, string> = {}
  const sources: Record<string, string> = {}
  const seen = new Set<string>()
  for (const item of Array.isArray(r.readings) ? r.readings : []) {
    const { field, value, source } = (item ?? {}) as { field?: unknown; value?: unknown; source?: unknown }
    if (typeof field !== 'string' || !allowed.has(field)) continue
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    // Two readings for one field means the model was unsure which cell is
    // right. Neither is safe to pre-fill; the reviewer types it.
    if (seen.has(field)) {
      delete values[field]
      delete sources[field]
      problems.push(`Two different readings for ${field} — left empty, read it off the sheet.`)
      continue
    }
    seen.add(field)
    values[field] = String(value)
    if (typeof source === 'string' && source.trim()) sources[field] = source.trim()
  }

  if (category === 'panel') {
    if (typeof r.cell_type === 'string' && r.cell_type.trim()) values.cell_type = r.cell_type.trim()
    if (r.bifacial === 'yes') values.bifacial = 'on'
    else if (r.bifacial === 'no') values.bifacial = ''
  } else if (category === 'battery') {
    const c = (r as { chemistry?: unknown }).chemistry
    if (c === 'lifepo4' || c === 'agm' || c === 'gel' || c === 'flooded') values.chemistry = c
  } else if (r.kind === 'hybrid' || r.kind === 'inverter-only' || r.kind === 'charge-controller') {
    values.kind = r.kind
  }
  return { found: true, column, values, sources, problems }
}
