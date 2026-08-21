import { createClient } from '@/lib/supabase/server'
import { reviewBatteryModel, worstSeverity, findLikelyDuplicates, type ReviewSeverity } from '@/lib/battery-review'
import BatteryReviewActions from '@/components/admin/BatteryReviewActions'

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
  scraped_at: string
  is_published: boolean
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
    .select('id, brand, model, sku, chemistry, voltage, capacity_ah, capacity_kwh, dod_rated, price_usd, source_url, scraped_at, is_published')
    .order('scraped_at', { ascending: true })

  const rows = (data ?? []) as BatteryModelRow[]
  const duplicates = findLikelyDuplicates(rows)

  const pending = rows
    .filter(r => !r.is_published)
    .map(row => ({ row, flags: reviewBatteryModel(row) }))
    .sort((a, b) => SEVERITY_RANK[worstSeverity(a.flags)] - SEVERITY_RANK[worstSeverity(b.flags)])

  const published = rows.filter(r => r.is_published)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Battery Review</h1>
      <p className="text-sm text-gray-600 mb-2 max-w-2xl">
        Scraped rows land here unpublished — nothing shows up on the public battery calculator
        until it&apos;s approved below.
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
            </div>
            <BatteryReviewActions id={row.id} isPublished={row.is_published} />
          </div>
        ))}
      </div>
    </div>
  )
}
