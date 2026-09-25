/**
 * The "is this the same battery?" question, answered on the card instead of in
 * the reviewer's head.
 *
 * Before this, a pending row said only "Looks similar to 1 other row already in
 * the table (EG4 WallMount 280Ah All Weather Battery)". Checking that meant
 * scrolling to the Published list, which shows three fields, then opening two
 * vendor pages in other tabs and comparing eleven numbers by eye. So the
 * genuine duplicate the 2026-09-21 run inserted and the false positive sitting
 * next to it looked exactly alike.
 *
 * Everything needed to tell them apart is already in the table, so it is put
 * side by side here: both photos, every field, and which of them disagree.
 */

import { FIELD_LABELS, formatFieldValue, normalizeFieldValue, type ScrapedField } from '@/lib/battery-revision'
import { relateDuplicate, type ReviewSeverity } from '@/lib/battery-review'
import ProductPhoto from './ProductPhoto'

export type ComparableBattery = {
  id: number
  brand: string
  model: string
  sku: string | null
  chemistry: string
  voltage: number
  capacity_ah: number
  capacity_kwh: number
  dod_rated: number | null
  price_usd: number | null
  source_url: string
  retailer: string | null
  image_url: string | null
  is_published: boolean
}

// Ordered for reading, not for the schema: identity first, then the numbers a
// duplicate would share, then where each row came from — which is usually the
// only field that differs when two rows are the same battery.
const COMPARED_FIELDS: ScrapedField[] = [
  'model',
  'sku',
  'chemistry',
  'voltage',
  'capacity_ah',
  'capacity_kwh',
  'dod_rated',
  'price_usd',
  'retailer',
  'source_url',
]

// The state tokens (--zon-red/amber/green/blue) are saturated at mid
// lightness: right for a border or a dot, too pale against their own tint to
// set 12px text in — --zon-red on --zon-red-tint measures about 3.9:1, below
// the 4.5:1 a warning an admin has to read should clear. So the state is
// carried by the border and the dot, and the sentence itself is set in ink.
// A --zon-*-deep step would let the text carry it too; that is a design
// decision to raise, not a shade to invent here.
const SEVERITY_BOX: Record<ReviewSeverity, string> = {
  fail: 'bg-zon-red-tint border-zon-red',
  warn: 'bg-zon-amber-tint border-zon-amber',
  ok: 'bg-zon-blue-tint border-zon-blue',
}

const SEVERITY_DOT: Record<ReviewSeverity, string> = {
  fail: 'bg-zon-red',
  warn: 'bg-zon-amber',
  ok: 'bg-zon-blue',
}

/** Long vendor URLs wreck a two-column table; the host and the last path segment identify a page. */
function shortUrl(value: string): string {
  try {
    const url = new URL(value)
    const last = url.pathname.replace(/\/$/, '').split('/').filter(Boolean).pop()
    return last ? `${url.hostname.replace(/^www\./, '')}/…/${decodeURIComponent(last)}` : url.hostname
  } catch {
    return value
  }
}

function cell(row: ComparableBattery, field: ScrapedField) {
  const raw = row[field as keyof ComparableBattery]
  if (field === 'source_url') {
    return (
      <a
        href={row.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-zon-blue hover:underline break-all"
      >
        {shortUrl(row.source_url)}
      </a>
    )
  }
  return formatFieldValue(field, raw)
}

function Column({ row, label }: { row: ComparableBattery; label: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <ProductPhoto src={row.image_url} alt={`${row.brand} ${row.model}`} />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-zon-muted mb-0.5">{label}</div>
        <div className="text-xs font-medium text-zon-ink break-words">{row.model}</div>
      </div>
    </div>
  )
}

export default function BatteryComparison({
  candidate,
  others,
}: {
  candidate: ComparableBattery
  others: ComparableBattery[]
}) {
  return (
    <div className="space-y-3 mb-2">
      {others.map(other => {
        const relation = relateDuplicate(candidate, other)
        return (
          <div key={other.id} className={`rounded-lg border-l-4 border-y border-r border-y-zon-rule border-r-zon-rule px-3 py-2.5 ${SEVERITY_BOX[relation.severity]}`}>
            <p className="flex items-start gap-2 text-xs text-zon-ink mb-3">
              <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${SEVERITY_DOT[relation.severity]}`} />
              <span>{relation.message}</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
              <Column row={candidate} label="This row" />
              <Column
                row={other}
                label={other.is_published ? `#${other.id} · already live` : `#${other.id} · also pending`}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <tbody>
                  {COMPARED_FIELDS.map(field => {
                    const same =
                      normalizeFieldValue(field, candidate[field as keyof ComparableBattery]) ===
                      normalizeFieldValue(field, other[field as keyof ComparableBattery])
                    return (
                      <tr key={field} className="align-top border-t border-zon-rule-soft">
                        <td className="py-1 pr-2 w-4 text-center text-zon-muted" aria-hidden="true">
                          {same ? '=' : '≠'}
                        </td>
                        <td className="py-1 pr-4 text-zon-muted whitespace-nowrap">
                          {FIELD_LABELS[field]}
                          <span className="sr-only">{same ? ' — same on both rows' : ' — differs'}</span>
                        </td>
                        <td className={`py-1 pr-4 w-1/2 ${same ? 'text-zon-muted' : 'text-zon-ink font-medium'}`}>
                          {cell(candidate, field)}
                        </td>
                        <td className={`py-1 w-1/2 ${same ? 'text-zon-muted' : 'text-zon-ink font-medium'}`}>
                          {cell(other, field)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
