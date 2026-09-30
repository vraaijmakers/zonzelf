import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProductPhoto from '@/components/admin/ProductPhoto'
import {
  STATUS_LABEL, catalogStatus, cheapestUnitPrice, dollarsPerWatt,
  type CatalogStatus, type ListingRow,
} from '@/lib/catalog-view'

type ModelRow = {
  id: number
  category: 'panel' | 'inverter'
  brand: string
  model: string
  mpn: string | null
  image_url: string | null
  is_published: boolean
  is_hidden: boolean
  component_listings: ListingRow[]
  panel_specs: { watts_stc: number | null; spec_source: string; verified_at: string | null } | null
  inverter_specs: { ac_continuous_w: number | null; spec_source: string; verified_at: string | null } | null
}

// Work order: what needs a human first. Hidden last, and out of "all".
const TABS: { key: CatalogStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'verified', label: 'Ready to publish' },
  { key: 'candidate', label: 'CEC candidates' },
  { key: 'unspecced', label: 'No specs yet' },
  { key: 'published', label: 'Published' },
  { key: 'hidden', label: 'Hidden' },
]

const STATUS_CHIP: Record<CatalogStatus, string> = {
  published: 'bg-zon-green-tint text-zon-ink',
  verified: 'bg-zon-blue-tint text-zon-ink',
  candidate: 'bg-zon-gold-tint text-zon-ink',
  unspecced: 'bg-zon-rule-soft text-zon-muted',
  hidden: 'bg-zon-rule-soft text-zon-muted line-through',
}

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default async function AdminCatalogPage(props: PageProps<'/admin/catalog'>) {
  const params = await props.searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
  const tab = (one(params.status) || 'all') as CatalogStatus | 'all'
  const category = one(params.category)
  const q = one(params.q).trim().toLowerCase()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('component_models')
    .select(`id, category, brand, model, mpn, image_url, is_published, is_hidden,
      component_listings (id, retailer, url, title, pack_qty, min_order_qty, price_usd, price_scraped_at, held_price_usd, held_at),
      panel_specs (watts_stc, spec_source, verified_at),
      inverter_specs (ac_continuous_w, spec_source, verified_at)`)
    .order('brand')
    .order('model')

  const now = new Date()
  const all = ((data ?? []) as unknown as ModelRow[]).map(m => {
    const spec = m.category === 'panel' ? m.panel_specs : m.inverter_specs
    const cheapest = cheapestUnitPrice(m.component_listings, now)
    return {
      m,
      status: catalogStatus(m, spec),
      cheapest,
      perWatt: m.category === 'panel' ? dollarsPerWatt(cheapest?.price ?? null, m.panel_specs?.watts_stc ?? null) : null,
      held: m.component_listings.filter(l => l.held_price_usd !== null).length,
    }
  })

  const inCategory = all.filter(r => !category || r.m.category === category)
  const counts = new Map<string, number>()
  for (const r of inCategory) counts.set(r.status, (counts.get(r.status) ?? 0) + 1)
  counts.set('all', inCategory.filter(r => r.status !== 'hidden').length)

  const rows = inCategory
    .filter(r => (tab === 'all' ? r.status !== 'hidden' : r.status === tab))
    .filter(r => !q || `${r.m.brand} ${r.m.model} ${r.m.mpn ?? ''}`.toLowerCase().includes(q))
  const heldTotal = all.reduce((n, r) => n + r.held, 0)

  const href = (over: Record<string, string>) => {
    const p = new URLSearchParams({ ...(tab !== 'all' && { status: tab }), ...(category && { category }), ...(q && { q }), ...over })
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k)
    const s = p.toString()
    return `/admin/catalog${s ? `?${s}` : ''}`
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Component Catalogue</h1>
      <p className="text-sm text-zon-body mb-4 max-w-2xl">
        Panels and inverters the weekly scrape found. Nothing here reaches a visitor until you
        open a model, check its specs against the <strong>manufacturer&apos;s datasheet</strong>,
        verify them, and publish. The database refuses to publish anything unverified.
      </p>

      {heldTotal > 0 && (
        <p className="text-sm bg-zon-amber-tint border border-zon-amber/40 rounded-lg px-4 py-2 mb-4 max-w-2xl">
          {heldTotal} price{heldTotal === 1 ? '' : 's'} moved more than 30% on a published model and
          {heldTotal === 1 ? ' is' : ' are'} held for you — look for the &ldquo;held price&rdquo; marker below.
        </p>
      )}

      {error && <p className="text-sm text-zon-red mb-4">Couldn&apos;t load the catalogue: {error.message}</p>}

      <form action="/admin/catalog" className="flex flex-wrap items-center gap-2 mb-3">
        {tab !== 'all' && <input type="hidden" name="status" value={tab} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Brand, model or part number"
          className="appearance-none text-sm border border-zon-rule rounded px-3 py-1.5 bg-zon-paper w-64"
        />
        <select
          name="category"
          defaultValue={category}
          className="appearance-none text-sm border border-zon-rule rounded px-3 py-1.5 bg-zon-paper"
        >
          <option value="">Panels and inverters</option>
          <option value="panel">Panels</option>
          <option value="inverter">Inverters</option>
        </select>
        <button className="text-sm border border-zon-rule rounded px-3 py-1.5 bg-zon-paper hover:bg-zon-rule-soft">
          Filter
        </button>
      </form>

      <nav className="flex flex-wrap gap-1 mb-4 text-sm">
        {TABS.map(t => (
          <Link
            key={t.key}
            href={href({ status: t.key === 'all' ? '' : t.key })}
            className={`rounded px-3 py-1 border ${tab === t.key ? 'border-zon-ink bg-zon-ink text-zon-paper' : 'border-zon-rule bg-zon-paper hover:bg-zon-rule-soft'}`}
          >
            {t.label} <span className="opacity-70">{counts.get(t.key) ?? 0}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 && !error && <p className="text-sm text-zon-muted">Nothing matches.</p>}

      <ul className="bg-zon-paper border border-zon-rule rounded-lg divide-y divide-zon-rule-soft">
        {rows.map(({ m, status, cheapest, perWatt, held }) => (
          <li key={m.id}>
            <Link href={`/admin/catalog/${m.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-zon-cream">
              <ProductPhoto src={m.image_url} alt={`${m.brand} ${m.model}`} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-zon-muted">#{m.id}</span>
                  <span className="font-medium text-sm text-zon-ink">{m.brand} {m.model}</span>
                  <span className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 ${STATUS_CHIP[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                  {held > 0 && (
                    <span className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-zon-amber-tint text-zon-ink">
                      held price
                    </span>
                  )}
                </div>
                <div className="text-xs text-zon-muted">
                  {m.category}{m.mpn ? ` · ${m.mpn}` : ''} · {m.component_listings.length} listing{m.component_listings.length === 1 ? '' : 's'}
                </div>
              </div>
              <div className="text-right text-sm shrink-0">
                {cheapest ? (
                  <>
                    <div className="text-zon-ink">{usd(cheapest.price)}<span className="text-xs text-zon-muted"> /unit</span></div>
                    {perWatt !== null && <div className="text-xs text-zon-muted">${perWatt.toFixed(2)}/W</div>}
                  </>
                ) : (
                  <span className="text-xs text-zon-muted">no current price</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
