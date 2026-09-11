'use client'

import { useTransition } from 'react'
import { applyBatteryRevision, dismissBatteryRevision } from '@/app/admin/batteries/actions'

/**
 * Apply / Dismiss for one proposed change to a published battery row.
 *
 * Sibling of BatteryReviewActions, deliberately separate: that component
 * decides whether a row may go live at all, this one decides whether a live
 * row's numbers may change. Applying is the re-approval.
 */
export default function BatteryRevisionActions({
  revisionId,
  hasFailingCheck,
}: {
  revisionId: number
  hasFailingCheck: boolean
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        disabled={isPending}
        onClick={() => {
          // A red flag means the proposed values would put a LIVE row into a
          // state the automated checks think is wrong. Applying anyway is a
          // legitimate call — the checks are heuristics — but not a stray click.
          if (
            hasFailingCheck &&
            !window.confirm(
              'One of the automated checks fails on the proposed values, and this row is live on the battery calculator. Apply anyway?',
            )
          ) {
            return
          }
          startTransition(() => applyBatteryRevision(revisionId))
        }}
        className="text-xs bg-green-600 text-white rounded px-3 py-1.5 hover:bg-green-700 disabled:opacity-50"
      >
        Apply
      </button>
      <button
        disabled={isPending}
        onClick={() => startTransition(() => dismissBatteryRevision(revisionId))}
        className="text-xs border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-100 disabled:opacity-50"
      >
        Keep current
      </button>
    </div>
  )
}
