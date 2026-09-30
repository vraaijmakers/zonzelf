'use client'

import { useState, useTransition } from 'react'
import { resolveHeldPrice, setHidden, setPublished, unverifySpecs } from '@/app/admin/catalog/actions'

const quiet = 'text-xs border border-zon-rule rounded px-3 py-1.5 bg-zon-paper hover:bg-zon-rule-soft disabled:opacity-50'

/** Publish / unpublish / hide / un-verify for one model. Errors are shown, not swallowed. */
export default function CatalogModelActions({
  id,
  isPublished,
  isHidden,
  isVerified,
}: {
  id: number
  isPublished: boolean
  isHidden: boolean
  isVerified: boolean
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => Promise<void>) => start(async () => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    }
  })

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {isHidden ? (
          <button disabled={pending} className={quiet} onClick={() => run(() => setHidden(id, false))}>
            Unhide
          </button>
        ) : isPublished ? (
          <button disabled={pending} className={quiet} onClick={() => run(() => setPublished(id, false))}>
            Unpublish
          </button>
        ) : (
          <>
            <button
              disabled={pending || !isVerified}
              title={isVerified ? undefined : 'Verify the specs from the datasheet first'}
              className="text-xs bg-zon-gold hover:bg-zon-gold-deep text-zon-ink rounded px-3 py-1.5 disabled:opacity-40"
              onClick={() => run(() => setPublished(id, true))}
            >
              Publish
            </button>
            {isVerified && (
              <button disabled={pending} className={quiet} onClick={() => run(() => unverifySpecs(id))}>
                Un-verify
              </button>
            )}
            <button
              disabled={pending}
              className={quiet}
              onClick={() => {
                const reason = window.prompt('Hide this model? The scraper keeps it but it never publishes. Reason (optional):')
                if (reason !== null) run(() => setHidden(id, true, reason))
              }}
            >
              Hide
            </button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-700 max-w-xs text-right">That didn&apos;t work: {error}</p>}
    </div>
  )
}

export function HeldPriceActions({ listingId }: { listingId: number }) {
  const [pending, start] = useTransition()
  return (
    <span className="inline-flex gap-1">
      <button disabled={pending} className={quiet} onClick={() => start(() => resolveHeldPrice(listingId, true))}>
        Accept
      </button>
      <button disabled={pending} className={quiet} onClick={() => start(() => resolveHeldPrice(listingId, false))}>
        Keep live price
      </button>
    </span>
  )
}
