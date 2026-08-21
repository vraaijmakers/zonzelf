// Scrapes Victron's Lithium Battery Smart line and inserts each distinct
// model as an unpublished row in battery_models. Run with `npm run
// scrape:victron`.
//
// Victron isn't a normal ecommerce catalog — victronenergy.com/batteries/
// lithium-battery-12-8v is one page for the *entire* product line, and what
// looks like a spec table is actually a downloads accordion (Datasheets,
// Manuals, Dimension Drawings, 3D Files) that re-lists the same model names
// next to PDF/image links, verified against the raw page HTML. There is no
// per-model product URL, so each row's source_url points at that model's
// own PDF (preferring the dimension-drawing/datasheet PDF over a plain
// product image when both exist) — a real Victron document, not a
// synthesized identifier.
//
// The same accordion also lists unrelated system-integration documents (RV
// builds, inverter manuals, van conversions) that happen to mention
// voltage/Ah in their titles — matching is anchored to labels starting
// with "LiFePO4 battery"/"LiFePO4 Battery" to exclude those. No DoD or
// price appears anywhere on the page — both stay null, not guessed.
//
// robots.txt (victronenergy.com) has no crawl-delay directive, but this is
// a single-page fetch, so there's nothing to rate-limit.

import * as cheerio from 'cheerio'
import { type ParsedBattery, fetchHtml, getServiceRoleClient, upsertBatteries } from './lib/scrape-common'

const URL_ = 'https://www.victronenergy.com/batteries/lithium-battery-12-8v'
const LABEL_PATTERN = /^LiFePO4\s+[Bb]attery\s+(\d+,\d+)V[\s-]*(\d+)\s*Ah/

export function parseVictronPage(html: string): ParsedBattery[] {
  const $ = cheerio.load(html)
  const models = new Map<string, ParsedBattery>()

  $('li').each((_, li) => {
    const label = $(li).find('span[class*="break-words"]').first().text().trim()
    const match = label.match(LABEL_PATTERN)
    if (!match) return

    const voltage = parseFloat(match[1].replace(',', '.'))
    const capacity_ah = parseFloat(match[2])
    const key = `${voltage}|${capacity_ah}`

    let href = $(li).find('a[href]').first().attr('href') ?? ''
    $(li).find('a[href]').each((_, a) => {
      const h = $(a).attr('href')
      if (h && /\.pdf$/i.test(h)) href = h
    })
    if (!href) return

    const existing = models.get(key)
    const existingIsPdf = existing ? /\.pdf$/i.test(existing.source_url) : false
    const isPdf = /\.pdf$/i.test(href)
    if (existing && (existingIsPdf || !isPdf)) return // keep what we have unless this is a PDF upgrade

    models.set(key, {
      brand: 'Victron',
      model: `Lithium Battery Smart ${voltage}V ${capacity_ah}Ah`,
      sku: null,
      chemistry: 'lifepo4',
      voltage,
      capacity_ah,
      capacity_kwh: Math.round((voltage * capacity_ah / 1000) * 100) / 100,
      dod_rated: null,
      price_usd: null,
      source_url: href,
    })
  })

  return [...models.values()]
}

async function main() {
  console.log(`Fetching ${URL_}...`)
  const html = await fetchHtml(URL_)
  const batteries = parseVictronPage(html)
  console.log(`Parsed ${batteries.length} distinct model(s).`)

  const supabase = getServiceRoleClient()
  await upsertBatteries(supabase, batteries)
}

// Only run when executed directly — importing this file for
// parseVictronPage (e.g. from a test) must not trigger a live scrape.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
