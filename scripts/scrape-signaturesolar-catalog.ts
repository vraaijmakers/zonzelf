// Discovers panels and inverters on Signature Solar and writes them into the
// component catalogue. Run with `npm run scrape:signaturesolar-catalog`;
// DRY_RUN=1 parses and prints without touching the database, LIMIT=n stops
// after n product pages.
//
// NOT THE SAME JOB AS scrape-signaturesolar.ts. That one prices a hand-verified
// list of EG4 batteries, because a battery's specs come from EG4 and only the
// price comes from the shop. Here discovery is the point — every panel and
// inverter the shop lists is an affiliate link the site does not have — and
// what makes that safe is that nothing discovered is trusted: rows land
// unpublished, panel electricals are CEC CANDIDATES, and inverters arrive with
// no electricals at all. Publishing requires a human to verify the spec row
// against the manufacturer's datasheet, and the database enforces it.
//
// robots.txt (signaturesolar.com): product and category pages are allowed for
// every crawler, the AI-crawler block included. That block sets
// Crawl-delay: 10, honoured between every request. Category pagination uses
// ?page=N, which is not disallowed (only ?_bc_fsnf=1 filter URLs are).
// Roughly 200 pages at 10 s is ~35 minutes; the workflow allows for it.

import * as cheerio from 'cheerio'
import { fetchHtml, sleep, getServiceRoleClient, tallyOutcomes, reportScrapeHealth, type ScrapeOutcome } from './lib/scrape-common'
import { writeListing, type ScrapedListing } from './lib/catalog-write'
import {
  classifyProduct, modelNameFromTitle, packQuantity, parseBigCommerceProduct, parseDimensionsMm,
  parseMinimumPurchase, parseWatts, type BigCommerceProduct,
} from '../src/lib/bigcommerce-product'

const RETAILER = 'Signature Solar'
const BASE = 'https://signaturesolar.com'
const CRAWL_DELAY_MS = 10_000
const MAX_PAGES_PER_CATEGORY = 20

// Parent categories, each paginated to the end. The classifier decides what a
// product is from the product page's own category path, so a start page that
// strays (a sale banner, an accessory) costs a fetch, not a wrong row.
const START_PAGES = [
  '/all-products/solar-panels/',
  '/shop-all/solar-panels/pallets/',
  '/all-products/inverters/',
]

const DRY_RUN = process.env.DRY_RUN === '1'
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity

let lastFetch = 0
async function politeFetch(url: string): Promise<string> {
  const wait = lastFetch + CRAWL_DELAY_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastFetch = Date.now()
  return fetchHtml(url)
}

async function discover(): Promise<string[]> {
  const found = new Set<string>()
  for (const path of START_PAGES) {
    const seenHere = new Set<string>()
    for (let page = 1; page <= MAX_PAGES_PER_CATEGORY; page++) {
      const url = `${BASE}${path}${page > 1 ? `?page=${page}` : ''}`
      let html: string
      try {
        html = await politeFetch(url)
      } catch (err) {
        console.warn(`  ! ${url}: ${(err as Error).message}`)
        break
      }
      const $ = cheerio.load(html)
      const links = $('.card-title a').map((_, a) => $(a).attr('href')).get()
        .map(href => new URL(href, BASE).toString())
      const before = found.size
      const beforeHere = seenHere.size
      links.forEach(l => { found.add(l); seenHere.add(l) })
      console.log(`  ${path} p${page}: ${links.length} card(s), ${found.size - before} new`)
      // An out-of-range ?page= may serve the last page again, so the end
      // marker is a page that repeats what THIS category already showed. Not
      // "nothing new overall": the pallets category overlaps the parent panels
      // category, and its page 1 adding nothing says nothing about page 2.
      if (links.length === 0 || seenHere.size === beforeHere) break
    }
  }
  return [...found]
}

function toListing(p: BigCommerceProduct): ScrapedListing | { skip: string } {
  const category = classifyProduct(p)
  if (!category) return { skip: `not a panel or inverter (${p.categories.at(-1) ?? 'no category'})` }
  if (!p.brand) return { skip: 'no brand' }

  const pack_qty = packQuantity(p)
  if (pack_qty === null) return { skip: 'a pallet with no stated size — no per-panel price possible' }

  const relevant = p.categories
    .filter(c => (category === 'panel' ? /^All Products\/Solar Panels/ : /^All Products\/Inverters/).test(c))
    .sort((a, b) => b.length - a.length)

  const listing: ScrapedListing = {
    category,
    brand: p.brand,
    model: modelNameFromTitle(p.title, p.brand),
    mpn: p.mpn,
    spec_sheet_url: p.spec_sheet_url,
    image_url: p.image_url,
    retailer: RETAILER,
    retailer_product_id: String(p.id),
    url: p.url,
    title: p.title,
    retailer_category: relevant[0] ?? null,
    pack_qty,
    min_order_qty: parseMinimumPurchase(p.fields['Minimum Purchase']) ?? p.min_purchase_quantity,
    price_usd: p.price_usd,
  }

  if (category === 'panel') {
    const dims = parseDimensionsMm(p.fields['Dimensions'] ?? p.fields['Panel Dimensions'])
    const panelType = p.fields['Panel Type'] ?? ''
    listing.panel = {
      watts_stc: parseWatts(p.fields['Wattage']) ?? parseWatts(p.title.match(/(\d{2,4})\s*W\b/i)?.[0]),
      length_mm: dims?.length_mm ?? null,
      width_mm: dims?.width_mm ?? null,
      thickness_mm: dims?.thickness_mm ?? null,
      cell_type: p.fields['Cell Type'] ?? null,
      bifacial: /bifacial/i.test(panelType) ? true : /mono.?facial/i.test(panelType) ? false : /bifacial/i.test(p.title) ? true : null,
    }
  }
  return listing
}

async function main() {
  console.log(`Discovering on ${BASE} (crawl delay ${CRAWL_DELAY_MS / 1000}s)${DRY_RUN ? ' — DRY RUN' : ''}`)
  const urls = (await discover()).slice(0, LIMIT)
  console.log(`\n${urls.length} product page(s) to read.\n`)

  const listings: ScrapedListing[] = []
  const skipped = new Map<string, number>()
  let failedFetch = 0
  for (const [i, url] of urls.entries()) {
    let html: string
    try {
      html = await politeFetch(url)
    } catch (err) {
      failedFetch++
      console.warn(`[${i + 1}/${urls.length}] ✗ ${url}: ${(err as Error).message}`)
      continue
    }
    const product = parseBigCommerceProduct(html, url)
    if (!product) {
      failedFetch++
      console.warn(`[${i + 1}/${urls.length}] ✗ ${url}: no product object on the page`)
      continue
    }
    const result = toListing(product)
    if ('skip' in result) {
      skipped.set(result.skip, (skipped.get(result.skip) ?? 0) + 1)
      console.log(`[${i + 1}/${urls.length}] – ${product.title}: ${result.skip}`)
      continue
    }
    listings.push(result)
    const r = result
    console.log(`[${i + 1}/${urls.length}] ${r.category} | ${r.brand} | ${r.model} | mpn ${r.mpn ?? '—'} | ${r.pack_qty > 1 ? `pack ${r.pack_qty} | ` : ''}$${r.price_usd ?? '—'}`)
  }

  const parsedPages = urls.length - failedFetch
  console.log(`\nRead ${parsedPages}/${urls.length} pages: ${listings.length} catalogue listing(s), ${[...skipped.values()].reduce((a, b) => a + b, 0)} skipped as out of scope.`)

  if (DRY_RUN) {
    console.log('DRY RUN — nothing written.')
    return
  }

  // Singles before pallets, so a pallet attaches to the model its single
  // created (and named) rather than naming it after itself.
  listings.sort((a, b) => a.pack_qty - b.pack_qty)
  const supabase = getServiceRoleClient()
  const outcomes: ScrapeOutcome[] = []
  console.log(`\nWriting ${listings.length} listing(s)...`)
  for (const listing of listings) outcomes.push(await writeListing(supabase, listing))

  console.log(`\nDone: ${tallyOutcomes(outcomes)}.`)
  console.log('Everything new is unpublished. Panels and inverters publish only once an admin verifies their specs against the manufacturer datasheet.')
  // `parsed` counts pages that yielded a product object, in or out of scope —
  // an out-of-scope page parsed fine; a page with no product object did not.
  reportScrapeHealth({ source: 'signaturesolar-catalog', discovered: urls.length, parsed: parsedPages, outcomes })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
