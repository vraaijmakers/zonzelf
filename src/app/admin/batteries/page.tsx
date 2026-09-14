import { createClient } from '@/lib/supabase/server'
import { reviewBatteryModel, worstSeverity, findLikelyDuplicates, type ReviewSeverity } from '@/lib/battery-review'
import { FIELD_LABELS, SCRAPED_FIELDS, formatFieldValue, mergeProposal } from '@/lib/battery-revision'
import BatteryReviewActions from '@/components/admin/BatteryReviewActions'
import BatteryRevisionActions from '@/components/admin/BatteryRevisionActions'

type BatteryModelRow = {
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
  retailer_url: string | null
  scraped_at: string
  is_published: boolean
}

type RevisionRow = {
  id: number
  battery_model_id: number
  proposed: Record<string, unknown>
  source: string
  scraped_at: string
}

const SEVERITY_RANK: Record<ReviewSeverity, number> = { fail: 0, warn: 1, ok: 2 }

const SEVERITY_DOT: Record<ReviewSeverity, string> = {
  fail: 'bg-red-500',
  warn: 'bg-amber-500',
  ok: 'bg-green-500',
}

const SEVERITY_TEXT: Record<ReviewSeverity, string> = {
  fail: 'text-red-700',
  warn: 'text-amber-700',
  ok: 'text-green-700',
}

export default async function AdminBatteriesPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('battery_models')
    .select('id, brand, model, sku, chemistry, voltage, capacity_ah, capacity_kwh, dod_rated, price_usd, source_url, retailer, retailer_url, scraped_at, is_published')
    .order('scraped_at', { ascending: true })

  // Changes a re-scrape wants to make to rows that are already live. These are
  // NOT applied to the table above — the whole point of the gate is that the
  // published values a visitor sees stay as a human left them until this queue
  // is worked. See supabase/migrations/20260909000001_battery_model_revisions.sql.
  const { data: revisionData, error: revisionsError } = await supabase
    .from('battery_model_revisions')
    .select('id, battery_model_id, proposed, source, scraped_at')
    .eq('status', 'pending')
    .order('scraped_at', { ascending: true })

  const rows = (data ?? []) as BatteryModelRow[]
  const duplicates = findLikelyDuplicates(rows)
  const byId = new Map(rows.map(row => [row.id, row]))

  const proposals = ((revisionData ?? []) as RevisionRow[])
    .map(revision => {
      const row = byId.get(revision.battery_model_id)
      if (!row) return null
      const changed = SCRAPED_FIELDS.filter(field =>
        Object.prototype.hasOwnProperty.call(revision.proposed, field))
      // Run the same automated checks against the row as it WOULD be, so a
      // proposal that would push a live battery to $32/kWh says so before it
      // is applied rather than after.
      const flags = reviewBatteryModel(mergeProposal(row, revision.proposed))
      return { revision, row, changed, flags }
    })
    .filter(entry => entry !== null)

  const pending = rows
    .filter(r => !r.is_published)
    .map(row => ({ row, flags: reviewBatteryModel(row) }))
    .sort((a, b) => SEVERITY_RANK[worstSeverity(a.flags)] - SEVERITY_RANK[worstSeverity(b.flags)])

  const published = rows.filter(r => r.is_published)
  const proposedFor = new Set(proposals.map(p => p.row.id))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Battery Review</h1>
      <p className="text-sm text-gray-600 mb-2 max-w-2xl">
        Scraped rows land here unpublished — nothing shows up on the public battery calculator
        until it&apos;s approved below. A re-scrape never edits a row that is already live either:
        it proposes the change and waits for you here.
      </p>
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-6 max-w-2xl text-sm text-gray-700">
        <p className="mb-2">
          The checks below catch the mistakes a scraper tends to make — a field grabbed from
          the wrong part of the page, a &quot;2-pack&quot; listing mistaken for a single battery,
          a price that&apos;s off by an order of magnitude. They don&apos;t verify the
          battery&apos;s actual specs are correct.
        </p>
        <p>
          <strong>If everything is green:</strong> open the source link, spot-check that the
          capacity, voltage and price match what&apos;s on the page, and approve. <strong>Any
          amber or red flag</strong> means look closer before approving — the message explains
          what looked off and why.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">Couldn&apos;t load battery models: {error.message}</p>}
      {revisionsError && (
        <p className="text-sm text-red-600 mb-4">
          Couldn&apos;t load proposed changes: {revisionsError.message}. A re-scrape may be waiting on
          review that isn&apos;t shown here.
        </p>
      )}

      {proposals.length > 0 && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
            Proposed changes to live rows ({proposals.length})
          </h2>
          <p className="text-sm text-gray-600 mb-3 max-w-2xl">
            A scraper found these batteries listed differently than the version currently on the
            battery calculator. <strong>Nothing has changed yet.</strong> Open the source link, check
            which version the page actually says today, then apply the change or keep what&apos;s live.
          </p>

          <div className="space-y-3 mb-10">
            {proposals.map(({ revision, row, changed, flags }) => {
              const severity = worstSeverity(flags)
              return (
                <div key={revision.id} className="bg-white border border-amber-200 rounded-lg px-4 py-3">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{row.brand} {row.model}</span>
                        <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
                          live
                        </span>
                        <span className="text-xs text-gray-400">
                          from {revision.source}, {new Date(revision.scraped_at).toLocaleDateString()}
                        </span>
                      </div>
                      <a
                        href={row.retailer_url ?? row.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline break-all"
                      >
                        {row.retailer_url ?? row.source_url}
                      </a>
                    </div>
                    <BatteryRevisionActions revisionId={revision.id} hasFailingCheck={severity === 'fail'} />
                  </div>

                  <table className="text-xs mb-2">
                    <thead>
                      <tr className="text-gray-400">
                        <th className="text-left font-normal pr-6 pb-0.5">Field</th>
                        <th className="text-left font-normal pr-6 pb-0.5">Live now</th>
                        <th className="text-left font-normal pb-0.5">Scraper found</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changed.map(field => (
                        <tr key={field}>
                          <td className="pr-6 text-gray-600 align-top">{FIELD_LABELS[field]}</td>
                          <td className="pr-6 text-gray-500 align-top line-through">
                            {formatFieldValue(field, row[field])}
                          </td>
                          <td className="font-medium text-gray-900 align-top">
                            {formatFieldValue(field, revision.proposed[field])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {flags.length === 0 ? (
                    <p className="text-xs text-green-700">✓ The proposed values pass every automated check.</p>
                  ) : (
                    <ul className="space-y-1">
                      {flags.map(flag => (
                        <li key={flag.code} className="flex items-start gap-2 text-xs">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${SEVERITY_DOT[flag.severity]}`} />
                          <span className={SEVERITY_TEXT[flag.severity]}>{flag.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Pending review ({pending.length})
      </h2>

      {pending.length === 0 && !error && (
        <p className="text-sm text-gray-500 mb-8">Nothing waiting on review right now.</p>
      )}

      <div className="space-y-3 mb-10">
        {pending.map(({ row, flags }) => {
          const dupes = duplicates.get(row.id)
          const perKwh = row.price_usd != null ? row.price_usd / row.capacity_kwh : null
          return (
            <div key={row.id} className="bg-white border rounded-lg px-4 py-3">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{row.brand} {row.model}</span>
                    <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                      {row.chemistry}
                    </span>
                    {row.sku && <span className="text-xs text-gray-400">SKU {row.sku}</span>}
                  </div>
                  <a
                    href={row.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline break-all"
                  >
                    {row.source_url}
                  </a>
                </div>
                <BatteryReviewActions id={row.id} isPublished={row.is_published} />
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600 mb-2">
                <span>{row.voltage}V</span>
                <span>{row.capacity_ah}Ah</span>
                <span>{row.capacity_kwh}kWh</span>
                <span>{row.dod_rated != null ? `${row.dod_rated}% DoD` : 'DoD not published'}</span>
                <span>{row.price_usd != null ? `$${row.price_usd}${perKwh ? ` ($${perKwh.toFixed(0)}/kWh)` : ''}` : 'No price'}</span>
                <span>scraped {new Date(row.scraped_at).toLocaleDateString()}</span>
              </div>

              {dupes && dupes.length > 0 && (
                <p className="text-xs text-amber-700 mb-1">
                  ⚠ Looks similar to {dupes.length} other row{dupes.length > 1 ? 's' : ''} already in the
                  table ({dupes.map(d => `${d.brand} ${d.model}`).join(', ')}) — check this isn&apos;t
                  the same battery listed twice.
                </p>
              )}

              {flags.length === 0 ? (
                <p className="text-xs text-green-700">✓ All automated checks passed.</p>
              ) : (
                <ul className="space-y-1">
                  {flags.map(flag => (
                    <li key={flag.code} className="flex items-start gap-2 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${SEVERITY_DOT[flag.severity]}`} />
                      <span className={SEVERITY_TEXT[flag.severity]}>{flag.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Published ({published.length})
      </h2>
      <div className="space-y-2">
        {published.map(row => (
          <div key={row.id} className="bg-white border rounded-lg px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="text-sm min-w-0">
              <span className="font-medium">{row.brand} {row.model}</span>
              <span className="text-gray-400 ml-2">{row.voltage}V · {row.capacity_ah}Ah · {row.chemistry}</span>
              {proposedFor.has(row.id) && (
                <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 ml-2 align-middle">
                  change proposed
                </span>
              )}
            </div>
            <BatteryReviewActions id={row.id} isPublished={row.is_published} />
          </div>
        ))}
      </div>
    </div>
  )
}
