// Live check: does the roadmap board in the database match supabase/seed.sql?
//
// The board is mutable state — /admin/roadmap's Server Actions write straight
// to the database — so an item created or re-statused through the UI exists
// only there. seed.sql is a hand-maintained reconstruction, and on 2026-08-22
// it had silently drifted in four places, including an operator-created item
// that existed in no migration, no seed file and no commit.
//
// Runs locally, not in CI: reading the board needs the service-role key, and
// CLAUDE.md rule 9 keeps that out of this public repo. The credential-free
// half of the contract is `npm run check:roadmap-migrations`, which CI runs.
//
//   npm run check:roadmap-sync
//
// Exits non-zero on any difference, so it can gate a release step.

import { getServiceRoleClient } from './lib/scrape-common'
import { diffRows, readSeedRows, type RoadmapRow } from './lib/roadmap-sql'

const SEED_PATH = 'supabase/seed.sql'

async function main() {
  const supabase = getServiceRoleClient()
  const { data, error } = await supabase
    .from('roadmap_items')
    .select('phase, category, title, description, status, dev_percent_complete, is_public, display_order')
    .order('phase', { ascending: true })
    .order('display_order', { ascending: true })
    .order('id', { ascending: true })

  // Rule 7 — never swallow errors. Reporting "in sync" because the query
  // failed is the worst possible outcome for a check like this.
  if (error) throw new Error(`roadmap_items select failed: ${error.message}`)
  if (!data || data.length === 0) {
    throw new Error('roadmap_items returned no rows — refusing to compare against an empty board')
  }

  const live = data as RoadmapRow[]
  const seed = readSeedRows(SEED_PATH)
  const problems = diffRows(live, 'live', seed, 'seed.sql')

  console.log(`live board: ${live.length} row(s)   ${SEED_PATH}: ${seed.length} row(s)\n`)

  if (problems.length > 0) {
    console.error(`${problems.length} difference(s):\n`)
    for (const p of problems) console.error(`  ${p}\n`)
    console.error('Reconcile before changing the board further. `npm run dump:roadmap` emits the')
    console.error('live rows in seed.sql shape; fold anything live-only back into seed.sql, and')
    console.error('carry deliberate seed-side changes to the database with a new migration.')
    process.exit(1)
  }
  console.log('OK — the live board and seed.sql agree.')
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
