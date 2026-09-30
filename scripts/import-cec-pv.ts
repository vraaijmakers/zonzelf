// Loads the California Energy Commission PV module list into cec_pv_modules.
// Run with `npm run import:cec-pv`.
//
// Reference data, not catalogue rows: nothing here reaches component_models.
// The panel scrapers look a retailer's part number up in this table to
// pre-fill a CANDIDATE spec (see src/lib/cec-pv.ts for why a CEC figure is a
// candidate and never a verified one). Rows are upserted, never deleted — a
// module leaving the list still exists on roofs and in shops, and imported_at
// says how long ago the list last vouched for it.
//
// One ~5 MB download from a state government site, once a week. The list says
// on its second row when its data last changed; that line is logged so a run
// shows whether there was anything new to load.

import { USER_AGENT, getServiceRoleClient, reportScrapeHealth, type ScrapeOutcome } from './lib/scrape-common'
import { readFirstSheet } from './lib/xlsx-rows'
import { CEC_PV_LIST_URL, assertCecHeader, findHeaderRow, parseCecRow, type CecPvModule } from '../src/lib/cec-pv'

const BATCH = 1000

async function main() {
  console.log(`Downloading ${CEC_PV_LIST_URL}`)
  const res = await fetch(CEC_PV_LIST_URL, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`CEC PV module list → HTTP ${res.status}`)
  const rows = readFirstSheet(new Uint8Array(await res.arrayBuffer()))

  const stamp = rows.slice(0, 5).map(r => r[0]).find(v => typeof v === 'string' && /has not changed since/i.test(v))
  if (stamp) console.log(`  ${stamp}`)

  const headerAt = findHeaderRow(rows)
  if (headerAt < 0) throw new Error('CEC PV module list: header row not found — the sheet layout changed')
  assertCecHeader(rows[headerAt])

  // The list files a handful of manufacturer + model pairs twice (Hanwha
  // Qcells HSL60P6-PC-3-250, among others). One upsert batch cannot touch a
  // key twice, so the later row wins — it is the more recently added one.
  const byKey = new Map<string, CecPvModule>()
  let dataRows = 0
  for (const row of rows.slice(headerAt + 1)) {
    const m = parseCecRow(row)
    if (!m) continue
    dataRows++
    byKey.set(`${m.manufacturer}\u0000${m.model_number}`, m)
  }
  const modules = [...byKey.values()]
  console.log(`Parsed ${dataRows} rows → ${modules.length} distinct modules from ${new Set(modules.map(m => m.manufacturer)).size} manufacturers.`)

  const supabase = getServiceRoleClient()
  const outcomes: ScrapeOutcome[] = []
  const imported_at = new Date().toISOString()
  for (let i = 0; i < modules.length; i += BATCH) {
    const batch = modules.slice(i, i + BATCH).map(m => ({ ...m, imported_at }))
    const { error } = await supabase
      .from('cec_pv_modules')
      .upsert(batch, { onConflict: 'manufacturer,model_number' })
    if (error) {
      console.error(`  ✗ rows ${i + 1}–${i + batch.length}: ${error.message}`)
      outcomes.push(...batch.map((): ScrapeOutcome => 'failed'))
    } else {
      outcomes.push(...batch.map((): ScrapeOutcome => 'updated'))
    }
  }

  const written = outcomes.filter(o => o === 'updated').length
  console.log(`Upserted ${written}/${modules.length} modules into cec_pv_modules.`)
  reportScrapeHealth({ source: 'cec-pv', discovered: dataRows, parsed: dataRows, outcomes })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
