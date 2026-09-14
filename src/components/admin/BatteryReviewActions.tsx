'use client'

import { useTransition } from 'react'
import { publishBatteryModel, rejectBatteryModel, unpublishBatteryModel } from '@/app/admin/batteries/actions'

export default function BatteryReviewActions({ id, isPublished }: { id: number; isPublished: boolean }) {
  const [isPending, startTransition] = useTransition()

  if (isPublished) {
    return (
      <button
        disabled={isPending}
        onClick={() => startTransition(() => unpublishBatteryModel(id))}
        className="text-xs border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-100 disabled:opacity-50"
      >
        Unpublish
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={isPending}
        onClick={() => startTransition(() => publishBatteryModel(id))}
        className="text-xs bg-green-600 text-white rounded px-3 py-1.5 hover:bg-green-700 disabled:opacity-50"
      >
        Approve
      </button>
      <button
        disabled={isPending}
        onClick={() => {
          if (window.confirm('Delete this row permanently? This can\'t be undone — the scraper will pick it up again on the next run if it\'s still on the source site.')) {
            startTransition(() => rejectBatteryModel(id))
          }
        }}
        className="text-xs border border-red-200 text-red-600 rounded px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  )
}
