'use client'

import { useRef, useTransition } from 'react'
import { createRoadmapItem } from '@/app/admin/roadmap/actions'
import { Button } from '@/components/ui/button'

const CATEGORIES = ['onboarding', 'calculators', 'monitoring', 'community', 'admin', 'infrastructure'] as const

export default function NewRoadmapItemForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          await createRoadmapItem(formData)
          formRef.current?.reset()
        })
      }
      className="grid gap-3 sm:grid-cols-2 bg-gray-50 border rounded-lg p-4 mb-8"
    >
      <label htmlFor="roadmap-title" className="sr-only">Title</label>
      <input
        id="roadmap-title"
        name="title"
        required
        placeholder="Title"
        className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400 sm:col-span-2"
      />
      <label htmlFor="roadmap-description" className="sr-only">Description</label>
      <textarea
        id="roadmap-description"
        name="description"
        placeholder="Description (optional)"
        rows={2}
        className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400 sm:col-span-2"
      />
      <label htmlFor="roadmap-category" className="sr-only">Category</label>
      <select
        id="roadmap-category"
        name="category"
        defaultValue="infrastructure"
        className="rounded-lg border px-3 py-2 text-sm bg-white"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <label htmlFor="roadmap-phase" className="sr-only">Phase</label>
      <input
        id="roadmap-phase"
        name="phase"
        type="number"
        defaultValue={0}
        min={0}
        placeholder="Phase"
        className="rounded-lg border px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-gray-600 sm:col-span-2">
        <input type="checkbox" name="is_public" defaultChecked />
        Visible on the public roadmap
      </label>
      <Button type="submit" disabled={isPending} className="sm:col-span-2 bg-yellow-500 hover:bg-yellow-600 text-white">
        {isPending ? 'Adding…' : 'Add roadmap item'}
      </Button>
    </form>
  )
}
