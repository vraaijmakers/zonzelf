// Shared parsing/formatting for the roadmap board's SQL representations.
//
// The board exists in three places that must agree: the live database, the
// INSERT tuples in supabase/seed.sql, and the incremental UPDATE/INSERT
// statements in supabase/migrations/*.sql. Every migration header claims it is
// "kept in sync with seed.sql"; nothing enforced that until these checks.

import { readFileSync } from 'node:fs'

export type RoadmapRow = {
  phase: number
  category: string
  title: string
  description: string | null
  status: string
  dev_percent_complete: number
  is_public: boolean
  display_order: number
}

/** Postgres string literal: single quotes are escaped by doubling them. */
export function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

export function sqlValue(value: string | null): string {
  return value === null ? 'null' : sqlString(value)
}

/** One seed.sql-shaped tuple. Shared so the dump and the seed cannot diverge in shape. */
export function formatRow(row: RoadmapRow): string {
  return [
    `  (${row.phase}, ${sqlString(row.category)}, ${sqlString(row.title)},`,
    `   ${sqlValue(row.description)},`,
    `   ${sqlString(row.status)}, ${row.dev_percent_complete}, ${row.is_public}, ${row.display_order})`,
  ].join('\n')
}

/**
 * Strip whole-line `--` comments. Comment prose contains parentheses and
 * apostrophes ("the operator''s board", "(onboarding differentiator)") which
 * corrupt a character scanner if left in.
 */
function stripLineComments(sql: string): string {
  return sql
    .split('\n')
    .filter(line => !line.trimStart().startsWith('--'))
    .join('\n')
}

/** Split a parenthesised, quote-aware list into top-level `(...)` groups. */
function topLevelGroups(sql: string): string[] {
  const groups: string[] = []
  let depth = 0
  let current = ''
  let inQuote = false
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]
    if (inQuote) {
      if (c === "'") {
        if (sql[i + 1] === "'") { current += "''"; i++; continue }
        inQuote = false
      }
      current += c
      continue
    }
    if (c === "'") { inQuote = true; current += c }
    else if (c === '(') { depth++; if (depth === 1) current = ''; else current += c }
    else if (c === ')') { depth--; if (depth === 0) groups.push(current); else current += c }
    else if (depth > 0) current += c
  }
  return groups
}

/** Split one tuple body on top-level commas, respecting quotes. */
function splitFields(tuple: string): string[] {
  const out: string[] = []
  let current = ''
  let inQuote = false
  for (let i = 0; i < tuple.length; i++) {
    const c = tuple[i]
    if (inQuote) {
      if (c === "'") {
        if (tuple[i + 1] === "'") { current += "''"; i++; continue }
        inQuote = false
      }
      current += c
      continue
    }
    if (c === "'") { inQuote = true; current += c }
    else if (c === ',') { out.push(current.trim()); current = '' }
    else current += c
  }
  out.push(current.trim())
  return out
}

function unquote(literal: string): string {
  return literal.slice(1, -1).replace(/''/g, "'")
}

/** Parse every `insert into public.roadmap_items ... values (...)` block in a file. */
export function parseInsertedRows(sql: string): RoadmapRow[] {
  const body = stripLineComments(sql)
  const rows: RoadmapRow[] = []

  // Anchor on a `values` that stands alone on its line — the word also appears
  // in seed.sql's header prose ("the values below are written directly").
  const blocks = body.split(/insert\s+into\s+public\.roadmap_items/i).slice(1)
  for (const block of blocks) {
    const m = block.match(/\n\s*values\s*\n/i)
    if (!m || m.index === undefined) continue
    const tail = block.slice(m.index + m[0].length)
    const upToSemicolon = tail.split(/;\s*(?:\n|$)/)[0]

    for (const tuple of topLevelGroups(upToSemicolon)) {
      const f = splitFields(tuple)
      if (f.length < 8) continue
      rows.push({
        phase: Number(f[0]),
        category: unquote(f[1]),
        title: unquote(f[2]),
        description: f[3] === 'null' ? null : unquote(f[3]),
        status: unquote(f[4]),
        dev_percent_complete: Number(f[5]),
        is_public: f[6] === 'true',
        display_order: Number(f[7]),
      })
    }
  }
  return rows
}

export type MigrationEdit =
  | { kind: 'insert'; row: RoadmapRow; file: string }
  | { kind: 'update'; title: string; fields: Record<string, string>; file: string }

/**
 * Extract the roadmap edits a migration performs.
 *
 * Deliberately strict: an `update public.roadmap_items` this cannot parse
 * throws rather than being skipped. A checker that silently ignores statements
 * it does not understand stops being a check the first time someone writes a
 * new statement shape (CLAUDE.md rule 7 — never swallow errors).
 */
export function parseMigrationEdits(sql: string, file: string): MigrationEdit[] {
  const body = stripLineComments(sql)
  const edits: MigrationEdit[] = []

  for (const row of parseInsertedRows(sql)) edits.push({ kind: 'insert', row, file })

  const updateRe = /update\s+public\.roadmap_items\s+set\s+([\s\S]*?)\s+where\s+title\s*=\s*('(?:[^']|'')*')\s*;/gi
  let m: RegExpExecArray | null
  let seen = 0
  while ((m = updateRe.exec(body)) !== null) {
    seen++
    const fields: Record<string, string> = {}
    for (const assign of splitFields(m[1])) {
      const eq = assign.indexOf('=')
      if (eq === -1) throw new Error(`${file}: cannot parse assignment ${JSON.stringify(assign)}`)
      const key = assign.slice(0, eq).trim()
      const value = assign.slice(eq + 1).trim()
      fields[key] = value.startsWith("'") ? unquote(value) : value
    }
    edits.push({ kind: 'update', title: unquote(m[2]), fields, file })
  }

  const declared = (body.match(/update\s+public\.roadmap_items/gi) ?? []).length
  if (declared !== seen) {
    throw new Error(
      `${file}: found ${declared} "update public.roadmap_items" statement(s) but could only parse ${seen}. ` +
      `Refusing to report a partial check — extend parseMigrationEdits() for the new statement shape.`
    )
  }
  return edits
}

export function readSeedRows(seedPath: string): RoadmapRow[] {
  return parseInsertedRows(readFileSync(seedPath, 'utf8'))
}

/** Compare two row sets by title. Returns human-readable difference lines. */
export function diffRows(
  left: RoadmapRow[], leftName: string,
  right: RoadmapRow[], rightName: string,
): string[] {
  const l = new Map(left.map(r => [r.title, r]))
  const r = new Map(right.map(r => [r.title, r]))
  const problems: string[] = []

  for (const title of l.keys()) if (!r.has(title)) problems.push(`only in ${leftName}: ${title}`)
  for (const title of r.keys()) if (!l.has(title)) problems.push(`only in ${rightName}: ${title}`)

  const keys: (keyof RoadmapRow)[] =
    ['phase', 'category', 'description', 'status', 'dev_percent_complete', 'is_public', 'display_order']
  for (const [title, a] of l) {
    const b = r.get(title)
    if (!b) continue
    for (const k of keys) {
      if (a[k] !== b[k]) {
        problems.push(
          `${title}\n      ${k}\n        ${leftName}: ${JSON.stringify(a[k])}\n        ${rightName}: ${JSON.stringify(b[k])}`
        )
      }
    }
  }
  return problems
}
