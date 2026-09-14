/**
 * The pure half of the battery scraper's published-row review gate.
 *
 * Shared deliberately between three callers so they cannot drift apart:
 * scripts/lib/scrape-common.ts (decides whether a scrape writes or proposes),
 * /admin/batteries (renders the diff and applies it), and the tests. Same
 * reasoning as battery-review.ts — the reviewer and the automation must be
 * looking at the same fields.
 *
 * No Supabase import on purpose: this file is imported from scripts/ by
 * relative path as well as from src/ by alias, and it must stay runnable
 * anywhere.
 */

/**
 * The columns a scraper is allowed to write on an existing row, and the only
 * keys an applied revision can carry.
 *
 * is_published is NOT here, and that is the security property of this file
 * rather than an oversight: applyBatteryRevision() filters the stored jsonb
 * through pickScrapedFields(), so no proposal — however it got into the table —
 * can publish a row. Publication stays a human decision.
 *
 * scraped_at is not here either; it is set by the writer, not proposed.
 */
export const SCRAPED_FIELDS = [
  'brand',
  'model',
  'sku',
  'chemistry',
  'voltage',
  'capacity_ah',
  'capacity_kwh',
  'dod_rated',
  'price_usd',
  'source_url',
  'retailer',
  'retailer_url',
] as const

export type ScrapedField = (typeof SCRAPED_FIELDS)[number]

const SCRAPED_FIELD_SET = new Set<string>(SCRAPED_FIELDS)

// PostgREST hands numeric columns back as JSON numbers, but a scraper parses
// them out of HTML and a jsonb round-trip can widen 1683.40 to "1683.40".
// Compare as numbers so a re-scrape of an unchanged page doesn't propose a
// change that is only a difference in spelling.
const NUMERIC_FIELDS = new Set<ScrapedField>([
  'voltage', 'capacity_ah', 'capacity_kwh', 'dod_rated', 'price_usd',
])

export type FieldChange = {
  field: ScrapedField
  from: string | number | null
  to: string | number | null
}

export type ScrapedRecord = Partial<Record<ScrapedField, unknown>>

/**
 * Comparison form. Empty string and undefined both collapse to null: a scraper
 * that matched an empty tag has found nothing, not a value of "".
 */
export function normalizeFieldValue(field: ScrapedField, value: unknown): string | number | null {
  if (value === null || value === undefined) return null
  if (NUMERIC_FIELDS.has(field)) {
    const n = typeof value === 'number' ? value : Number(String(value).trim())
    return Number.isFinite(n) ? n : null
  }
  const s = String(value).trim()
  return s.length === 0 ? null : s
}

/**
 * What a scrape would change about an existing row, restricted to SCRAPED_FIELDS.
 *
 * TWO KINDS OF SILENCE, and the difference is the whole point:
 *
 *   Key absent from the patch — the scraper has no opinion. scrape-eg4.ts never
 *   sets `retailer`, so an EG4 re-scrape must not touch the retailer Signature
 *   Solar wrote.
 *
 *   Key present but null — the source page did not state the value. That is
 *   also not an opinion, so it never clears a value that is already there.
 *   scrape-eg4.ts emits `price_usd: null` because EG4's own site lists no
 *   price, and scrape-signaturesolar.ts fills that price in from the reseller;
 *   before this rule existed, every EG4 re-scrape wiped the affiliate price off
 *   all three EG4 rows. A value that genuinely needs clearing is an admin's
 *   call, not a scraper's.
 *
 * A null that FILLS a previously empty field is a real change and does show up.
 */
export function diffScrapedFields(existing: ScrapedRecord, patch: ScrapedRecord): FieldChange[] {
  const changes: FieldChange[] = []
  for (const field of SCRAPED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(patch, field)) continue
    const to = normalizeFieldValue(field, patch[field])
    const from = normalizeFieldValue(field, existing[field])
    if (to === from) continue
    if (to === null) continue // silence is not a correction — see above
    changes.push({ field, from, to })
  }
  return changes
}

/** Splits a diff into the two jsonb columns battery_model_revisions stores. */
export function proposalFrom(changes: FieldChange[]): {
  proposed: Record<string, string | number | null>
  previous: Record<string, string | number | null>
} {
  const proposed: Record<string, string | number | null> = {}
  const previous: Record<string, string | number | null> = {}
  for (const change of changes) {
    proposed[change.field] = change.to
    previous[change.field] = change.from
  }
  return { proposed, previous }
}

/**
 * The write payload for a revision that a human has approved. Drops every key
 * that isn't a scraped field, so is_published, id and anything else that found
 * its way into the jsonb cannot ride along into the update.
 */
export function pickScrapedFields(proposed: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const field of SCRAPED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(proposed, field)) {
      patch[field] = normalizeFieldValue(field, proposed[field])
    }
  }
  return patch
}

/**
 * Whether two proposals ask for exactly the same thing.
 *
 * Used to stop a scheduled re-scrape from re-raising a change a reviewer has
 * already looked at and refused — the source page still says what it says, so
 * without this the same rejected proposal returns every week until the queue
 * is noise. Any DIFFERENT value proposes again; a rejection silences one
 * specific claim, not the field.
 *
 * An unrecognised key makes the two unequal, which fails toward proposing.
 */
export function sameProposal(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined,
): boolean {
  if (!a || !b) return false
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if (!SCRAPED_FIELD_SET.has(key)) return false
    const field = key as ScrapedField
    if (normalizeFieldValue(field, a[key]) !== normalizeFieldValue(field, b[key])) return false
  }
  return true
}

/**
 * The row as it would stand if the proposal were applied, so the automated
 * checks in battery-review.ts can be run against the CANDIDATE rather than
 * against the live values. A proposal that would push a published battery to
 * $32/kWh should say so before it is applied, not after.
 */
export function mergeProposal<T extends ScrapedRecord>(row: T, proposed: Record<string, unknown>): T {
  return { ...row, ...pickScrapedFields(proposed) } as T
}

/** Human-readable field names for the admin diff. */
export const FIELD_LABELS: Record<ScrapedField, string> = {
  brand: 'Brand',
  model: 'Model',
  sku: 'SKU',
  chemistry: 'Chemistry',
  voltage: 'Voltage',
  capacity_ah: 'Capacity (Ah)',
  capacity_kwh: 'Capacity (kWh)',
  dod_rated: 'Depth of discharge',
  price_usd: 'Price',
  source_url: 'Spec source',
  retailer: 'Retailer',
  retailer_url: 'Retailer link',
}

/** Display form for a diff cell. Null reads as an absence, not as "null". */
export function formatFieldValue(field: ScrapedField, value: unknown): string {
  const normalized = normalizeFieldValue(field, value)
  if (normalized === null) return '—'
  if (field === 'price_usd') return `$${normalized}`
  if (field === 'dod_rated') return `${normalized}%`
  if (field === 'voltage') return `${normalized}V`
  if (field === 'capacity_ah') return `${normalized}Ah`
  if (field === 'capacity_kwh') return `${normalized}kWh`
  return String(normalized)
}
