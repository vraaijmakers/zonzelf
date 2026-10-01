// What /admin/catalog shows and what its verify form accepts. Pure, so the
// rules are testable without a database or a session.
//
// THE VERIFY FORM IS THE ADMISSION GATE'S HUMAN HALF. The database refuses to
// publish a model whose spec row is unverified (component_models_publish_gate)
// and refuses a verified row missing a protection-register field (the CHECK on
// panel_specs / inverter_specs). What neither can do is tell a transcription
// error from a real number — so the form runs the same physics-shaped checks
// that guard PANEL_PRESETS and INVERTER_PRESETS, and a 'fail' flag blocks
// verification. 'warn' flags are shown and allowed: an unusual coefficient on a
// real datasheet is still the datasheet.

import type { PanelSpec } from './pv-string'
import type { InverterKind, InverterSpec } from './inverter-sizing'
import type { ReviewFlag } from './battery-review'
import { reviewPanelSpec } from './panel-review'
import { reviewInverterSpec } from './inverter-review'
import { priceDisplay } from './battery-price'

// ---------------------------------------------------------------------------
// Rows as the admin pages read them
// ---------------------------------------------------------------------------

export type ListingRow = {
  id: number
  retailer: string
  url: string
  title: string
  pack_qty: number
  min_order_qty: number
  price_usd: number | null
  price_scraped_at: string | null
  held_price_usd: number | null
  held_at: string | null
}

export type PanelSpecRow = {
  watts_stc: number | null
  voc_stc: number | null
  vmp_stc: number | null
  isc_stc: number | null
  imp_stc: number | null
  beta_voc_pct: number | null
  beta_vmp_pct: number | null
  beta_pmax_pct: number | null
  alpha_isc_pct: number | null
  max_series_fuse_a: number | null
  cells_in_series: number | null
  length_mm: number | null
  width_mm: number | null
  thickness_mm: number | null
  weight_kg: number | null
  cell_type: string | null
  bifacial: boolean | null
  spec_source: 'cec' | 'retailer' | 'datasheet'
  cec_manufacturer: string | null
  cec_model_number: string | null
  verified_at: string | null
}

export type InverterSpecRow = {
  kind: InverterKind | null
  ac_continuous_w: number | null
  ac_surge_w: number | null
  ac_surge_seconds: number | null
  dc_system_voltage: number | null
  pv_max_input_v: number | null
  mppt_min_v: number | null
  mppt_max_v: number | null
  mppt_start_v: number | null
  mppt_count: number | null
  pv_max_power_w: number | null
  pv_max_current_a: number | null
  pv_max_isc_a: number | null
  max_charge_current_a: number | null
  spec_source: 'retailer' | 'datasheet'
  verified_at: string | null
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/**
 * Where a model stands, in the order a reviewer works through them. One value
 * per model so the list can filter on it.
 *
 *   hidden      rejected by an admin; kept so the scraper cannot re-insert it
 *   published   live — only reachable from 'verified'
 *   verified    specs confirmed from the datasheet; ready to publish
 *   candidate   electricals pre-filled from the CEC list; needs the datasheet
 *   unspecced   no electricals at all (every scraped inverter starts here)
 */
export type CatalogStatus = 'hidden' | 'published' | 'verified' | 'candidate' | 'unspecced'

export const STATUS_LABEL: Record<CatalogStatus, string> = {
  hidden: 'Hidden',
  published: 'Published',
  verified: 'Verified — ready to publish',
  candidate: 'Pre-filled from CEC — check datasheet',
  unspecced: 'No specs yet',
}

/**
 * What each status means and what to do about it, in plain English — shown as
 * the legend on /admin/catalog and as the note on a model page. "CEC" is
 * explained wherever it appears (CLAUDE.md: explain jargon the first time).
 */
export const CEC_EXPLAINED =
  'CEC is the California Energy Commission. Its Solar Equipment List is a free public register of ' +
  'about 22,000 panels whose makers submitted independent lab-test results — power, voltages, ' +
  'currents and temperature coefficients — to qualify for California incentive programmes.'

export const STATUS_HELP: Record<CatalogStatus, { meaning: string; action: string }> = {
  candidate: {
    meaning:
      'The scraper matched this panel to the CEC list by part number and copied the lab figures in. ' +
      'Probably close, not yet checked. They are not the manufacturer’s datasheet, and the two can ' +
      'differ: for the SG550WM the CEC list says the voltage rises less in the cold than the datasheet ' +
      'does, which would let a string hold more panels than is safe.',
    action:
      'Open the spec sheet and type the figures in from it, comparing against the CEC column. They agree: ' +
      'verify, then publish. They differ a little: the datasheet wins — enter its figures and verify. ' +
      'They differ a lot, or the sheet names a different panel: the match is wrong — hide it or leave it. ' +
      'No trustworthy sheet: leave it; nothing breaks, it just is not offered to visitors.',
  },
  unspecced: {
    meaning:
      'Nothing electrical is known yet. Every inverter starts here — shops do not publish inverter specs ' +
      'and the CEC inverter list does not cover off-grid units — and so does a panel with no CEC match.',
    action:
      'Worth doing only for products people will actually pick. Open the spec sheet and fill in the whole ' +
      'form from it; watch the PV damage ceiling against the top of the MPPT window, and usable against ' +
      'short-circuit current per tracker. Anything that is not a real unit (a cable, a kit): hide it.',
  },
  verified: {
    meaning: 'Specs were typed in from the manufacturer’s datasheet and passed the physics checks.',
    action: 'Publish it when you want the calculators to offer it. To correct a figure, change it and verify again.',
  },
  published: {
    meaning: 'Live: the calculators can offer it, with its shop listings as buy links.',
    action: 'Nothing, unless a price is held. To change its specs, unpublish first — the database insists.',
  },
  hidden: {
    meaning: 'Rejected. Kept rather than deleted, so next week’s scrape finds it and leaves it alone.',
    action: 'Nothing. Unhide it if it was hidden by mistake.',
  },
}

export function catalogStatus(
  model: { is_published: boolean; is_hidden: boolean },
  spec: { spec_source: string; verified_at: string | null } | null,
): CatalogStatus {
  if (model.is_hidden) return 'hidden'
  if (model.is_published) return 'published'
  if (spec?.verified_at) return 'verified'
  if (spec?.spec_source === 'cec') return 'candidate'
  return 'unspecced'
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

/** One unit's price from a listing: a pallet of 36 at $4,365 is $121.25. */
export function unitPrice(listing: Pick<ListingRow, 'price_usd' | 'pack_qty'>): number | null {
  if (listing.price_usd === null || listing.pack_qty < 1) return null
  return listing.price_usd / listing.pack_qty
}

/**
 * The cheapest CURRENT unit price across a model's listings, or null. A price
 * older than PRICE_MAX_AGE_DAYS is not current — the same rule the battery
 * calculator applies — so a dead listing cannot win "cheapest".
 */
export function cheapestUnitPrice(listings: ListingRow[], now = new Date()): { price: number; listing: ListingRow } | null {
  let best: { price: number; listing: ListingRow } | null = null
  for (const l of listings) {
    const unit = unitPrice(l)
    if (unit === null) continue
    if (priceDisplay(l.price_usd, l.price_scraped_at, now).kind === 'stale') continue
    if (!best || unit < best.price) best = { price: unit, listing: l }
  }
  return best
}

export function dollarsPerWatt(unitPriceUsd: number | null, watts: number | null): number | null {
  if (unitPriceUsd === null || !watts) return null
  return unitPriceUsd / watts
}

// ---------------------------------------------------------------------------
// The verify form
// ---------------------------------------------------------------------------

export type VerifyResult<T> =
  | { ok: true; spec: T; flags: ReviewFlag[] }
  | { ok: false; errors: string[]; flags: ReviewFlag[] }

type FieldSpec = { name: string; label: string; required: boolean; integer?: boolean; negative?: boolean }

export const PANEL_FIELDS: FieldSpec[] = [
  { name: 'watts_stc', label: 'Pmax (W, STC)', required: true },
  { name: 'voc_stc', label: 'Voc (V)', required: true },
  { name: 'vmp_stc', label: 'Vmp (V)', required: true },
  { name: 'isc_stc', label: 'Isc (A)', required: true },
  { name: 'imp_stc', label: 'Imp (A)', required: true },
  { name: 'beta_voc_pct', label: 'Voc temp. coefficient (%/°C)', required: true, negative: true },
  { name: 'beta_pmax_pct', label: 'Pmax temp. coefficient (%/°C)', required: false, negative: true },
  { name: 'beta_vmp_pct', label: 'Vmp temp. coefficient (%/°C)', required: false },
  { name: 'alpha_isc_pct', label: 'Isc temp. coefficient (%/°C)', required: false },
  { name: 'max_series_fuse_a', label: 'Max series fuse (A)', required: false },
  { name: 'length_mm', label: 'Length (mm)', required: false },
  { name: 'width_mm', label: 'Width (mm)', required: false },
  { name: 'thickness_mm', label: 'Thickness (mm)', required: false },
  { name: 'weight_kg', label: 'Module weight (kg)', required: false },
]

export const INVERTER_FIELDS: FieldSpec[] = [
  { name: 'ac_continuous_w', label: 'AC continuous (W)', required: true },
  { name: 'ac_surge_w', label: 'AC surge (W)', required: false },
  { name: 'ac_surge_seconds', label: 'Surge held for (s)', required: false },
  { name: 'dc_system_voltage', label: 'Battery voltage (V, nominal)', required: true },
  { name: 'pv_max_input_v', label: 'PV max input — damage ceiling (V)', required: true },
  { name: 'mppt_min_v', label: 'MPPT window low (V)', required: true },
  { name: 'mppt_max_v', label: 'MPPT window high (V)', required: true },
  { name: 'mppt_start_v', label: 'MPPT start (V)', required: false },
  { name: 'mppt_count', label: 'Trackers', required: true, integer: true },
  { name: 'pv_max_power_w', label: 'PV max array (W)', required: true },
  { name: 'pv_max_current_a', label: 'PV max USABLE current per tracker (A)', required: true },
  { name: 'pv_max_isc_a', label: 'PV max short-circuit current per tracker (A)', required: false },
  { name: 'max_charge_current_a', label: 'Max battery charge current (A)', required: false },
]

const INVERTER_KINDS: InverterKind[] = ['hybrid', 'inverter-only', 'charge-controller']

/** Reads the named numeric fields; blank is null, anything else must parse. */
function readNumbers(fields: FieldSpec[], get: (name: string) => string | null) {
  const values: Record<string, number | null> = {}
  const errors: string[] = []
  for (const f of fields) {
    const raw = (get(f.name) ?? '').trim().replace(',', '.')
    if (raw === '') {
      values[f.name] = null
      if (f.required) errors.push(`${f.label} is required.`)
      continue
    }
    const n = Number(raw)
    if (!Number.isFinite(n)) {
      errors.push(`${f.label}: "${raw}" is not a number.`)
      values[f.name] = null
    } else if (f.integer && !Number.isInteger(n)) {
      errors.push(`${f.label} must be a whole number.`)
      values[f.name] = null
    } else if (f.negative && !(n < 0)) {
      errors.push(`${f.label} must be negative — a panel loses voltage and power as it heats up.`)
      values[f.name] = null
    } else {
      values[f.name] = n
    }
  }
  return { values, errors }
}

/** The datasheet link is the citation. Without it "verified" means nothing. */
function readDatasheetUrl(get: (name: string) => string | null, errors: string[]): string | null {
  const url = (get('datasheet_url') ?? '').trim()
  if (!/^https?:\/\/\S+$/.test(url)) {
    errors.push('The datasheet URL you read the figures from is required.')
    return null
  }
  return url
}

export type PanelVerification = Record<string, number | string | boolean | null> & { datasheet_url: string }

export function parsePanelVerification(
  get: (name: string) => string | null,
  model: { brand: string; model: string },
): VerifyResult<PanelVerification> {
  const { values, errors } = readNumbers(PANEL_FIELDS, get)
  const datasheet_url = readDatasheetUrl(get, errors)
  if (errors.length > 0 || !datasheet_url) return { ok: false, errors, flags: [] }

  const spec: PanelSpec = {
    wattsStc: values.watts_stc!,
    vocStc: values.voc_stc!,
    vmpStc: values.vmp_stc!,
    iscStc: values.isc_stc!,
    impStc: values.imp_stc!,
    betaVoc: values.beta_voc_pct!,
    betaVmp: values.beta_vmp_pct ?? undefined,
    betaPmax: values.beta_pmax_pct ?? undefined,
    maxSeriesFuseA: values.max_series_fuse_a ?? undefined,
  }
  const flags = reviewPanelSpec({ ...spec, brand: model.brand, model: model.model, sourceUrl: datasheet_url })
  const failures = flags.filter(f => f.severity === 'fail')
  if (failures.length > 0) {
    return { ok: false, errors: failures.map(f => f.message), flags }
  }
  return { ok: true, flags, spec: { ...values, datasheet_url } }
}

export type InverterVerification = Record<string, number | string | null> & { datasheet_url: string; kind: InverterKind }

export function parseInverterVerification(
  get: (name: string) => string | null,
  model: { brand: string; model: string },
): VerifyResult<InverterVerification> {
  const { values, errors } = readNumbers(INVERTER_FIELDS, get)
  const kind = get('kind') as InverterKind | null
  if (!kind || !INVERTER_KINDS.includes(kind)) errors.push('Choose what kind of unit this is.')
  const datasheet_url = readDatasheetUrl(get, errors)
  if (errors.length > 0 || !datasheet_url || !kind) return { ok: false, errors, flags: [] }

  const spec: InverterSpec = {
    id: 'verify',
    brand: model.brand,
    model: model.model,
    kind,
    acContinuousW: values.ac_continuous_w!,
    acSurgeW: values.ac_surge_w ?? undefined,
    acSurgeSeconds: values.ac_surge_seconds ?? undefined,
    dcSystemVoltage: values.dc_system_voltage!,
    pvMaxInputV: values.pv_max_input_v!,
    mpptMinV: values.mppt_min_v!,
    mpptMaxV: values.mppt_max_v!,
    mpptStartV: values.mppt_start_v ?? undefined,
    mpptCount: values.mppt_count!,
    pvMaxPowerW: values.pv_max_power_w!,
    pvMaxCurrentA: values.pv_max_current_a!,
    pvMaxIscA: values.pv_max_isc_a ?? undefined,
    maxChargeCurrentA: values.max_charge_current_a ?? undefined,
    sourceUrl: datasheet_url,
  }
  const flags = reviewInverterSpec(spec)
  const failures = flags.filter(f => f.severity === 'fail')
  if (failures.length > 0) {
    return { ok: false, errors: failures.map(f => f.message), flags }
  }
  return { ok: true, flags, spec: { ...values, kind, datasheet_url } }
}

// ---------------------------------------------------------------------------
// CEC comparison
// ---------------------------------------------------------------------------

/**
 * Where a verified datasheet figure and the CEC list disagree by more than a
 * rounding step. Shown on the model page, not used to block: the datasheet is
 * the authority (see the SG550WM beta-Voc note in cec-pv.ts), but a large gap
 * is worth a second look at which row of the sheet was read.
 */
export function cecDisagreements(
  entered: Partial<Record<'voc_stc' | 'isc_stc' | 'vmp_stc' | 'imp_stc' | 'beta_voc_pct', number | null>>,
  cec: { voc_v: number | null; isc_a: number | null; vmp_v: number | null; imp_a: number | null; beta_voc_pct: number | null },
): string[] {
  const pairs: [string, number | null | undefined, number | null, number][] = [
    ['Voc', entered.voc_stc, cec.voc_v, 0.02],
    ['Isc', entered.isc_stc, cec.isc_a, 0.02],
    ['Vmp', entered.vmp_stc, cec.vmp_v, 0.02],
    ['Imp', entered.imp_stc, cec.imp_a, 0.02],
    ['Voc temp. coefficient', entered.beta_voc_pct, cec.beta_voc_pct, 0.1],
  ]
  const out: string[] = []
  for (const [label, a, b, tolerance] of pairs) {
    if (a == null || b == null || b === 0) continue
    if (Math.abs(a - b) / Math.abs(b) > tolerance) out.push(`${label}: datasheet ${a}, CEC ${b}`)
  }
  return out
}
