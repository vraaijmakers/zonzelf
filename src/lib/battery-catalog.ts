// How a scraped battery becomes a component-catalogue item.
//
// The five battery scrapers (EG4, Victron, Sun Gold Power, A1 SolarStore,
// Signature Solar) keep their own parsing — each needed real investigative
// work and carries hand-verified mappings — and hand their ParsedBattery to
// scripts/lib/scrape-common.ts, which used to write battery_models. They now
// write the catalogue, through this mapping. Pure, so CI tests it.
//
// THREE KINDS OF SOURCE, and the mapping keeps them apart:
//   - a manufacturer page that sells nothing (EG4, Victron): specs and a
//     citation, NO listing — there is nothing to buy there;
//   - a manufacturer that is also the shop (Sun Gold Power): specs, citation
//     and a listing on the same URL;
//   - a reseller price on a manufacturer's battery (Signature Solar for EG4,
//     A1 SolarStore for Discover): a listing on the reseller.
//
// LISTING IDENTITY IS THE SKU. The roadmap item "Battery scraper: key row
// identity on SKU, not source_url" exists because a vendor moving a page forked
// a row; the catalogue keys listings on (retailer, retailer_product_id), and
// for these hand-mapped batteries the SKU is the stable id. The URL is the
// fallback only for the Victron rows, which have no SKU and no shop anyway.

import { shopFor } from './affiliate'

export type ParsedBatteryLike = {
  brand: string
  model: string
  sku: string | null
  chemistry: 'lifepo4' | 'agm' | 'gel' | 'flooded'
  voltage: number
  capacity_ah: number
  capacity_kwh: number
  dod_rated: number | null
  price_usd: number | null
  source_url: string
  retailer?: string
  retailer_url?: string
  image_url?: string | null
}

export type CatalogBatteryItem = {
  category: 'battery'
  brand: string
  model: string
  mpn: string | null
  spec_sheet_url: string
  image_url: string | null
  retailer: string | null
  retailer_product_id: string
  url: string
  title: string
  retailer_category: null
  pack_qty: 1
  min_order_qty: 1
  price_usd: number | null
  price_scraped_at?: string | null
  battery: {
    chemistry: ParsedBatteryLike['chemistry']
    voltage: number
    capacity_ah: number
    capacity_kwh: number
    dod_rated: number | null
  }
}

/**
 * One spelling per brand across the whole catalogue. The battery scrapers
 * wrote "SunGoldPower"; the panel and inverter rows say "Sun Gold Power", and
 * in one catalogue a split brand splits every search and filter.
 */
const BRAND_NAMES: Record<string, string> = { SunGoldPower: 'Sun Gold Power' }

/** The shop this battery is sold through, if any: the reseller first, else the source if it is itself a shop. */
export function batteryShop(b: ParsedBatteryLike): { retailer: string; url: string } | null {
  if (b.retailer_url) {
    const shop = shopFor(b.retailer_url)
    return { retailer: b.retailer ?? shop?.name ?? new URL(b.retailer_url).hostname, url: b.retailer_url }
  }
  const shop = shopFor(b.source_url)
  return shop ? { retailer: shop.name, url: b.source_url } : null
}

export function toCatalogBattery(b: ParsedBatteryLike): CatalogBatteryItem {
  const shop = batteryShop(b)
  const brand = BRAND_NAMES[b.brand] ?? b.brand
  return {
    category: 'battery',
    brand,
    model: b.model,
    mpn: b.sku,
    spec_sheet_url: b.source_url,
    image_url: b.image_url ?? null,
    retailer: shop?.retailer ?? null,
    retailer_product_id: b.sku ?? shop?.url ?? b.source_url,
    url: shop?.url ?? b.source_url,
    title: `${brand} ${b.model}`,
    retailer_category: null,
    pack_qty: 1,
    min_order_qty: 1,
    // A manufacturer page states no price; never invent one for a listing.
    price_usd: shop ? b.price_usd : null,
    battery: {
      chemistry: b.chemistry,
      voltage: b.voltage,
      capacity_ah: b.capacity_ah,
      capacity_kwh: b.capacity_kwh,
      dod_rated: b.dod_rated,
    },
  }
}

// ---------------------------------------------------------------------------
// The calculator's view
// ---------------------------------------------------------------------------

/** Columns /calculators/battery reads — `!inner` so the chemistry filter applies. */
export const BATTERY_SHELF_SELECT =
  'id, brand, model, spec_sheet_url, ' +
  'battery_specs!inner (chemistry, voltage, capacity_ah, capacity_kwh), ' +
  'component_listings (retailer, url, pack_qty, price_usd, price_scraped_at)'

export type BatteryShelfRow = {
  id: number
  brand: string
  model: string
  spec_sheet_url: string | null
  battery_specs: { chemistry: string; voltage: number; capacity_ah: number; capacity_kwh: number }
  component_listings: { retailer: string; url: string; pack_qty: number; price_usd: number | null; price_scraped_at: string | null }[]
}

/** The flat row the battery shelf was written against when it read battery_models. */
export type BatteryShelfItem = {
  id: number
  brand: string
  model: string
  voltage: number
  capacity_ah: number
  capacity_kwh: number
  price_usd: number | null
  price_scraped_at: string | null
  source_url: string
  retailer_url: string | null
}

const MAX_AGE_MS = 45 * 86_400_000 // PRICE_MAX_AGE_DAYS in battery-price.ts

/**
 * One catalogue battery as the shelf's flat row. The price is the cheapest
 * CURRENT single-unit listing; if every price has expired, the most recently
 * dated one is kept so the card can still say "Price out of date" rather than
 * implying there never was a price. Multi-packs never set a single's price.
 */
export function toShelfItem(row: BatteryShelfRow, now = new Date()): BatteryShelfItem {
  const priced = row.component_listings.filter(l => l.price_usd !== null && l.pack_qty === 1)
  const current = priced.filter(l => !l.price_scraped_at || now.getTime() - Date.parse(l.price_scraped_at) <= MAX_AGE_MS)
  const pick = current.length > 0
    ? current.reduce((a, b) => (b.price_usd! < a.price_usd! ? b : a))
    : priced.sort((a, b) => Date.parse(b.price_scraped_at ?? '0') - Date.parse(a.price_scraped_at ?? '0'))[0]
  const s = row.battery_specs
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    voltage: s.voltage,
    capacity_ah: s.capacity_ah,
    capacity_kwh: s.capacity_kwh,
    price_usd: pick?.price_usd ?? null,
    price_scraped_at: pick?.price_scraped_at ?? null,
    source_url: row.spec_sheet_url ?? pick?.url ?? '',
    retailer_url: pick?.url ?? null,
  }
}
