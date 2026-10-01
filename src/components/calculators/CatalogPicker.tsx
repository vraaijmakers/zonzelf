'use client'

import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import AffiliateDisclosure from '@/components/AffiliateDisclosure'
import { anyPaid, relFor } from '@/lib/affiliate'
import { formatAsOf } from '@/lib/battery-price'
import type { InverterOption, Offer, PanelOption } from '@/lib/catalog-picker'

// The product shelves on the inverter and strings steps. Selecting a card fills
// the datasheet fields below it; the buy and spec-sheet links sit BESIDE the
// select button, never inside it (a link inside a button is invalid and
// unreachable by keyboard). The disclosure is driven by anyPaid() over the
// same links the cards render — see src/lib/affiliate.ts for why those two
// must read one boolean.

const SHOWN_AT_FIRST = 6
const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

function OfferLine({ offer, noun }: { offer: Offer | null; noun: string }) {
  if (!offer) return <p className="text-xs text-zon-muted">No current shop price</p>
  return (
    <p className="text-xs text-zon-body">
      <span className="font-semibold text-zon-ink">{usd(offer.unitPrice)}</span>
      {offer.packQty > 1 ? ` per ${noun} as a pack of ${offer.packQty}` : ''}
      {offer.minOrderQty > 1 ? ` · minimum order ${offer.minOrderQty}` : ''}
      {' · '}{offer.link.retailer}
      {offer.asOf && <span className="text-zon-muted"> · as of {formatAsOf(offer.asOf)}</span>}
    </p>
  )
}

function Links({ offer, sourceUrl, label }: { offer: Offer | null; sourceUrl: string; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {offer && (
        <a
          href={offer.link.href}
          target="_blank"
          rel={relFor(offer.link)}
          data-umami-event="shop-click"
          data-umami-event-retailer={offer.link.retailer}
          data-umami-event-paid={String(offer.link.paid)}
          data-umami-event-model={label}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-zon-gold px-3 text-xs font-semibold text-zon-ink transition-colors hover:bg-zon-gold-deep"
        >
          <ShoppingCart className="h-3 w-3 shrink-0" aria-hidden="true" />
          Buy at {offer.link.retailer}
        </a>
      )}
      {/* The citation, never tagged: a spec sheet that earned a commission
          would stop being a citation. */}
      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-zon-gold-deep hover:underline">
        Manufacturer datasheet ↗
      </a>
    </div>
  )
}

function Shelf<T extends { id: string; offer: Offer | null }>({
  heading,
  options,
  loading,
  fromPresets,
  what,
  render,
}: {
  heading: string
  options: T[]
  loading: boolean
  fromPresets: boolean
  what: string
  render: (o: T) => React.ReactNode
}) {
  const [showAll, setShowAll] = useState(false)
  if (loading) return <p className="text-xs text-zon-muted">Loading the {what} we&apos;ve checked…</p>
  if (options.length === 0) return null
  const shown = showAll ? options : options.slice(0, SHOWN_AT_FIRST)
  const paid = anyPaid(options.map(o => o.offer?.link ?? null))

  return (
    <div className="rounded-lg bg-zon-rule-soft p-3">
      <p className="mb-2 text-xs font-medium text-zon-muted">{heading}</p>
      {paid && <AffiliateDisclosure what={what} />}
      <ul className="grid gap-2 sm:grid-cols-2">{shown.map(o => <li key={o.id}>{render(o)}</li>)}</ul>
      {options.length > SHOWN_AT_FIRST && (
        <button onClick={() => setShowAll(v => !v)} className="mt-2 text-xs text-zon-gold-deep hover:underline">
          {showAll ? 'Show fewer' : `Show all ${options.length}`}
        </button>
      )}
      {fromPresets && (
        <p className="mt-2 text-xs text-zon-muted">
          The product catalogue couldn&apos;t be loaded, so these are the units whose datasheets we read by hand — no shop prices.
        </p>
      )}
    </div>
  )
}

function cardClass(active: boolean) {
  return `h-full rounded-lg border bg-zon-paper p-2.5 space-y-2 ${active ? 'border-zon-gold ring-1 ring-zon-gold' : 'border-zon-rule'}`
}

const COVERS: Record<InverterOption['covers'], { text: string; className: string } | null> = {
  yes: { text: 'Covers your loads, with headroom', className: 'bg-zon-green-tint' },
  tight: { text: 'Covers your loads, but with no headroom', className: 'bg-zon-amber-tint' },
  no: { text: 'Too small for your loads', className: 'bg-zon-red-tint' },
  unknown: null,
}

export function InverterShelf({
  options, loading, fromPresets, activeId, onPick,
}: {
  options: InverterOption[]
  loading: boolean
  fromPresets: boolean
  activeId: string | null
  onPick: (o: InverterOption) => void
}) {
  return (
    <Shelf
      heading="Units whose datasheets we have checked — smallest that covers your loads first"
      what="inverters"
      options={options}
      loading={loading}
      fromPresets={fromPresets}
      render={o => {
        const active = o.id === activeId
        const badge = COVERS[o.covers]
        return (
          <div className={cardClass(active)}>
            <button onClick={() => onPick(o)} aria-pressed={active} className="block w-full text-left">
              <span className="block text-sm font-medium text-zon-ink">{o.spec.model}</span>
              <span className="block text-xs text-zon-muted">
                {o.spec.brand} · {(o.spec.acContinuousW / 1000).toLocaleString()} kW · {o.spec.dcSystemVoltage} V battery
                {o.spec.acSurgeW ? ` · ${(o.spec.acSurgeW / 1000).toLocaleString()} kW surge` : ''}
              </span>
              {badge && (
                <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] text-zon-ink ${badge.className}`}>{badge.text}</span>
              )}
              <span className="mt-1 block text-xs text-zon-gold-deep">{active ? '✓ Filled in below' : 'Use this unit'}</span>
            </button>
            <OfferLine offer={o.offer} noun="unit" />
            <Links offer={o.offer} sourceUrl={o.spec.sourceUrl} label={`${o.spec.brand} ${o.spec.model}`} />
          </div>
        )
      }}
    />
  )
}

export function PanelShelf({
  options, loading, fromPresets, activeId, onPick,
}: {
  options: PanelOption[]
  loading: boolean
  fromPresets: boolean
  activeId: string | null
  onPick: (o: PanelOption) => void
}) {
  return (
    <Shelf
      heading="Panels whose datasheets we have checked — lowest price per watt first"
      what="panels"
      options={options}
      loading={loading}
      fromPresets={fromPresets}
      render={o => {
        const active = o.id === activeId
        const size = o.lengthMm && o.widthMm
          ? `${(o.lengthMm / 1000).toFixed(2)} × ${(o.widthMm / 1000).toFixed(2)} m`
          : null
        return (
          <div className={cardClass(active)}>
            <button onClick={() => onPick(o)} aria-pressed={active} className="block w-full text-left">
              <span className="block text-sm font-medium text-zon-ink">{o.model}</span>
              <span className="block text-xs text-zon-muted">
                {o.brand} · {o.spec.wattsStc} W
                {o.dollarsPerWatt !== null ? ` · $${o.dollarsPerWatt.toFixed(2)}/W` : ''}
                {size ? ` · ${size}` : ''}
                {o.weightKg ? ` · ${o.weightKg} kg` : ''}
                {o.bifacial ? ' · bifacial' : ''}
              </span>
              <span className="mt-1 block text-xs text-zon-gold-deep">{active ? '✓ Filled in below' : 'Use this panel'}</span>
            </button>
            <OfferLine offer={o.offer} noun="panel" />
            <Links offer={o.offer} sourceUrl={o.sourceUrl} label={`${o.brand} ${o.model}`} />
          </div>
        )
      }}
    />
  )
}
