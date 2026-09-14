// Static check: do the roadmap migrations agree with supabase/seed.sql?
//
// Every roadmap migration header claims it is "kept in sync with seed.sql".
// Nothing enforced that, and on 2026-08-23 a migration written with ASCII
// dashes where seed.sql used em dashes disagreed with it from the moment it
// was applied. This is that enforcement.
//
// Needs no database and no credentials, so it runs in CI on a public repo —
// CLAUDE.md rule 9 keeps the service-role key out of this repo entirely, which
// rules out having CI read the live board. The live comparison is
// `npm run check:roadmap-sync`, run locally.
//
// What it checks: replaying the migrations in filename order produces, for
// every title they touch, the same values seed.sql declares. Rows seed.sql
// declares that no migration touches are fine — they predate the migrations.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseMigrationEdits, readSeedRows, type RoadmapRow } from './lib/roadmap-sql'

const MIGRATIONS_DIR = 'supabase/migrations'
const SEED_PATH = 'supabase/seed.sql'

const COLUMN_OF: Record<string, keyof RoadmapRow> = {
  phase: 'phase',
  category: 'category',
  title: 'title',
  description: 'description',
  status: 'status',
  dev_percent_complete: 'dev_percent_complete',
  is_public: 'is_public',
  display_order: 'display_order',
}

function main() {
  const seed = readSeedRows(SEED_PATH)
  const seedByTitle = new Map(seed.map(r => [r.title, r]))

  // Replay migrations in filename order, tracking the end state of every title
  // they touch. Titles can be renamed, so follow the rename rather than
  // treating it as a delete plus an insert.
  const projected = new Map<string, Partial<RoadmapRow>>()
  const touchedIn = new Map<string, string>()
  let files = 0

  for (const file of readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    if (!/public\.roadmap_items/i.test(sql)) continue
    files++

    for (const edit of parseMigrationEdits(sql, file)) {
      if (edit.kind === 'insert') {
        projected.set(edit.row.title, { ...edit.row })
        touchedIn.set(edit.row.title, file)
        continue
      }
      const current = projected.get(edit.title) ?? {}
      const next: Partial<RoadmapRow> = { ...current }
      let key = edit.title
      for (const [col, raw] of Object.entries(edit.fields)) {
        const prop = COLUMN_OF[col]
        if (!prop) throw new Error(`${file}: unknown column "${col}" in update of "${edit.title}"`)
        if (prop === 'phase' || prop === 'dev_percent_complete' || prop === 'display_order') {
          ;(next[prop] as number) = Number(raw)
        } else if (prop === 'is_public') {
          next.is_public = raw === 'true'
        } else {
          ;(next[prop] as string) = raw
        }
        if (prop === 'title') key = raw
      }
      if (key !== edit.title) projected.delete(edit.title)
      projected.set(key, next)
      touchedIn.set(key, file)
    }
  }

  const problems: string[] = []
  for (const [title, fields] of projected) {
    const seedRow = seedByTitle.get(title)
    const where = touchedIn.get(title)
    if (!seedRow) {
      problems.push(`"${title}"\n    set by ${where} but absent from ${SEED_PATH}`)
      continue
    }
    for (const [prop, value] of Object.entries(fields) as [keyof RoadmapRow, unknown][]) {
      if (seedRow[prop] !== value) {
        problems.push(
          `"${title}" — ${prop}\n` +
          `    ${where}: ${JSON.stringify(value)}\n` +
          `    ${SEED_PATH}: ${JSON.stringify(seedRow[prop])}`
        )
      }
    }
  }

  console.log(`Checked ${files} roadmap migration(s) against ${SEED_PATH} (${seed.length} rows).`)
  console.log(`${projected.size} title(s) are set by a migration; the rest predate them.\n`)

  if (problems.length > 0) {
    console.error(`${problems.length} disagreement(s) between the migrations and ${SEED_PATH}:\n`)
    for (const p of problems) console.error(`  ${p}\n`)
    console.error('Both must encode the same end state. Update seed.sql, or fix the migration')
    console.error('forward with a new one — never edit a migration that has been applied.')
    process.exit(1)
  }
  console.log('OK — the migrations and seed.sql agree.')
}

main()
