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
import { parseSungoldProduct, oneRowPerSku, type ShopifyProduct, type ListingWithUrl } from '../src/lib/sungoldpower-listing'
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

/**
 * Every battery one product page sells, each with the URL it will be stored
 * under. Usually one; two where the page covers two capacities.
 */
export function toListings(product: ShopifyProduct, url: string): ListingWithUrl[] {
  const result = parseSungoldProduct(product)
  if (!result.ok) {
    console.warn(`  skip (${result.reason}): ${url}`)
    return []
  }
  return result.listings.map(listing => ({
    listing,
    // A variant id only appears where one page sells several batteries, and it
    // is what gives each of them a source_url of its own. Everywhere else the
    // page URL is the row's identity and must not change — a changed
    // source_url forks a row rather than updating it.
    source_url: listing.variant_id === null ? url : `${url}?variant=${listing.variant_id}`,
  }))
}

/**
 * The database record. variant_id and from_multi_capacity_page are parsing
 * bookkeeping, not columns — they are dropped here rather than spread into an
 * insert, which would fail on a column battery_models does not have.
 */
function toBattery({ listing, source_url }: ListingWithUrl): ParsedBattery {
  return {
    brand: listing.brand,
    model: listing.model,
    sku: listing.sku,
    chemistry: listing.chemistry,
    voltage: listing.voltage,
    capacity_ah: listing.capacity_ah,
    capacity_kwh: listing.capacity_kwh,
    dod_rated: listing.dod_rated,
    price_usd: listing.price_usd,
    source_url,
    // Shopify serves featured_image protocol-relative ("//cdn.shopify.com/…")
    // and with a ?v= cache-buster that moves on its own; both handled here.
    image_url: toAbsoluteImageUrl(listing.image_url ?? '', source_url),
  }
}

async function main() {
  console.log(`Discovering product URLs from ${CATEGORY_URL}...`)
  const productUrls = await discoverProductUrls()
  console.log(`Found ${productUrls.length} candidate product pages (bundles filtered out).`)
  await sleep(CRAWL_DELAY_MS)

  const found: ListingWithUrl[] = []
  for (const [i, url] of productUrls.entries()) {
    console.log(`[${i + 1}/${productUrls.length}] ${url}`)
    try {
      found.push(...toListings(await fetchProduct(url), url))
    } catch (err) {
      console.warn(`  fetch failed: ${(err as Error).message}`)
    }
    if (i < productUrls.length - 1) await sleep(CRAWL_DELAY_MS)
  }

  const { kept, dropped } = oneRowPerSku(found)
  for (const { row, inFavourOf } of dropped) {
    console.log(`  – ${row.listing.sku} also sold at ${row.source_url} — keeping ${inFavourOf}`)
  }
  const parsed = kept.map(toBattery)
  // `parsed` counts batteries, `productUrls` counts pages, and one page can
  // hold two batteries — so this can read 7/10. That is the honest pair: the
  // health check asks whether the catalogue still parses, not whether the two
  // numbers match.
  console.log(`\nParsed ${parsed.length} batteries from ${productUrls.length} product pages.`)
  const supabase = getServiceRoleClient()
  const outcomes = await upsertBatteries(supabase, parsed, 'sungoldpower')
  reportScrapeHealth({ source: 'sungoldpower', discovered: productUrls.length, parsed: parsed.length, outcomes })
}

// Only run when executed directly — importing this file for toListings
// (e.g. from a test) must not trigger a live scrape.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
