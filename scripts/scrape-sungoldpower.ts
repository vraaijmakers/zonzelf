// Scrapes SunGoldPower's battery collection and inserts each product as an
// unpublished row in battery_models. Run with `npm run scrape:sungoldpower`.
//
// Standard Shopify storefront. This reads each product's own JSON endpoint,
// `/products/<handle>.js`, rather than regexing a theme data blob out of 800KB
// of page HTML: same numbers, from the platform's own API, and it carries the
// full variant list, which the blob does not. The parsing rules and the reasons
// a product is skipped live in src/lib/sungoldpower-listing.ts so `npm test`
// can hold them still — that file's header has the history, including how the
// blob version came to parse 1 product in 10 behind a green weekly job.
//
// robots.txt (sungoldpower.com) allows all crawlers and disallows only
// cart/checkout/account paths, `/*/cart.js` and `/*/recommendations/products`
// — re-read 2026-09-24, product JSON is not among them. No crawl-delay
// directive; this script still sleeps 10s between requests to be a respectful
// crawler. Collection listings include "2-x-"/"4-x-" URLs, which are
// multi-unit bundles of the same SKU rather than distinct models, and are
// filtered out at discovery.

import { type ParsedBattery, fetchHtml, sleep, getServiceRoleClient, upsertBatteries, reportScrapeHealth } from './lib/scrape-common'
import { parseSungoldProduct, type ShopifyProduct } from '../src/lib/sungoldpower-listing'
import { toAbsoluteImageUrl } from '../src/lib/product-image'

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

async function fetchProduct(url: string): Promise<ShopifyProduct> {
  // fetchHtml is just a fetch with the bot User-Agent and a status check; the
  // body here is JSON rather than HTML.
  const raw = await fetchHtml(`${url}.js`)
  return JSON.parse(raw) as ShopifyProduct
}

export function toBattery(product: ShopifyProduct, url: string): ParsedBattery | null {
  const result = parseSungoldProduct(product)
  if (!result.ok) {
    console.warn(`  skip (${result.reason}): ${url}`)
    return null
  }
  return {
    ...result.listing,
    source_url: url,
    // Shopify serves featured_image protocol-relative ("//cdn.shopify.com/…")
    // and with a ?v= cache-buster that moves on its own; both are handled here.
    image_url: toAbsoluteImageUrl(result.listing.image_url ?? '', url),
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
      const battery = toBattery(await fetchProduct(url), url)
      if (battery) parsed.push(battery)
    } catch (err) {
      console.warn(`  fetch failed: ${(err as Error).message}`)
    }
    if (i < productUrls.length - 1) await sleep(CRAWL_DELAY_MS)
  }

  console.log(`\nParsed ${parsed.length}/${productUrls.length} products.`)
  const supabase = getServiceRoleClient()
  const outcomes = await upsertBatteries(supabase, parsed, 'sungoldpower')
  reportScrapeHealth({ source: 'sungoldpower', discovered: productUrls.length, parsed: parsed.length, outcomes })
}

// Only run when executed directly — importing this file for toBattery
// (e.g. from a test) must not trigger a live scrape.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
