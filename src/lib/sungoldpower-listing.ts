/**
 * Turning one SunGoldPower product into a battery_models row — or into a
 * precise reason why it cannot be one.
 *
 * WHY THIS EXISTS AS ITS OWN FILE. The old parser read a theme data blob out
 * of the page HTML and keyed everything off `"tags":[…],"price":N`. It parsed
 * 1 of 10 products from some point after 2026-08-21 until 2026-09-24, and the
 * weekly job stayed green the whole time (a partial parse is a warning, not a
 * failure — see scrape-health.ts), so six published rows quietly stopped being
 * re-priced and three new products were never picked up. Rules that decide
 * whether a row exists at all belong somewhere `npm test` can reach them, for
 * the same reason scrape-health.ts moved here: CI has no service-role key.
 *
 * WHAT CHANGED AT THE SOURCE. Two things, independently:
 *
 *   1. The tags stopped carrying capacity. They are merchandising buckets now
 *      — "Up to 5kWh", "5–10kWh", "bfcm", "sale20" — plus a voltage token and
 *      a SKU-ish one. Exactly one product still has a "100AH" tag, which is
 *      exactly the one product that still parsed. Titles carry the size
 *      instead, and consistently: "48V 100AH Server Rack …", "PowerMax
 *      16.07kWh 51.2V 314AH …".
 *
 *   2. Variants multiplied. A product now carries 1/2/4-unit variants and, on
 *      several, [Brand New] / [Open Box] / [Refurbished] — each its own SKU and
 *      price. The blob's `price` is the MINIMUM across all of them, so the row
 *      for the 12V 100Ah battery has been published at $199 since 2026-08-21:
 *      the refurbished price. The new battery is $295.
 *
 * WHAT IS DELIBERATELY NOT PARSED. The product descriptions. They contain
 * sentences like "capacity of 322.56kWh" and "capacity of 328kWh" on 5kWh and
 * 10kWh batteries — copy, not specification. Nothing here reads them.
 */

/** The shape this module needs from Shopify's /products/<handle>.js response. */
export type ShopifyProduct = {
  title: string
  tags: string[]
  featured_image: string | null
  variants: { title: string; sku: string | null; price: number; available?: boolean }[]
}

export type ParsedListing = {
  brand: 'SunGoldPower'
  model: string
  sku: string | null
  chemistry: 'lifepo4'
  voltage: number
  capacity_ah: number
  capacity_kwh: number
  dod_rated: null
  price_usd: number
  image_url: string | null
}

export type ListingResult =
  | { ok: true; listing: ParsedListing }
  | { ok: false; reason: string }

// A variant is one physical battery only if it says so. "2 units"/"4 Unit" are
// multi-packs of the same SKU — the price and the SKU both describe the bundle,
// which is the mistake battery-review.ts's bundle-listing check exists to catch
// after the fact. Better not to create the row.
const MULTI_UNIT = /\b([2-9]|\d{2,})\s*units?\b/i
// A condition tag is not a product. The refurbished price of a battery is not
// what a reader clicking through would pay for it, and publishing it as the
// price makes ZonZelf's cheapest $/kWh a used unit.
const NOT_NEW = /\b(refurb(ished)?|open\s*box|used|b-?stock)\b/i

/**
 * The single, new unit among a product's variants.
 *
 * "Default Title" is Shopify's name for "this product has no variants", so it
 * qualifies. Anything that names a condition or a multi-pack does not.
 */
export function pickUnitVariant(variants: ShopifyProduct['variants']) {
  return variants.find(v => !MULTI_UNIT.test(v.title) && !NOT_NEW.test(v.title)) ?? null
}

const VOLTAGE_IN_TITLE = /(\d+(?:\.\d+)?)\s*V\b/i
const CAPACITY_IN_TITLE = /(\d+(?:\.\d+)?)\s*Ah\b/gi
const VOLTAGE_TAG = /^(\d+(?:\.\d+)?)V$/i
const CAPACITY_TAG = /^(\d+(?:\.\d+)?)AH$/i

/**
 * Every distinct Ah figure the title names.
 *
 * More than one is not a parsing problem, it is a listing that covers two
 * batteries: "12V 100Ah/ 200Ah LiFePo4 Deep Cycle" sells LFP12-100A and
 * LFP12-200A at different prices under one URL. Picking either one is how
 * battery_models row #21 came to hold a 200Ah SKU with a 100Ah capacity and the
 * 100Ah price. One row per capacity needs one source_url per capacity, which is
 * the same identity problem as the roadmap's "key row identity on SKU" item.
 */
export function capacitiesInTitle(title: string): number[] {
  const found = [...title.matchAll(CAPACITY_IN_TITLE)].map(m => parseFloat(m[1]))
  return [...new Set(found)]
}

/**
 * Whether a 48V-family pack is LiFePO4, answered only when the source says so.
 *
 * SunGoldPower states the chemistry in most titles ("LiFePO4", "Lithium"). Where
 * it does not, the nominal voltage can still settle it: 12.8V, 25.6V and 51.2V
 * are 4, 8 and 16 LFP cells at 3.2V, and nothing else is named that way. The
 * round numbers cannot settle it — "48V" is equally the name for four 12V
 * lead-acid blocks in series — so a product whose title says neither is left
 * alone rather than assumed. That is what happens to the CoreX 5 Pro and Elite:
 * the pages state no chemistry anywhere, only "48V 100AH".
 */
export function chemistryFor(title: string, voltage: number): 'lifepo4' | null {
  if (/lifepo4|lifepo|lithium iron phosphate/i.test(title)) return 'lifepo4'
  if (/lithium/i.test(title)) return 'lifepo4'
  // 3.2V per cell, to one decimal place, and not a round pack name.
  const cells = voltage / 3.2
  const isCellMultiple = Math.abs(cells - Math.round(cells)) < 0.001
  const isRoundPackName = Number.isInteger(voltage)
  return isCellMultiple && !isRoundPackName ? 'lifepo4' : null
}

export function parseSungoldProduct(product: ShopifyProduct): ListingResult {
  // Trimmed but not tidied. Several titles carry double spaces ("LiFePO4
  // Lithium  Battery") and the published rows carry them too, so collapsing
  // the whitespace here would open a proposal on every one of them whose only
  // content is a space — churn in the queue, for nothing a reader would notice.
  const title = product.title.trim()

  const capacities = capacitiesInTitle(title)
  if (capacities.length > 1) {
    return {
      ok: false,
      reason: `one listing covering ${capacities.join('Ah and ')}Ah — needs a row per capacity, ` +
        'and both would share this URL (roadmap: key row identity on SKU)',
    }
  }

  const voltageMatch = title.match(VOLTAGE_IN_TITLE)
  const voltageTag = product.tags.find(t => VOLTAGE_TAG.test(t))
  const voltage = voltageMatch
    ? parseFloat(voltageMatch[1])
    : voltageTag
      ? parseFloat(voltageTag)
      : null
  if (voltage === null) return { ok: false, reason: 'no voltage in the title or the tags' }

  const capacityTag = product.tags.find(t => CAPACITY_TAG.test(t))
  const capacity_ah = capacities[0] ?? (capacityTag ? parseFloat(capacityTag) : null)
  if (capacity_ah === null) {
    // The 5.12kWh wall-mount is the live example: the title states kWh only,
    // and kWh ÷ 48V is 106.7Ah, not the 100Ah it actually is — the marketing
    // "48V" and the real 51.2V pack differ by exactly the error. Dividing would
    // invent a number that looks parsed.
    return { ok: false, reason: 'no Ah in the title or the tags (a kWh figure alone cannot give one)' }
  }

  const chemistry = chemistryFor(title, voltage)
  if (chemistry === null) {
    return { ok: false, reason: `the page states no chemistry, and ${voltage}V alone does not imply one` }
  }

  const variant = pickUnitVariant(product.variants)
  if (!variant) {
    return {
      ok: false,
      reason: `no single-unit, new variant (${product.variants.map(v => v.title).join(', ') || 'none'})`,
    }
  }

  return {
    ok: true,
    listing: {
      brand: 'SunGoldPower',
      model: title.replace(/^SunGoldPower\s*/i, '').trim(),
      sku: variant.sku ?? null,
      chemistry,
      voltage,
      capacity_ah,
      capacity_kwh: Math.round((voltage * capacity_ah / 1000) * 100) / 100,
      dod_rated: null,
      price_usd: Math.round(variant.price) / 100,
      image_url: product.featured_image,
    },
  }
}
