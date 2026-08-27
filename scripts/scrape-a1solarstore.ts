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
// hand-verified list, not a discoverer. Each product page here doubles as
// both the manufacturer-spec source and the priced retailer, since
// A1 SolarStore writes its own detailed spec text rather than relying on
// the manufacturer's site.

import * as cheerio from 'cheerio'
import { type ParsedBattery, fetchHtml, getServiceRoleClient, upsertBatteries } from './lib/scrape-common'

const RETAILER = 'A1 SolarStore'

const PRODUCT_URLS = [
  // Discover Energy AES 5.12kWh 48V rack-mount — a brand not otherwise in
  // the catalogue. Confirmed via this page's own spec text, not inferred:
  // "Nominal voltage: 51.2V (48V system)", "Nominal energy / rated
  // capacity: 5.12 kWh / 100Ah (1-hour rate)", "Usable depth of discharge:
  // 100%".
  'https://a1solarstore.com/discover-energy-48-48-5120-h-5kwh-48v-aes-rack-mount-energy-storage-system-lifepo4-battery.html',
]

function parseProduct(html: string, url: string): ParsedBattery | null {
  const $ = cheerio.load(html)
  const text = $('body').text().replace(/\s+/g, ' ')

  const title = $('title').first().text().replace(/\s*-\s*A1 SolarStore\s*$/i, '').trim()
  if (!title) {
    console.warn(`  skip (no title): ${url}`)
    return null
  }

  const brandMatch = html.match(/"brand"\s*:\s*\{\s*"@type"\s*:\s*"Brand"\s*,\s*"name"\s*:\s*"([^"]+)"/)
  const skuMatch = html.match(/"sku"\s*:\s*"([^"]+)"/)
  const priceMatch = html.match(/property="product:price:amount"\s*content="([\d.]+)"/)
  const specMatch = text.match(
    /Nominal energy \/ rated capacity:\s*([\d.]+)\s*kWh\s*\/\s*([\d.]+)\s*Ah/i
  )
  const voltageMatch = text.match(/Nominal voltage:\s*([\d.]+)V/i)
  const dodMatch = text.match(/Usable depth of discharge:\s*([\d.]+)%/i)
  const chemistryMatch = text.match(/Chemistry:\s*LiFePO4/i)

  if (!brandMatch || !skuMatch || !priceMatch || !specMatch || !voltageMatch || !chemistryMatch) {
    console.warn(`  skip (couldn't find all required spec fields): ${url}`)
    return null
  }

  return {
    brand: brandMatch[1],
    model: title.replace(new RegExp(`^${brandMatch[1]}\\s*`, 'i'), '').trim(),
    sku: skuMatch[1],
    chemistry: 'lifepo4',
    voltage: parseFloat(voltageMatch[1]),
    capacity_ah: parseFloat(specMatch[2]),
    capacity_kwh: parseFloat(specMatch[1]),
    dod_rated: dodMatch ? parseInt(dodMatch[1], 10) : null,
    price_usd: parseFloat(priceMatch[1]),
    source_url: url,
    retailer: RETAILER,
    retailer_url: url,
  }
}

async function main() {
  const parsed: ParsedBattery[] = []
  for (const [i, url] of PRODUCT_URLS.entries()) {
    console.log(`[${i + 1}/${PRODUCT_URLS.length}] ${url}`)
    const html = await fetchHtml(url)
    const battery = parseProduct(html, url)
    if (battery) parsed.push(battery)
  }

  console.log(`\nParsed ${parsed.length}/${PRODUCT_URLS.length} products.`)
  const supabase = getServiceRoleClient()
  await upsertBatteries(supabase, parsed)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
