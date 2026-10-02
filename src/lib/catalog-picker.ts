// What the calculators offer from the component catalogue.
//
// Session 3 of the catalogue work: the inverter and strings steps used to
// offer INVERTER_PRESETS and PANEL_PRESETS, hand-written arrays. They now
// offer every PUBLISHED catalogue model — which the database only allows once
// an admin has verified its specs against the manufacturer's datasheet (the
// same admission gate the arrays had, enforced by a trigger instead of a code
// comment). The arrays stay: commissioning.ts, the guides and the tests read
// them, and they are the fallback if the catalogue cannot be reached.
//
// THE LEGAL LINE THE PICKERS KEEP. CLAUDE.md's capacity / protection split:
// how many panels a string may hold is PROTECTION, and on this site a
// protection output appears only with its derivation — which /calculators/
// strings shows after a panel is picked. So the panel picker ranks on price
// and capacity facts only, and never labels a panel as "fits your inverter".
// An inverter covering the house's continuous and surge watts is CAPACITY, and
// the inverter picker does say so.
//
// Pure: rows in, options out. The pages fetch; this decides.

import type { PanelSpec } from './pv-string'
import { PANEL_PRESETS } from './pv-string'
import type { InverterSpec, PeakDemand } from './inverter-sizing'
import { INVERTER_PRESETS, inverterFit } from './inverter-sizing'
import { buyLink, type BuyLink } from './affiliate'
import { priceDisplay } from './battery-price'

export type CatalogListingRow = {
  retailer: string
  url: string
  pack_qty: number
  min_order_qty: number
  price_usd: number | null
  price_scraped_at: string | null
}

type ModelRowBase = {
  id: number
  brand: string
  model: string
  mpn: string | null
  spec_sheet_url: string | null
  image_url: string | null
  component_listings: CatalogListingRow[]
}

export type CatalogPanelRow = ModelRowBase & {
  panel_specs: {
    watts_stc: number; voc_stc: number; vmp_stc: number; isc_stc: number; imp_stc: number
    beta_voc_pct: number; beta_pmax_pct: number | null; beta_vmp_pct: number | null
    max_series_fuse_a: number | null
    length_mm: number | null; width_mm: number | null; weight_kg: number | null
    bifacial: boolean | null
  } | null
}

export type CatalogInverterRow = ModelRowBase & {
  inverter_specs: {
    kind: InverterSpec['kind']
    ac_continuous_w: number; ac_surge_w: number | null; ac_surge_seconds: number | null
    dc_system_voltage: number; pv_max_input_v: number; mppt_min_v: number; mppt_max_v: number
    mppt_start_v: number | null; mppt_count: number; pv_max_power_w: number
    pv_max_current_a: number; pv_max_isc_a: number | null; max_charge_current_a: number | null
  } | null
}

/** Columns the pickers select — kept here so the fetch and the types agree. */
export const LISTING_COLUMNS = 'retailer, url, pack_qty, min_order_qty, price_usd, price_scraped_at'
export const PANEL_PICKER_SELECT =
  `id, brand, model, mpn, spec_sheet_url, image_url, component_listings (${LISTING_COLUMNS}), ` +
  'panel_specs (watts_stc, voc_stc, vmp_stc, isc_stc, imp_stc, beta_voc_pct, beta_pmax_pct, beta_vmp_pct, ' +
  'max_series_fuse_a, length_mm, width_mm, weight_kg, bifacial)'
export const INVERTER_PICKER_SELECT =
  `id, brand, model, mpn, spec_sheet_url, image_url, component_listings (${LISTING_COLUMNS}), ` +
  'inverter_specs (kind, ac_continuous_w, ac_surge_w, ac_surge_seconds, dc_system_voltage, pv_max_input_v, ' +
  'mppt_min_v, mppt_max_v, mppt_start_v, mppt_count, pv_max_power_w, pv_max_current_a, pv_max_isc_a, ' +
  'max_charge_current_a)'

/** The cheapest current listing, per unit, with the link the reader clicks. */
export type Offer = {
  unitPrice: number
  asOf: Date | null
  packQty: number
  minOrderQty: number
  link: BuyLink
}

/**
 * The best offer across a model's listings, or null. A price past the 45-day
 * expiry (battery-price.ts) does not compete — a dead price must not be the
 * one a reader is sent to — and a listing whose shop we cannot link is
 * skipped, because an offer without a link is not an offer.
 */
export function bestOffer(
  listings: CatalogListingRow[],
  specSheetUrl: string | null,
  now = new Date(),
  { preferSingle = false }: { preferSingle?: boolean } = {},
): Offer | null {
  // An inverter is bought one at a time; a "parallel pair" listing is a
  // different system (two units, wired together), so its per-unit price must
  // not stand in for the single's. Sun Gold Power lists the SPH8048P at $1,450
  // alone and $2,890 as a pair — $1,445 each — and the pair was winning.
  // Panels are the opposite: buying them in packs IS the normal purchase.
  // If no single has a current, linkable price, a pack is still better than
  // no offer at all.
  if (preferSingle) {
    const single = bestOffer(listings.filter(l => l.pack_qty === 1), specSheetUrl, now)
    if (single) return single
  }
  let best: Offer | null = null
  for (const l of listings) {
    if (l.price_usd === null || l.pack_qty < 1) continue
    const shown = priceDisplay(l.price_usd, l.price_scraped_at, now)
    if (shown.kind === 'stale' || shown.kind === 'none') continue
    const link = buyLink({ retailer_url: l.url, source_url: specSheetUrl ?? l.url })
    if (!link) continue
    const unitPrice = l.price_usd / l.pack_qty
    if (!best || unitPrice < best.unitPrice) {
      best = {
        unitPrice,
        asOf: shown.kind === 'dated' ? shown.asOf : null,
        packQty: l.pack_qty,
        minOrderQty: l.min_order_qty,
        link,
      }
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Presets <-> catalogue
// ---------------------------------------------------------------------------

/**
 * The preset a catalogue model IS, when there is one.
 *
 * commissioning.ts keys its menu map on a preset id (the SPH setting numbers
 * are model-specific), so a unit picked from the catalogue must still carry
 * that id or the commissioning step goes quiet. The catalogue names models
 * more fully than the presets ("SPH8048P 8kW Split-Phase Hybrid Inverter"
 * against "SPH8048P"), so the preset's model must appear as a whole word in
 * the catalogue's model or part number, under the same brand.
 */
export function presetIdFor(
  row: { brand: string; model: string; mpn: string | null },
  presets: { id: string; brand: string; model: string }[],
): string | undefined {
  const hay = `${row.model} ${row.mpn ?? ''}`.toUpperCase()
  return presets.find(p =>
    p.brand === row.brand &&
    new RegExp(`(^|[^A-Z0-9])${p.model.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Z0-9]|$)`).test(hay),
  )?.id
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export type InverterOption = {
  /** presetId when it has one, else "catalog-<id>". Goes into the summary. */
  id: string
  spec: InverterSpec
  offer: Offer | null
  /**
   * yes      continuous with the 25% headroom, and surge, both covered
   * tight    covered, but continuous without the headroom
   * no       continuous or surge falls short
   * unknown  no loads entered yet, or the datasheet states no surge figure
   */
  covers: 'yes' | 'tight' | 'no' | 'unknown'
}

export type PanelOption = {
  id: string
  brand: string
  model: string
  spec: PanelSpec
  sourceUrl: string
  offer: Offer | null
  dollarsPerWatt: number | null
  lengthMm: number | null
  widthMm: number | null
  weightKg: number | null
  bifacial: boolean | null
}

export function inverterOptions(rows: CatalogInverterRow[], demand: PeakDemand | null, now = new Date()): InverterOption[] {
  const options: InverterOption[] = []
  for (const r of rows) {
    const s = r.inverter_specs
    // Published implies verified implies complete (the CHECK on
    // inverter_specs), but a row missing specs is skipped, never guessed at.
    if (!s || !r.spec_sheet_url) continue
    const id = presetIdFor(r, INVERTER_PRESETS) ?? `catalog-${r.id}`
    const spec: InverterSpec = {
      id,
      brand: r.brand,
      model: r.model,
      kind: s.kind,
      acContinuousW: s.ac_continuous_w,
      acSurgeW: s.ac_surge_w ?? undefined,
      acSurgeSeconds: s.ac_surge_seconds ?? undefined,
      dcSystemVoltage: s.dc_system_voltage,
      pvMaxInputV: s.pv_max_input_v,
      mpptMinV: s.mppt_min_v,
      mpptMaxV: s.mppt_max_v,
      mpptStartV: s.mppt_start_v ?? undefined,
      mpptCount: s.mppt_count,
      pvMaxPowerW: s.pv_max_power_w,
      pvMaxCurrentA: s.pv_max_current_a,
      pvMaxIscA: s.pv_max_isc_a ?? undefined,
      maxChargeCurrentA: s.max_charge_current_a ?? undefined,
      sourceUrl: r.spec_sheet_url,
    }
    let covers: InverterOption['covers'] = 'unknown'
    if (demand && demand.continuousW > 0) {
      const fit = inverterFit(spec, demand)
      covers = fit.continuous === 'short' || fit.surge === 'short' ? 'no'
        : fit.surge === 'unknown' ? 'unknown'
          : fit.continuous === 'tight' ? 'tight' : 'yes'
    }
    options.push({ id, spec, offer: bestOffer(r.component_listings, r.spec_sheet_url, now, { preferSingle: true }), covers })
  }
  // Units that cover the house first, then the smallest that does — the
  // cheapest adequate box, not the biggest one — then by price.
  const rank = { yes: 0, tight: 1, unknown: 2, no: 3 }
  return options.sort((a, b) =>
    rank[a.covers] - rank[b.covers] ||
    a.spec.acContinuousW - b.spec.acContinuousW ||
    (a.offer?.unitPrice ?? Infinity) - (b.offer?.unitPrice ?? Infinity))
}

export function panelOptions(rows: CatalogPanelRow[], now = new Date()): PanelOption[] {
  const options: PanelOption[] = []
  for (const r of rows) {
    const s = r.panel_specs
    if (!s || !r.spec_sheet_url) continue
    const offer = bestOffer(r.component_listings, r.spec_sheet_url, now)
    options.push({
      id: presetIdFor(r, PANEL_PRESETS) ?? `catalog-${r.id}`,
      brand: r.brand,
      model: r.model,
      spec: {
        wattsStc: s.watts_stc,
        vocStc: s.voc_stc,
        vmpStc: s.vmp_stc,
        iscStc: s.isc_stc,
        impStc: s.imp_stc,
        betaVoc: s.beta_voc_pct,
        betaPmax: s.beta_pmax_pct ?? undefined,
        betaVmp: s.beta_vmp_pct ?? undefined,
        maxSeriesFuseA: s.max_series_fuse_a ?? undefined,
      },
      sourceUrl: r.spec_sheet_url,
      offer,
      dollarsPerWatt: offer ? offer.unitPrice / s.watts_stc : null,
      lengthMm: s.length_mm,
      widthMm: s.width_mm,
      weightKg: s.weight_kg,
      bifacial: s.bifacial,
    })
  }
  // Priced panels by $/W, then unpriced by wattage. Price per watt is the
  // number a panel is actually shopped on; the guide on choosing panels says
  // why it is not the whole story, and the size and weight sit beside it.
  return options.sort((a, b) =>
    (a.dollarsPerWatt ?? Infinity) - (b.dollarsPerWatt ?? Infinity) ||
    b.spec.wattsStc - a.spec.wattsStc)
}
