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
  variants: { id: number; title: string; sku: string | null; price: number; available?: boolean }[]
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
  /**
   * Set only when one product page sells more than one battery, and then it is
   * the Shopify variant id that makes each row's source_url unique
   * (`…?variant=43342854193289`). Null everywhere else, deliberately: adding a
   * variant id to a URL that already identifies one battery would change the
   * source_url of every existing row, and a changed source_url forks a row
   * rather than updating it.
   */
  variant_id: number | null
  /** True when this came from a page that sells several batteries. Used to break SKU ties. */
  from_multi_capacity_page: boolean
}

export type ListingResult =
  | { ok: true; listings: ParsedListing[] }
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

const KWH_IN_TITLE = /(\d+(?:\.\d+)?)\s*kWh\b/i

/**
 * The real pack voltage behind a round nominal name.
 *
 * "48V" is what a 16S LiFePO4 pack is called; 51.2V is what it is. The
 * difference is 6.7%, which is exactly the error in row #20 — stored as
 * 48V/100Ah/4.8kWh while its own title says 5.12kWh.
 */
const LFP_PACK_VOLTAGE: Record<number, number> = { 12: 12.8, 24: 25.6, 48: 51.2 }

/**
 * Capacity from a title that states kWh and no Ah — the 5.12kWh wall-mount.
 *
 * Only for LFP packs, and only when the arithmetic lands on a whole number of
 * amp-hours, which is what keeps this from being a guess: 5120Wh ÷ 51.2V is
 * exactly 100Ah, while ÷ the marketing 48V is 106.67Ah and gets refused. A
 * battery whose energy and voltage do not produce a round capacity is one this
 * rule does not understand, and it says so rather than rounding.
 */
export function capacityFromEnergy(title: string, nominalVoltage: number): { voltage: number; capacity_ah: number } | null {
  const kwh = title.match(KWH_IN_TITLE)
  if (!kwh) return null
  const voltage = LFP_PACK_VOLTAGE[nominalVoltage] ?? nominalVoltage
  const ah = (parseFloat(kwh[1]) * 1000) / voltage
  if (Math.abs(ah - Math.round(ah)) > 0.02) return null
  return { voltage, capacity_ah: Math.round(ah) }
}

/** "12V 100Ah/ 200Ah LiFePo4 Deep Cycle …" → "12V 200Ah LiFePo4 Deep Cycle …" */
function modelForCapacity(title: string, capacity: number): string {
  return title.replace(/\d+(?:\.\d+)?\s*Ah\s*\/\s*\d+(?:\.\d+)?\s*Ah/i, `${capacity}Ah`)
}

export function parseSungoldProduct(product: ShopifyProduct): ListingResult {
  // Trimmed but not tidied. Several titles carry double spaces ("LiFePO4
  // Lithium  Battery") and the published rows carry them too, so collapsing
  // the whitespace here would open a proposal on every one of them whose only
  // content is a space — churn in the queue, for nothing a reader would notice.
  const title = product.title.trim()

  const voltageMatch = title.match(VOLTAGE_IN_TITLE)
  const voltageTag = product.tags.find(t => VOLTAGE_TAG.test(t))
  const nominal = voltageMatch
    ? parseFloat(voltageMatch[1])
    : voltageTag
      ? parseFloat(voltageTag)
      : null
  if (nominal === null) return { ok: false, reason: 'no voltage in the title or the tags' }

  const chemistry = chemistryFor(title, nominal)
  if (chemistry === null) {
    return { ok: false, reason: `the page states no chemistry, and ${nominal}V alone does not imply one` }
  }

  const base = {
    brand: 'SunGoldPower',
    chemistry,
    dod_rated: null,
    image_url: product.featured_image,
  } as const

  const capacities = capacitiesInTitle(title)

  // ONE PAGE, SEVERAL BATTERIES. "12V 100Ah/ 200Ah" sells LFP12-100A at $295
  // and LFP12-200A at $589 under one URL. Taking the first of each built row
  // #21: the 100Ah capacity and price with the 200Ah SKU bolted on. Each
  // capacity gets its own row and its own ?variant= URL instead — Shopify
  // serves those and they are the only stable per-battery URL the site has.
  if (capacities.length > 1) {
    const listings: ParsedListing[] = []
    for (const capacity of capacities) {
      const forCapacity = product.variants.filter(v =>
        new RegExp(`\\b${capacity}\\s*ah\\b`, 'i').test(v.title))
      const variant = pickUnitVariant(forCapacity)
      if (!variant) continue
      listings.push({
        ...base,
        model: modelForCapacity(title, capacity),
        sku: variant.sku ?? null,
        voltage: nominal,
        capacity_ah: capacity,
        capacity_kwh: Math.round((nominal * capacity / 1000) * 100) / 100,
        price_usd: Math.round(variant.price) / 100,
        variant_id: variant.id,
        from_multi_capacity_page: true,
      })
    }
    return listings.length > 0
      ? { ok: true, listings }
      : { ok: false, reason: `covers ${capacities.join('Ah and ')}Ah but no single new unit for either` }
  }

  const capacityTag = product.tags.find(t => CAPACITY_TAG.test(t))
  const stated = capacities[0] ?? (capacityTag ? parseFloat(capacityTag) : null)
  // Nothing states Ah: the 5.12kWh wall-mount. Its energy and an LFP pack
  // voltage give a whole number of amp-hours or nothing at all.
  const derived = stated === null ? capacityFromEnergy(title, nominal) : null
  const voltage = derived?.voltage ?? nominal
  const capacity_ah = stated ?? derived?.capacity_ah ?? null
  if (capacity_ah === null) {
    return { ok: false, reason: 'no Ah in the title or the tags, and no kWh figure that divides into whole amp-hours' }
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
    listings: [{
      ...base,
      model: title.replace(/^SunGoldPower\s*/i, '').trim(),
      sku: variant.sku ?? null,
      voltage,
      capacity_ah,
      capacity_kwh: Math.round((voltage * capacity_ah / 1000) * 100) / 100,
      price_usd: Math.round(variant.price) / 100,
      variant_id: null,
      from_multi_capacity_page: false,
    }],
  }
}

/** A parsed battery paired with the URL it would be stored under. */
export type ListingWithUrl = { listing: ParsedListing; source_url: string }

/**
 * One battery per SKU per run.
 *
 * SunGoldPower sells the 12V 100Ah on its own page AND as a variant of the
 * "12V 100Ah/ 200Ah" page, so a run that reads both offers LFP12-100A twice.
 * The dedicated page wins: its URL is stable, its title describes one battery,
 * and the published row already points at it. Without this, every weekly run
 * would hand the review queue a second copy of a battery the catalogue already
 * has — the exact noise the review gate exists to keep out of it.
 */
export function oneRowPerSku(rows: ListingWithUrl[]): {
  kept: ListingWithUrl[]
  dropped: { row: ListingWithUrl; inFavourOf: string }[]
} {
  const bySku = new Map<string, ListingWithUrl>()
  const kept: ListingWithUrl[] = []
  const dropped: { row: ListingWithUrl; inFavourOf: string }[] = []

  // Dedicated pages first, so they are the ones that win a tie.
  const ordered = [...rows].sort((a, b) =>
    Number(a.listing.from_multi_capacity_page) - Number(b.listing.from_multi_capacity_page))

  for (const row of ordered) {
    const key = row.listing.sku?.trim().toLowerCase()
    if (!key) { kept.push(row); continue }
    const seen = bySku.get(key)
    if (seen) { dropped.push({ row, inFavourOf: seen.source_url }); continue }
    bySku.set(key, row)
    kept.push(row)
  }
  return { kept, dropped }
}
