// Scrapes EG4 Electronics' battery category page and inserts each product
// as an unpublished row in battery_models. Run with `npm run scrape:eg4`.
//
// EG4's product pages have no JSON-LD product schema or WooCommerce data —
// verified by fetching the raw HTML, not assumed. Specs live inside a
// FAQPage JSON-LD block (a "Key Specifications" Q&A whose answer is an HTML
// string) plus a free-text depth-of-discharge claim in the marketing copy.
// Both are parsed defensively: a product that doesn't match is skipped and
// logged, never inserted with guessed values.
//
// robots.txt (eg4electronics.com) allows all crawlers with a 10s
// crawl-delay — this script sleeps 10s between every request to honor that.

import * as cheerio from 'cheerio'
import { type ParsedBattery, fetchHtml, sleep, getServiceRoleClient, upsertBatteries } from './lib/scrape-common'

const SITE = 'https://eg4electronics.com'
const CATEGORY_URL = `${SITE}/categories/batteries`
const CRAWL_DELAY_MS = 10_000

async function discoverProductUrls(): Promise<string[]> {
  const html = await fetchHtml(CATEGORY_URL)
  const $ = cheerio.load(html)
  const urls = new Set<string>()

  $('a[href*="/categories/batteries/"]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    const absolute = href.startsWith('http') ? href : `${SITE}${href}`
    // The category index page itself and pagination links aren't products.
    if (absolute.replace(/\/$/, '') === CATEGORY_URL.replace(/\/$/, '')) return
    urls.add(absolute.split('?')[0].replace(/\/$/, '') + '/')
  })

  return [...urls]
}

export function parseProduct(html: string, url: string): ParsedBattery | null {
  const $ = cheerio.load(html)

  const title = $('h1').first().text().trim()
  if (!title) return null

  // "Key Specifications" is an FAQPage JSON-LD entry whose answer text is
  // itself an HTML string, e.g. "<p><b>Voltage: </b>51.2V<br/><b>Capacity:
  // </b>100Ah<br/>...".
  let specsHtml = ''
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text()
    if (!raw.includes('Key Specifications')) return
    try {
      const json = JSON.parse(raw)
      const entry = json.mainEntity?.find(
        (q: { name?: string }) => q.name === 'Key Specifications'
      )
      if (entry?.acceptedAnswer?.text) specsHtml = entry.acceptedAnswer.text
    } catch {
      // Malformed JSON-LD on this page — fall through, leave specsHtml empty.
    }
  })
  if (!specsHtml) {
    console.warn(`  skip (no Key Specifications block): ${url}`)
    return null
  }

  const specsText = cheerio.load(specsHtml).text()
  const voltageMatch = specsText.match(/Voltage:\s*([\d.]+)\s*V/i)
  const capacityMatch = specsText.match(/Capacity:\s*([\d.]+)\s*Ah/i)
  if (!voltageMatch || !capacityMatch) {
    console.warn(`  skip (couldn't parse voltage/capacity): ${url}`)
    return null
  }
  const voltage = parseFloat(voltageMatch[1])
  const capacity_ah = parseFloat(capacityMatch[1])

  const bodyText = $('body').text()
  const dodMatch = bodyText.match(/(\d{1,3})%\s*depth of discharge/i)
  const dod_rated = dodMatch ? parseInt(dodMatch[1], 10) : null

  const skuMatch = bodyText.match(/SKU:\s*([A-Za-z0-9-]+)/)
  const sku = skuMatch ? skuMatch[1] : null

  return {
    brand: 'EG4',
    model: title.replace(/^EG4®?\s*/i, '').trim(),
    sku,
    chemistry: 'lifepo4',
    voltage,
    capacity_ah,
    capacity_kwh: Math.round((voltage * capacity_ah / 1000) * 100) / 100,
    dod_rated,
    price_usd: null,
    source_url: url,
  }
}

async function main() {
  console.log(`Discovering product URLs from ${CATEGORY_URL}...`)
  const productUrls = await discoverProductUrls()
  console.log(`Found ${productUrls.length} candidate product pages.`)
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
// (e.g. from a test) must not trigger a live scrape as a side effect.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
