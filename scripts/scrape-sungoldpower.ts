// Scrapes SunGoldPower's battery collection and inserts each product as an
// unpublished row in battery_models. Run with `npm run scrape:sungoldpower`.
//
// Standard Shopify storefront. No JSON-LD/product-schema, but each product
// page embeds a theme data blob with a clean `"tags":[...],"price":N` pair
// (price in cents; tags include tokens like "100AH"/"48V") — verified
// against the raw page HTML, more reliable than free-text parsing. No DoD
// appears anywhere. Collection listings include "2-x-"/"4-x-" URLs, which
// are multi-unit bundles of the same SKU rather than distinct models, and
// are filtered out.
//
// robots.txt (sungoldpower.com) allows all crawlers, standard Shopify
// disallow list (cart/checkout/account), no crawl-delay directive — this
// script still sleeps 10s between requests to be a respectful crawler.

import { type ParsedBattery, fetchHtml, sleep, getServiceRoleClient, upsertBatteries } from './lib/scrape-common'

const SITE = 'https://sungoldpower.com'
const CATEGORY_URL = `${SITE}/collections/battery`
const CRAWL_DELAY_MS = 10_000

async function discoverProductUrls(): Promise<string[]> {
  const html = await fetchHtml(CATEGORY_URL)
  const urls = new Set<string>()
  for (const match of html.matchAll(/\/products\/([a-z0-9-]+)/gi)) {
    const slug = match[1]
    if (/^\d+-?x-/i.test(slug)) continue // multi-unit bundle of the same SKU, not a distinct model
    urls.add(`${SITE}/products/${slug}`)
  }
  return [...urls]
}

export function parseProduct(html: string, url: string): ParsedBattery | null {
  const titleMatch = html.match(/<h1[^>]*class="product_name"[^>]*>([^<]+)<\/h1>/i)
  const title = titleMatch ? titleMatch[1].trim() : ''
  if (!title || !/li(-|\s)?(thium|fepo4)/i.test(title)) {
    console.warn(`  skip (doesn't look like a lithium battery): ${url}`)
    return null
  }

  const tagsPriceMatch = html.match(/"tags":\[([^\]]*)\],"price":(\d+)/)
  if (!tagsPriceMatch) {
    console.warn(`  skip (couldn't find tags/price block): ${url}`)
    return null
  }
  const tags = [...tagsPriceMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1])
  const price_usd = Math.round((parseInt(tagsPriceMatch[2], 10) / 100) * 100) / 100

  const voltageTag = tags.find(t => /^\d+(\.\d+)?V$/i.test(t))
  const capacityTag = tags.find(t => /^\d+(\.\d+)?AH$/i.test(t))
  if (!voltageTag || !capacityTag) {
    console.warn(`  skip (no voltage/capacity tag): ${url}`)
    return null
  }
  const voltage = parseFloat(voltageTag)
  const capacity_ah = parseFloat(capacityTag)

  const skuMatch = html.match(/"sku":"([^"]+)"/)

  return {
    brand: 'SunGoldPower',
    model: title.replace(/^SunGoldPower\s*/i, '').trim(),
    sku: skuMatch ? skuMatch[1] : null,
    chemistry: 'lifepo4',
    voltage,
    capacity_ah,
    capacity_kwh: Math.round((voltage * capacity_ah / 1000) * 100) / 100,
    dod_rated: null,
    price_usd,
    source_url: url,
  }
}

async function main() {
  console.log(`Discovering product URLs from ${CATEGORY_URL}...`)
  const productUrls = await discoverProductUrls()
  console.log(`Found ${productUrls.length} candidate product pages (bundles filtered out).`)
  await sleep(CRAWL_DELAY_MS)

  const parsed: ParsedBattery[] = []
  for (const [i, url] of productUrls.entries()) {
    console.log(`[${i + 1}/${productUrls.length}] ${url}`)
    try {
      const html = await fetchHtml(url)
      const battery = parseProduct(html, url)
      if (battery) parsed.push(battery)
    } catch (err) {
      console.warn(`  fetch failed: ${(err as Error).message}`)
    }
    if (i < productUrls.length - 1) await sleep(CRAWL_DELAY_MS)
  }

  console.log(`\nParsed ${parsed.length}/${productUrls.length} products.`)
  const supabase = getServiceRoleClient()
  await upsertBatteries(supabase, parsed)
}

// Only run when executed directly — importing this file for parseProduct
// (e.g. from a test) must not trigger a live scrape.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
