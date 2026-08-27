// Adds battery models sold through A1 SolarStore, a multi-brand reseller
// with its own affiliate program (see roadmap item "Battery catalogue:
// price coverage and vendor mix for affiliate"). Run with
// `npm run scrape:a1solarstore`.
//
// robots.txt (a1solarstore.com) disallows query-string pagination
// (`/?*`, `*sort_by=*`, `*features_hash=*`) and a few utility paths, but
// plain product and category pages are unrestricted for every crawler.
//
// A1 SolarStore's catalogue is dominated by bulk lead-acid pallets and
// bundled inverter+battery kits that don't belong in a "you need N of
// these" DIY battery calculator (same reasoning that ruled out Bluetti's
// ecosystem-locked power stations). Finding a real standalone LiFePO4
// battery meant hand-browsing category pages rather than one clean
// discovery crawl, so — like scrape-signaturesolar.ts — this is a
// hand-verified list, not a discoverer.
//
// Specs are hardcoded from the manufacturer's own datasheet rather than
// scraped from the reseller page: source_url must be "the manufacturer
// spec citation" (see the battery_models migration), and a reseller's
// marketing copy — however accurate it happened to be here — isn't that.
// Only price_usd is scraped live, since that's the one field that actually
// changes and A1 SolarStore is the priced retailer, not the spec source.

import { fetchHtml, getServiceRoleClient, upsertBatteries, type ParsedBattery } from './lib/scrape-common'

const RETAILER = 'A1 SolarStore'

type Product = Omit<ParsedBattery, 'price_usd'> & { retailer_url: string }

const PRODUCTS: Product[] = [
  {
    // Verified against the manufacturer's own datasheet (808-0040 REV B):
    // discoverenergysys.com/s4x_files/resources/808-0040-aes-rackmount-48-48-5120-h-data-sheet.pdf
    // Nominal Voltage 51.2V, Nominal Energy 5.12kWh, Rated Capacity 100Ah
    // (1HR), Useable DoD 100%. discoverenergysys.com sells through a
    // dealer network with no storefront of its own (same as Victron,
    // already in this catalogue on that basis) — A1 SolarStore is the
    // reseller, not the spec source.
    brand: 'Discover Energy Systems',
    model: 'AES Rackmount 48-48-5120-H',
    sku: '48-48-5120-H',
    chemistry: 'lifepo4',
    voltage: 51.2,
    capacity_ah: 100,
    capacity_kwh: 5.12,
    dod_rated: 100,
    source_url: 'https://discoverenergysys.com/s4x_files/resources/808-0040-aes-rackmount-48-48-5120-h-data-sheet.pdf',
    retailer: RETAILER,
    retailer_url: 'https://a1solarstore.com/discover-energy-48-48-5120-h-5kwh-48v-aes-rack-mount-energy-storage-system-lifepo4-battery.html',
  },
]

async function fetchPrice(url: string): Promise<number | null> {
  const html = await fetchHtml(url)
  const match = html.match(/property="product:price:amount"\s*content="([\d.]+)"/)
  if (!match) {
    console.warn(`  skip (no price found): ${url}`)
    return null
  }
  return parseFloat(match[1])
}

async function main() {
  const parsed: ParsedBattery[] = []
  for (const [i, product] of PRODUCTS.entries()) {
    console.log(`[${i + 1}/${PRODUCTS.length}] ${product.brand} ${product.model}`)
    const price_usd = await fetchPrice(product.retailer_url)
    if (price_usd !== null) parsed.push({ ...product, price_usd })
  }

  console.log(`\nPriced ${parsed.length}/${PRODUCTS.length} products.`)
  const supabase = getServiceRoleClient()
  await upsertBatteries(supabase, parsed)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
