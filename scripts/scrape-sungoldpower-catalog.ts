// Sun Gold Power's own store, panels and inverters, into the component
// catalogue. Run with `npm run scrape:sungoldpower-catalog`; DRY_RUN=1 prints
// without writing.
//
// The second shop for the catalogue, and the reason for it: the SG550WM,
// SPH8048P and SPH10048P are verified and published but had no buy link,
// because Signature Solar does not sell them. Sun Gold Power is their
// manufacturer, sells them direct, and runs a 6% affiliate programme. The SKU
// rules (pack sizes, kits, refurbished units) are in src/lib/shopify-catalog.ts.
//
// NOT scrape-sungoldpower.ts, which scrapes this site's BATTERIES into
// battery_models. Same site, same courtesy: robots.txt (re-read 2026-10-01)
// allows collection pages and disallows only sort/filter variants of them,
// which this never requests; 10 s between requests, and only one request per
// collection, because Shopify's collection JSON carries every variant.

import { fetchHtml, sleep, getServiceRoleClient, tallyOutcomes, reportScrapeHealth, type ScrapeOutcome } from './lib/scrape-common'
import { writeListing, type ScrapedListing } from './lib/catalog-write'
import { modelName, shopifyListings, wattsFromMpn, type ShopifyProduct } from '../src/lib/shopify-catalog'

const SITE = 'https://sungoldpower.com'
// The name src/lib/affiliate.ts uses for this host, so a listing and its buy
// link are labelled the same.
const RETAILER = 'SunGoldPower'
const CRAWL_DELAY_MS = 10_000
const DRY_RUN = process.env.DRY_RUN === '1'

// Collections and what they hold. Overlapping on purpose (an inverter sits in
// several); products are de-duplicated by id. "power-inverter" (no charger, no
// solar input) and the kit collections are left out.
const COLLECTIONS: { handle: string; category: 'panel' | 'inverter' }[] = [
  { handle: 'solar-panel', category: 'panel' },
  { handle: 'bifacial-solar-panels', category: 'panel' },
  { handle: 'hybrid-solar-inverter', category: 'inverter' },
  { handle: 'off-grid-solar-inverter', category: 'inverter' },
  { handle: '120v-240v-split-phase-inverter-chargers', category: 'inverter' },
  { handle: '48v-inverter-charger', category: 'inverter' },
  { handle: '24v-inverter-charger', category: 'inverter' },
  { handle: '12v-inverter-charger', category: 'inverter' },
]

async function main() {
  console.log(`Reading ${COLLECTIONS.length} collections on ${SITE}${DRY_RUN ? ' — DRY RUN' : ''}`)
  const products = new Map<number, { product: ShopifyProduct; category: 'panel' | 'inverter' }>()
  let collectionsRead = 0
  for (const [i, c] of COLLECTIONS.entries()) {
    if (i > 0) await sleep(CRAWL_DELAY_MS)
    try {
      const json = JSON.parse(await fetchHtml(`${SITE}/collections/${c.handle}/products.json?limit=250`)) as { products: ShopifyProduct[] }
      collectionsRead++
      for (const p of json.products) if (!products.has(p.id)) products.set(p.id, { product: p, category: c.category })
      console.log(`  ${c.handle}: ${json.products.length} product(s)`)
    } catch (err) {
      console.warn(`  ! ${c.handle}: ${(err as Error).message}`)
    }
  }

  const listings: ScrapedListing[] = []
  for (const { product, category } of products.values()) {
    const { listings: found, skipped } = shopifyListings(product, SITE)
    for (const s of skipped) console.log(`  – ${product.title}: ${s}`)
    for (const l of found) {
      listings.push({
        category,
        brand: 'Sun Gold Power',
        model: modelName(product.title, l.mpn),
        mpn: l.mpn,
        spec_sheet_url: l.specSheetUrl,
        image_url: l.imageUrl,
        retailer: RETAILER,
        retailer_product_id: String(l.variantId),
        url: l.url,
        title: l.title,
        retailer_category: product.product_type || null,
        pack_qty: l.packQty,
        min_order_qty: 1,
        price_usd: l.priceUsd,
        ...(category === 'panel'
          ? {
              panel: {
                watts_stc: wattsFromMpn(l.mpn),
                length_mm: null, width_mm: null, thickness_mm: null,
                cell_type: null,
                bifacial: /bifacial/i.test(product.title) ? true : null,
              },
            }
          : {}),
      })
      console.log(`  ${category} | ${l.mpn}${l.packQty > 1 ? ` ×${l.packQty}` : ''} | $${l.priceUsd ?? '—'}`)
    }
  }
  console.log(`\n${products.size} product(s) → ${listings.length} listing(s).`)
  if (DRY_RUN) {
    console.log('DRY RUN — nothing written.')
    return
  }

  // Singles before packs, so a pack attaches to the model its single named.
  listings.sort((a, b) => a.pack_qty - b.pack_qty)
  const supabase = getServiceRoleClient()
  const outcomes: ScrapeOutcome[] = []
  for (const l of listings) outcomes.push(await writeListing(supabase, l))
  console.log(`\nDone: ${tallyOutcomes(outcomes)}.`)
  // A collection is the unit of discovery here: one that fails to load is a
  // candidate that produced nothing.
  reportScrapeHealth({ source: 'sungoldpower-catalog', discovered: COLLECTIONS.length, parsed: collectionsRead, outcomes })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
