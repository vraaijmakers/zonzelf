import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProductPhoto from '@/components/admin/ProductPhoto'
import CatalogVerifyForm from '@/components/admin/CatalogVerifyForm'
import CatalogModelActions, { HeldPriceActions } from '@/components/admin/CatalogModelActions'
import { mergeInto } from '../actions'
import { priceDisplay, formatAsOf } from '@/lib/battery-price'
import {
  BATTERY_FIELDS, CEC_EXPLAINED, INVERTER_FIELDS, PANEL_FIELDS, STATUS_HELP, STATUS_LABEL, catalogStatus, cecDisagreements,
  dollarsPerKwh, dollarsPerWatt, unitPrice,
  type BatterySpecRow, type InverterSpecRow, type ListingRow, type PanelSpecRow,
} from '@/lib/catalog-view'

type Model = {
  id: number
  category: 'panel' | 'inverter' | 'battery'
  brand: string
  model: string
  mpn: string | null
  spec_sheet_url: string | null
  image_url: string | null
  is_published: boolean
  is_hidden: boolean
  hidden_reason: string | null
  scraped_at: string
  component_listings: ListingRow[]
  panel_specs: PanelSpecRow | null
  inverter_specs: InverterSpecRow | null
  battery_specs: BatterySpecRow | null
  spec_disagreement: Record<string, { verified: unknown; scraped: unknown }> | null
  spec_disagreement_at: string | null
}

type CecRow = {
  manufacturer: string
  model_number: string
  pmax_w: number | null
  voc_v: number | null
  vmp_v: number | null
  isc_a: number | null
  imp_a: number | null
  beta_voc_pct: number | null
  gamma_pmax_pct: number | null
  listed_on: string | null
}

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const PHYSICAL = ['length_mm', 'width_mm', 'thickness_mm', 'weight_kg', 'cell_type', 'bifacial'] as const

export default async function CatalogModelPage(props: PageProps<'/admin/catalog/[id]'>) {
  const { id: raw } = await props.params
  const id = Number(raw)
  if (!Number.isInteger(id)) notFound()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('component_models')
    .select(`*,
      component_listings (id, retailer, url, title, pack_qty, min_order_qty, price_usd, price_scraped_at, held_price_usd, held_at),
      panel_specs (*),
      inverter_specs (*),
      battery_specs (*)`)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) notFound()
  const m = data as unknown as Model

  const spec = m.category === 'panel' ? m.panel_specs : m.category === 'battery' ? m.battery_specs : m.inverter_specs
  const status = catalogStatus(m, spec)
  const verified = Boolean(spec?.verified_at)
  const watts = m.panel_specs?.watts_stc ?? null

  // The CEC row this panel's candidate electricals came from, as reference.
  let cec: CecRow | null = null
  if (m.panel_specs?.cec_manufacturer && m.panel_specs.cec_model_number) {
    const { data: cecData } = await supabase
      .from('cec_pv_modules')
      .select('manufacturer, model_number, pmax_w, voc_v, vmp_v, isc_a, imp_a, beta_voc_pct, gamma_pmax_pct, listed_on')
      .eq('manufacturer', m.panel_specs.cec_manufacturer)
      .eq('model_number', m.panel_specs.cec_model_number)
      .maybeSingle()
    cec = (cecData as CecRow | null) ?? null
  }

  // Pre-fill rule — see CatalogVerifyForm. Verified figures and physical
  // fields only; never CEC or retailer electricals.
  const initial: Record<string, string | number | boolean | null> = {}
  if (spec) {
    const specRecord = spec as unknown as Record<string, string | number | boolean | null>
    if (verified) Object.assign(initial, specRecord)
    else if (m.category === 'panel') for (const k of PHYSICAL) initial[k] = specRecord[k]
    // Batteries pre-fill in full. Their figures are CAPACITY, not protection
    // (CLAUDE.md's split), and were read off the manufacturer's own page —
    // exactly what /admin/batteries asked a reviewer to spot-check. Not the
    // CEC-on-a-panel case the rule above exists for.
    else if (m.category === 'battery') Object.assign(initial, specRecord)
  }

  const gaps = verified && m.panel_specs && cec ? cecDisagreements(m.panel_specs, cec) : []
  const fields = m.category === 'panel' ? PANEL_FIELDS : m.category === 'battery' ? BATTERY_FIELDS : INVERTER_FIELDS
  const kwh = m.battery_specs?.capacity_kwh ?? null
  const perLabel = m.category === 'panel' ? '$/W' : m.category === 'battery' ? '$/kWh' : null
  const now = new Date()

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/catalog" className="text-xs text-zon-blue hover:underline">← Catalogue</Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div className="flex items-start gap-3 min-w-0">
            <ProductPhoto src={m.image_url} alt={`${m.brand} ${m.model}`} />
            <div className="min-w-0">
              <p className="text-xs text-zon-muted">
                <span className="font-mono">#{m.id}</span> · {m.category} · {STATUS_LABEL[status]}
              </p>
              <h1 className="text-xl font-bold text-zon-ink">{m.brand} {m.model}</h1>
              <p className="text-xs text-zon-muted">
                {m.mpn ? `Part number ${m.mpn} · ` : 'No part number · '}
                last seen by the scraper {new Date(m.scraped_at).toLocaleDateString()}
              </p>
              {m.spec_sheet_url && (
                <a href={m.spec_sheet_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zon-blue hover:underline break-all">
                  Spec sheet ↗
                </a>
              )}
              {m.is_hidden && m.hidden_reason && (
                <p className="text-xs text-zon-muted mt-1">Hidden: {m.hidden_reason}</p>
              )}
            </div>
          </div>
          <CatalogModelActions id={m.id} isPublished={m.is_published} isHidden={m.is_hidden} isVerified={verified} />
        </div>
      </div>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zon-muted mb-2">
          Where it is sold ({m.component_listings.length})
        </h2>
        {m.component_listings.length === 0 ? (
          <p className="text-sm text-zon-muted">
            No shop listings yet — publishing it gives the calculators the specs, but no buy link.
          </p>
        ) : (
          <table className="w-full text-sm bg-zon-paper border border-zon-rule rounded-lg">
            <thead className="text-xs text-zon-muted">
              <tr>
                <th className="text-left font-normal px-3 py-2">Listing</th>
                <th className="text-right font-normal px-3 py-2">Price</th>
                <th className="text-right font-normal px-3 py-2">Per unit</th>
                {perLabel && <th className="text-right font-normal px-3 py-2">{perLabel}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zon-rule-soft">
              {m.component_listings.map(l => {
                const unit = unitPrice(l)
                const shown = priceDisplay(l.price_usd, l.price_scraped_at, now)
                const per = m.category === 'panel' ? dollarsPerWatt(unit, watts) : m.category === 'battery' ? dollarsPerKwh(unit, kwh) : null
                return (
                  <tr key={l.id} className="align-top">
                    <td className="px-3 py-2">
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-zon-blue hover:underline">
                        {l.retailer}
                      </a>
                      <span className="text-xs text-zon-muted">
                        {l.pack_qty > 1 ? ` · pack of ${l.pack_qty}` : ' · single'}
                        {l.min_order_qty > 1 ? ` · min. order ${l.min_order_qty}` : ''}
                      </span>
                      <div className="text-xs text-zon-muted">{l.title}</div>
                      {l.held_price_usd !== null && (
                        <div className="mt-1 text-xs bg-zon-amber-tint rounded px-2 py-1 inline-flex flex-wrap items-center gap-2">
                          Held: the shop now says {usd(l.held_price_usd)}
                          {l.held_at ? ` (${new Date(l.held_at).toLocaleDateString()})` : ''} — more than 30% from the live price.
                          <HeldPriceActions listingId={l.id} />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {l.price_usd !== null ? usd(l.price_usd) : '—'}
                      <div className="text-xs text-zon-muted">
                        {shown.kind === 'dated' && `as of ${formatAsOf(new Date(l.price_scraped_at!))}`}
                        {shown.kind === 'stale' && `stale — ${shown.ageDays} days old`}
                        {shown.kind === 'undated' && 'undated'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">{unit !== null ? usd(unit) : '—'}</td>
                    {perLabel && (
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {per !== null ? `$${per.toFixed(m.category === 'panel' ? 2 : 0)}` : '—'}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zon-muted mb-2">Specs</h2>
        {m.spec_disagreement && (
          <div className="text-sm bg-zon-red-tint border border-zon-red/30 rounded-lg px-4 py-3 mb-3 max-w-2xl">
            <p className="font-medium text-zon-ink">
              The source changed{m.spec_disagreement_at ? ` (seen ${new Date(m.spec_disagreement_at).toLocaleDateString()})` : ''}:
              the manufacturer&apos;s page no longer matches the verified specs.
            </p>
            <ul className="list-disc pl-5 text-xs mt-1">
              {Object.entries(m.spec_disagreement).map(([field, d]) => (
                <li key={field}>{field}: verified {String(d.verified)}, page now says {String(d.scraped)}</li>
              ))}
            </ul>
            <p className="text-xs mt-1">
              Visitors still see the verified figures. Check the page:
              {m.is_published ? ' if it is right, unpublish, correct the figures and verify again.' : ' if it is right, correct the figures below and verify again.'}
              {' '}Re-verifying clears this notice.
            </p>
          </div>
        )}
        <div className="text-sm text-zon-body mb-3 bg-zon-blue-tint border border-zon-blue/20 rounded-lg px-4 py-3 max-w-2xl space-y-1">
          <p>
            <span className="font-medium text-zon-ink">{STATUS_LABEL[status]}.</span>{' '}
            {STATUS_HELP[status].meaning}
            {verified && ` Verified on ${new Date(spec!.verified_at!).toLocaleDateString()}.`}
          </p>
          <p><span className="font-medium text-zon-ink">What to do:</span> {STATUS_HELP[status].action}</p>
        </div>

        {gaps.length > 0 && (
          <div className="text-xs bg-zon-amber-tint border border-zon-amber/40 rounded px-3 py-2 mb-3 max-w-2xl">
            <p className="font-medium text-zon-ink">The verified datasheet figures and the CEC list disagree:</p>
            <ul className="list-disc pl-4">{gaps.map(g => <li key={g}>{g}</li>)}</ul>
            <p className="mt-1">Not an error by itself — worth one more look at which row of the sheet was read.</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
          {m.is_published ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {fields.map(f => (
                <div key={f.name} className="contents">
                  <dt className="text-zon-muted">{f.label}</dt>
                  <dd className="text-zon-ink">{String((spec as unknown as Record<string, unknown>)?.[f.name] ?? '—')}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <CatalogVerifyForm id={m.id} category={m.category} initial={initial} datasheetUrl={m.spec_sheet_url} />
          )}

          {cec && (
            <aside className="text-xs bg-zon-paper border border-zon-rule rounded-lg px-3 py-2 self-start">
              <p className="font-medium text-zon-ink mb-1">CEC list — reference only</p>
              <p className="text-zon-muted mb-2">{CEC_EXPLAINED} Compare, don&apos;t copy: the datasheet wins where they differ.</p>
              <p className="text-zon-muted mb-2">{cec.manufacturer} {cec.model_number}{cec.listed_on ? `, listed ${cec.listed_on}` : ''}</p>
              <dl className="grid grid-cols-2 gap-y-0.5">
                <dt className="text-zon-muted">Pmax</dt><dd>{cec.pmax_w ?? '—'} W</dd>
                <dt className="text-zon-muted">Voc</dt><dd>{cec.voc_v ?? '—'} V</dd>
                <dt className="text-zon-muted">Vmp</dt><dd>{cec.vmp_v ?? '—'} V</dd>
                <dt className="text-zon-muted">Isc</dt><dd>{cec.isc_a ?? '—'} A</dd>
                <dt className="text-zon-muted">Imp</dt><dd>{cec.imp_a ?? '—'} A</dd>
                <dt className="text-zon-muted">Voc coeff.</dt><dd>{cec.beta_voc_pct ?? '—'} %/°C</dd>
                <dt className="text-zon-muted">Pmax coeff.</dt><dd>{cec.gamma_pmax_pct ?? '—'} %/°C</dd>
              </dl>
            </aside>
          )}
        </div>
      </section>

      {!m.is_published && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zon-muted mb-2">Duplicate of another model?</h2>
          <form action={mergeInto.bind(null, m.id)} className="flex items-center gap-2 text-sm">
            <span className="text-zon-body">Move this model&apos;s listings to #</span>
            <input
              name="target_id"
              inputMode="numeric"
              required
              className="appearance-none w-20 border border-zon-rule rounded px-2 py-1 bg-zon-paper"
            />
            <button className="text-xs border border-zon-rule rounded px-3 py-1.5 bg-zon-paper hover:bg-zon-rule-soft">
              Merge and delete this one
            </button>
          </form>
          <p className="text-xs text-zon-muted mt-1">
            Safe against the weekly scrape: listings are matched by the shop&apos;s product id, so they keep landing on the surviving model.
          </p>
        </section>
      )}
    </div>
  )
}
