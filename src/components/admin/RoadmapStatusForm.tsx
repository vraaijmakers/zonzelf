'use client'

import { useRef, useTransition } from 'react'
import { updateRoadmapItemStatus } from '@/app/admin/roadmap/actions'

const STATUSES = ['planned', 'in_development', 'in_test', 'in_beta', 'in_production', 'cancelled'] as const

export default function RoadmapStatusForm({ id, status }: { id: number; status: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const boundAction = updateRoadmapItemStatus.bind(null, id)

  return (
    <form
      ref={formRef}
      action={(formData) => startTransition(() => boundAction(formData))}
    >
      <select
        name="status"
        defaultValue={status}
        disabled={isPending}
        onChange={() => formRef.current?.requestSubmit()}
        className="text-xs border rounded px-1.5 py-1 bg-white disabled:opacity-50"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ')}
          </option>
        ))}
      </select>
    </form>
  )
}
