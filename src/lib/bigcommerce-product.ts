// Reads a BigCommerce product page — Signature Solar's storefront — into the
// fields the component catalogue stores. Pure, so it is testable in CI.
//
// WHERE THE DATA IS. The theme assigns the whole product to
// `window.BigCommerce.product = {...}` as plain JSON, category path included.
// That object is the one to read. The page carries at least six more
// `"custom_fields"` arrays further down — related products and pallet
// variants, each with its own wattage and part number — so grepping the HTML
// for the first custom field would work until the day a related product
// rendered first.
//
// WHAT IT DOES NOT HAVE. No Voc, Isc or temperature coefficients for panels,
// and no specs at all for inverters beyond links to the spec sheet and manual.
// That is the finding recorded on the roadmap in August — shop pages omit
// exactly the protection-critical fields — and the reason this module returns
// identity, price and physical fields only. Electricals come from the CEC list
// or the datasheet (see src/lib/cec-pv.ts).

export type BigCommerceProduct = {
  id: number
  title: string
  brand: string | null
  sku: string | null
  mpn: string | null
  url: string
  price_usd: number | null
  categories: string[]
  min_purchase_quantity: number
  image_url: string | null
  /** Custom fields with their HTML stripped, by name. */
  fields: Record<string, string>
  /** The href behind a "Spec Sheet" field, which holds a button, not text. */
  spec_sheet_url: string | null
}

/**
 * Pulls one JSON object literal out of a script, starting at `marker`.
 * Walks braces with string awareness rather than regex-matching to a `}` —
 * product descriptions are HTML full of braces and quotes.
 */
export function extractJsonObject(html: string, marker: string): unknown | null {
  const at = html.indexOf(marker)
  if (at < 0) return null
  const start = html.indexOf('{', at)
  if (start < 0) return null
  let depth = 0
  let inString = false
  for (let i = start; i < html.length; i++) {
    const c = html[i]
    if (inString) {
      if (c === '\\') i++
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1))
      } catch {
        return null
      }
    }
  }
  return null
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

function hrefIn(s: string, base: string): string | null {
  const m = s.match(/href=["']([^"']+)["']/)
  if (!m) return null
  try {
    return new URL(m[1], base).toString()
  } catch {
    return null
  }
}

type RawProduct = {
  id?: number
  title?: string
  brand?: { name?: string } | string | null
  sku?: string | null
  mpn?: string | null
  url?: string
  price?: { without_tax?: { value?: number } }
  category?: string[]
  min_purchase_quantity?: number
  main_image?: { data?: string } | null
  custom_fields?: { name?: string; value?: string }[]
}

export function parseBigCommerceProduct(html: string, pageUrl: string): BigCommerceProduct | null {
  const raw = extractJsonObject(html, 'window.BigCommerce.product =') as RawProduct | null
  if (!raw || typeof raw.id !== 'number' || !raw.title) return null

  const fields: Record<string, string> = {}
  let spec_sheet_url: string | null = null
  for (const f of raw.custom_fields ?? []) {
    if (!f.name || f.value === undefined) continue
    // "opt#Battery Options~order:1$qty=1" — upsell wiring, not a product field.
    if (f.name.startsWith('opt#')) continue
    if (/^spec ?sheet$/i.test(f.name)) spec_sheet_url = hrefIn(f.value, pageUrl)
    fields[f.name.trim()] = stripHtml(f.value)
  }

  const brand = typeof raw.brand === 'string' ? raw.brand : raw.brand?.name ?? null
  const price = raw.price?.without_tax?.value
  const image = raw.main_image?.data
  return {
    id: raw.id,
    title: raw.title.trim(),
    brand: brand?.trim() || null,
    sku: raw.sku?.trim() || null,
    mpn: raw.mpn?.trim() || fields['Manufacture Part#']?.trim() || null,
    url: raw.url || pageUrl,
    price_usd: typeof price === 'number' && price > 0 ? price : null,
    categories: raw.category ?? [],
    min_purchase_quantity: Math.max(1, raw.min_purchase_quantity ?? 1),
    // BigCommerce images carry a {:size} template in the path.
    image_url: image ? image.replace('{:size}', '1280x1280') : null,
    fields,
    spec_sheet_url,
  }
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export type CatalogCategory = 'panel' | 'inverter'

/**
 * Which catalogue category a product belongs to, or null to skip it.
 *
 * Decided on the retailer's category PATH, not the title: a title says
 * "Inverter" on an inverter cable, a mounting kit says "Solar Panel", and
 * "18kPV Hybrid Inverter and 48V SimpliPhi Battery Bundle" is neither — it is
 * a kit, and a kit is a price for several products at once.
 */
export function classifyProduct(p: Pick<BigCommerceProduct, 'categories' | 'title'>): CatalogCategory | null {
  const cats = p.categories
  if (/\b(bundle|kit)\b/i.test(p.title)) return null
  if (cats.some(c => /^All Products\/Kits/i.test(c))) return null

  if (cats.some(c => /^All Products\/Solar Panels(\/|$)/.test(c) && !/Mounting|Cleaning/i.test(c))) return 'panel'
  if (cats.some(c => /^All Products\/Inverters\/(?!Inverter Accessories)/.test(c)) && isInverterUnit(p.title)) return 'inverter'
  return null
}

/**
 * The category path is not enough for inverters: Signature Solar files trunk
 * cables, end caps, gateways and unlocking tools under the MICROINVERTER
 * subcategories rather than "Inverter Accessories" — about thirty of them on
 * 2026-09-30. So the title must name a unit, and hardware words veto it.
 *
 * Three-phase units are skipped too: 30-100 kW commercial string inverters on
 * a 208/480 V service, not something a DIY split-phase home or cabin installs.
 */
const INVERTER_WORDS = /inverter|multiplus|quattro/i
const HARDWARE_WORDS = /\b(cable|cap|connector|adaptor|adapter|tool|gateway|transmitter|clip|dongle|meter|monitoring device|splice)s?\b/i
const THREE_PHASE = /three[\s-]phase|\b3[\s-]phase/i

export function isInverterUnit(title: string): boolean {
  return INVERTER_WORDS.test(title) && !HARDWARE_WORDS.test(title) && !THREE_PHASE.test(title)
}

// ---------------------------------------------------------------------------
// Panel fields
// ---------------------------------------------------------------------------

/** "420W" → 420. Refuses anything that is not a single wattage. */
export function parseWatts(s: string | undefined): number | null {
  if (!s) return null
  const m = s.trim().match(/^(\d{2,4}(?:\.\d+)?)\s*W$/i)
  return m ? Number(m[1]) : null
}

/**
 * "69.37 × 44.65 × 1.18 in" or "67.8in x 44.6in x 1.2in" → millimetres,
 * longest first. Null unless all three are present and the unit is inches or
 * millimetres, stated — a bare triple has no unit to trust.
 */
export function parseDimensionsMm(s: string | undefined): { length_mm: number; width_mm: number; thickness_mm: number } | null {
  if (!s) return null
  // No \b before the unit: "67.8in" has no word boundary between 8 and i.
  const unit = /mm\b/i.test(s) ? 'mm' : /(?:\d|\s)in\b|"|inch/i.test(s) ? 'in' : null
  if (!unit) return null
  const nums = [...s.matchAll(/(\d+(?:\.\d+)?)/g)].map(m => Number(m[1]))
  if (nums.length !== 3) return null
  const mm = nums.map(n => (unit === 'in' ? n * 25.4 : n)).sort((a, b) => b - a)
  const round = (n: number) => Math.round(n)
  return { length_mm: round(mm[0]), width_mm: round(mm[1]), thickness_mm: round(mm[2]) }
}

/** "36 Solar Panels" → 36. How many panels one pallet listing buys. */
export function parsePalletSize(s: string | undefined): number | null {
  if (!s) return null
  const m = s.match(/(\d+)\s*(?:solar\s*)?panels?/i)
  return m ? Number(m[1]) : null
}

/**
 * How many panels one purchase of this listing buys: the "Pallet Size" field,
 * else a count in the title. 1 for anything not a pallet; null for a pallet
 * whose size is not stated, because a pallet price with an unknown divisor is
 * a per-panel price nobody can compute.
 */
export function packQuantity(p: Pick<BigCommerceProduct, 'title' | 'fields'>): number | null {
  const fromField = parsePalletSize(p.fields['Pallet Size'])
  if (fromField) return fromField
  if (!/pallet/i.test(p.title)) return 1
  return parsePalletSize(p.title)
}

/**
 * The model's display name from a listing title: brand prefix and pallet
 * wording removed, so "Pallet of Seraphim 440W Bifacial Solar Panels (36
 * panels)" and "Seraphim 440W Bifacial Solar Panel" name the same thing.
 */
export function modelNameFromTitle(title: string, brand: string | null): string {
  let name = title
    .replace(/^pallet of\s+/i, '')
    // "(36 panels)", "- 36 panels", "| 31 Panels" and "Pallet | 36 Panel" all
    // occur on Signature Solar pallet titles.
    .replace(/\s*(?:\bpallet\s*)?[-–(|]\s*\d+\s*(?:solar\s*)?panels?\)?\s*$/i, '')
    .replace(/\bpallet of\s+/i, '')
  if (brand) {
    // The shop's brand is often longer than the title's ("Seraphim Solar" on a
    // "Seraphim 450W …" title), so its first word is tried too.
    for (const prefix of [brand, brand.split(/\s+/)[0]]) {
      const b = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const stripped = name.replace(new RegExp(`^${b}\\b\\s*(?:\\||-|–)?\\s*`, 'i'), '')
      if (stripped !== name) {
        name = stripped
        break
      }
    }
  }
  return name.replace(/\bPanels\b/, 'Panel').trim() || title
}

/** "10 Units" → 10. */
export function parseMinimumPurchase(s: string | undefined): number | null {
  if (!s) return null
  const m = s.match(/(\d+)/)
  return m ? Number(m[1]) : null
}
