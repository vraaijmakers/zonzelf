// The California Energy Commission PV module list, as data.
//
// Pure: no network, no database. scripts/import-cec-pv.ts downloads the list
// and feeds its rows through parseCecRow(); scripts/lib/catalog-write.ts looks
// a retailer's panel up with findCecMatch(). Kept here so CI can test both
// without credentials.
//
// WHAT THE LIST IS AND IS NOT. Lab-tested electrical data filed for
// California's incentive programmes: nameplate Pmax, Isc, Voc, Imp, Vmp and all
// three temperature coefficients, for 22,186 modules from 287 manufacturers
// (2026-09-30). It is NOT the manufacturer's datasheet, and for the one panel
// verified here by hand it disagrees with it: SG550WM beta-Voc -0.35 %/degC on
// the sheet, -0.259 on the list. So it pre-fills candidates and never publishes
// anything by itself — see supabase/migrations/20260930000001_component_catalog.sql.

export const CEC_PV_LIST_URL =
  'https://solarequipment.energy.ca.gov/Home/DownloadtoExcel?filename=PVModuleList'

/** The header row, exactly as the "PV Module-Full" sheet prints it. */
export const CEC_PV_HEADER = [
  'Manufacturer', 'Model Number', 'Description', 'Safety Certification', 'Nameplate Pmax',
  'PTC', 'Notes', 'Design Qualification Certification\n(Optional Submission)',
  'Performance Evaluation (Optional Submission)', 'Family', 'Technology', 'A_c', 'N_s', 'N_p',
  'BIPV', 'Nameplate Isc', 'Nameplate Voc', 'Nameplate Ipmax', 'Nameplate Vpmax',
  'Average NOCT', 'γPmax', 'αIsc', 'βVoc', 'αIpmax', 'βVpmax', 'IPmax, low', 'VPmax, low',
  'IPmax, NOCT', 'VPmax, NOCT', 'Mounting', 'Type', 'Short Side', 'Long Side',
  'Geometric Multiplier', 'P2/Pref', 'CEC Listing Date', 'Last Update',
] as const

type Column = (typeof CEC_PV_HEADER)[number]

export type CecPvModule = {
  manufacturer: string
  model_number: string
  model_key: string
  description: string | null
  technology: string | null
  bifacial: boolean | null
  pmax_w: number | null
  isc_a: number | null
  voc_v: number | null
  imp_a: number | null
  vmp_v: number | null
  noct_c: number | null
  gamma_pmax_pct: number | null
  alpha_isc_pct: number | null
  beta_voc_pct: number | null
  beta_vmp_pct: number | null
  cells_in_series: number | null
  short_side_m: number | null
  long_side_m: number | null
  listed_on: string | null
  pending_removal: boolean
}

/**
 * The key two part numbers are compared on: upper-case, alphanumerics only.
 *
 * Also drops the CEC's own "{Wht}" / "{208V}" suffix, which the list's notes
 * say is not part of the manufacturer's model number — it marks a variant the
 * manufacturer tested separately.
 */
export function modelKey(modelNumber: string): string {
  return modelNumber.replace(/\{[^}]*\}\s*$/, '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Finds the header row; the sheet opens with ~16 rows of notes. */
export function findHeaderRow(rows: unknown[][]): number {
  return rows.findIndex(r => r[0] === 'Manufacturer' && r[1] === 'Model Number')
}

/**
 * Refuses a sheet whose columns moved. Every value below is read by position,
 * and a silently shifted column would put Isc where Voc belongs — which is a
 * protection-register input read off the wrong column.
 */
export function assertCecHeader(header: unknown[]): void {
  // Whitespace-insensitive: the raw sheet XML has "\r\n" inside two headers
  // where other readers normalise to "\n". A column moving is the concern.
  const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
  const mismatches = CEC_PV_HEADER
    .map((name, i) => (norm(header[i]) === norm(name) ? null : `col ${i}: expected ${JSON.stringify(name)}, got ${JSON.stringify(header[i])}`))
    .filter((m): m is string => m !== null)
  if (mismatches.length > 0) {
    throw new Error(`CEC PV module list header changed — refusing to import:\n  ${mismatches.join('\n  ')}`)
  }
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  return null
}

function text(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).replace(/ /g, ' ').trim()
  return s === '' ? null : s
}

/**
 * Excel stores dates as a serial day count from 1899-12-30. The xlsx reader
 * hands back the raw number; this turns it into an ISO date.
 */
export function excelSerialToIsoDate(v: unknown): string | null {
  const n = num(v)
  if (n === null || n < 1) return null
  const ms = Date.UTC(1899, 11, 30) + Math.round(n) * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
}

/** One data row → a module, or null for a blank/footer row. */
export function parseCecRow(row: unknown[]): CecPvModule | null {
  const at = (c: Column) => row[CEC_PV_HEADER.indexOf(c)]
  const manufacturer = text(at('Manufacturer'))
  const model_number = text(at('Model Number'))
  if (!manufacturer || !model_number) return null

  const description = text(at('Description'))
  const notes = text(at('Notes')) ?? ''
  return {
    manufacturer,
    model_number,
    model_key: modelKey(model_number),
    description,
    technology: text(at('Technology')),
    // No bifacial column; the description says so when it is. Matched on the
    // prefix because the list misspells it ("bifaical", Trina TSM-420NE09RC.05).
    bifacial: description === null ? null : /\bbi-?fa/i.test(description),
    pmax_w: num(at('Nameplate Pmax')),
    isc_a: num(at('Nameplate Isc')),
    voc_v: num(at('Nameplate Voc')),
    imp_a: num(at('Nameplate Ipmax')),
    vmp_v: num(at('Nameplate Vpmax')),
    noct_c: num(at('Average NOCT')),
    gamma_pmax_pct: num(at('γPmax')),
    alpha_isc_pct: num(at('αIsc')),
    beta_voc_pct: num(at('βVoc')),
    beta_vmp_pct: num(at('βVpmax')),
    cells_in_series: num(at('N_s')),
    short_side_m: num(at('Short Side')),
    long_side_m: num(at('Long Side')),
    listed_on: excelSerialToIsoDate(at('CEC Listing Date')),
    pending_removal: notes.includes('***') || model_number.includes('***'),
  }
}

/**
 * Picks the CEC row for a retailer's panel, or explains why none.
 *
 * A retailer's "Manufacture Part#" is often the model FAMILY rather than the
 * exact part: Signature Solar lists the Trina Vertex 420W as TSM-NE09RC.05,
 * while the CEC files it as TSM-420NE09RC.05 — the wattage is inside the part
 * number. So an exact key match is tried first, then a family match (every
 * CEC key that contains the retailer's key, with or without its wattage
 * digits), narrowed by wattage. Anything
 * still ambiguous returns no match: guessing between two panels' electricals
 * is the one thing this must never do.
 */
export type CecMatch =
  | { kind: 'exact' | 'family'; module: CecPvModule }
  | { kind: 'none'; reason: string }

export function findCecMatch(
  mpn: string,
  watts: number | null,
  candidates: CecPvModule[],
): CecMatch {
  const key = modelKey(mpn)
  if (key.length < 5) return { kind: 'none', reason: `part number "${mpn}" too short to match safely` }

  const live = candidates.filter(c => !c.pending_removal)
  const byWatts = (rows: CecPvModule[]) =>
    watts === null ? rows : rows.filter(c => c.pmax_w !== null && Math.abs(c.pmax_w - watts) < 0.5)

  const exact = byWatts(live.filter(c => c.model_key === key))
  if (exact.length > 0) return pick('exact', exact)

  if (watts === null) return { kind: 'none', reason: 'no exact part-number match, and no wattage to narrow a family match' }
  // The wattage sits in the MIDDLE of the CEC key (TSM-[420]NE09RC.05), so the
  // retailer's family key is found only once it is taken out.
  const w = String(Math.round(watts))
  const family = byWatts(live.filter(c => c.model_key.includes(key) || c.model_key.replace(w, '').includes(key)))
  if (family.length > 0) return pick('family', family)

  return { kind: 'none', reason: `no CEC module matches "${mpn}" at ${watts} W` }
}

function pick(kind: 'exact' | 'family', rows: CecPvModule[]): CecMatch {
  // Two CEC rows can be the same electrical module filed twice (backsheet
  // colour variants, or the same OEM part under two brand names). That is only
  // one answer if every protection-register figure agrees.
  const first = rows[0]
  const sameElectricals = rows.every(r =>
    r.voc_v === first.voc_v && r.isc_a === first.isc_a && r.vmp_v === first.vmp_v &&
    r.imp_a === first.imp_a && r.beta_voc_pct === first.beta_voc_pct)
  if (!sameElectricals) {
    return {
      kind: 'none',
      reason: `${rows.length} CEC rows match with different electricals (${rows.slice(0, 3).map(r => r.model_number).join(', ')}${rows.length > 3 ? ', …' : ''})`,
    }
  }
  return { kind, module: first }
}
