// Fills in the price Signature Solar charges for battery_models rows that
// already exist from a manufacturer scrape (EG4's own site never lists a
// price — see scrape-eg4.ts). Signature Solar is a reseller with its own
// affiliate programme, so price and the buy link get their own columns
// (retailer / retailer_url) rather than overwriting source_url, which stays
// the manufacturer spec citation. Run with `npm run scrape:signaturesolar`.
//
// robots.txt (signaturesolar.com) allows product pages for every crawler,
// including the AI-crawler block (ClaudeBot, GPTBot, anthropic-ai, ...) —
// only /account.php, /cart.php, /checkout*, and /admin/ are disallowed.
// That block sets Crawl-delay: 10, which this script honors between every
// request even though the default '*' block doesn't repeat it.
//
// This is a hand-verified SKU -> product URL mapping, not discovery: EG4's
// storefront presence on Signature Solar splits "Indoor" and "AllWeather"
// wallmount variants of the same capacity into separate products, and a
// naive title/capacity match would silently pick the wrong one. Each entry
// below was matched by hand against the existing battery_models row it
// updates. Adding a brand to real discovery is future work (see roadmap item
// "Battery scraper: brand discovery + LLM extraction").
//
// Updates are written unpublished. Filling in a price on an
// already-published row is exactly the "re-review gate" risk the roadmap
// item "Battery scraper: re-scrape scheduling + published-row review gate"
// describes — new scraped data isn't trusted until a human looks at it,
// price included. An admin re-approves in /admin/batteries.

import { fetchHtml, sleep, getServiceRoleClient } from './lib/scrape-common'

const CRAWL_DELAY_MS = 10_000
const RETAILER = 'Signature Solar'

const PRODUCTS: { sku: string; url: string }[] = [
  {
    // EG4 LL-S 48V 100AH — matches battery_models row "LL-S 48V 100AH
    // Lithium Iron Phosphate Battery". Do not confuse with the newer
    // "EG4 LifePower4 V2" 100Ah product on the same storefront.
    sku: 'EG4LL48V100AV4',
    url: 'https://signaturesolar.com/eg4-ll-s-lithium-battery-48v-100ah-server-rack-battery-ul1973-ul9540a-10-year-warranty',
  },
  {
    // EG4 WallMount 280Ah All Weather — the "AllWeather" (outdoor) variant,
    // not the separately-listed "Indoor" 280Ah product.
    sku: 'EG4LL48V100AODWMBV2',
    url: 'https://signaturesolar.com/eg4-wallmount-all-weather-lithium-battery-48v-280ah-14-3kwh-lifepo4-all-weather-energy-storage-ul1973-ul9540a-10-year-warranty/',
  },
  {
    // EG4 WallMount 314Ah All Weather — same Indoor/AllWeather split as above.
    sku: 'EG448V314AODWMB',
    url: 'https://signaturesolar.com/eg4-allweather-wallmount-battery-48v-314ah-16kwh/',
  },
]

function parsePrice(html: string, url: string): number | null {
  const match = html.match(/itemprop="price"\s+content="([\d.]+)"/)
  if (!match) {
    console.warn(`  skip (no price found): ${url}`)
    return null
  }
  return parseFloat(match[1])
}

async function main() {
  const supabase = getServiceRoleClient()

  for (const [i, { sku, url }] of PRODUCTS.entries()) {
    console.log(`[${i + 1}/${PRODUCTS.length}] ${url}`)
    const html = await fetchHtml(url)
    const price_usd = parsePrice(html, url)
    if (price_usd !== null) {
      const { data, error } = await supabase
        .from('battery_models')
        .update({
          price_usd,
          retailer: RETAILER,
          retailer_url: url,
          is_published: false,
        })
        .eq('sku', sku)
        .select('id, brand, model')
      if (error) {
        console.error(`  update failed for sku ${sku}: ${error.message}`)
      } else if (!data || data.length === 0) {
        console.warn(`  no battery_models row with sku ${sku} — nothing updated`)
      } else {
        console.log(`  ✓ ${data[0].brand} ${data[0].model} → $${price_usd} (unpublished, pending review)`)
      }
    }
    if (i < PRODUCTS.length - 1) await sleep(CRAWL_DELAY_MS)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
