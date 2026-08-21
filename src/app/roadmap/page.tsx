import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin'
import { groupByPhase, STATUS_LABEL, STATUS_STYLE, type RoadmapItem } from '@/lib/roadmap'

export const metadata = {
  title: 'Roadmap — ZonZelf',
  description: "What we're building next, and what's already shipped.",
}

export default async function PublicRoadmapPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data } = await supabase
    .from('roadmap_items')
    .select('id, phase, category, title, description, status, dev_percent_complete, is_public, display_order')
    .order('phase', { ascending: true })
    .order('display_order', { ascending: true })
    .order('id', { ascending: true })

  const items = (data ?? []) as RoadmapItem[]
  const phases = groupByPhase(items)

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Roadmap</h1>
      <p className="text-gray-600 mb-10">
        Internal view of what we&apos;re building next, and what&apos;s already shipped. See the{' '}
        <span className="italic">Blue Ocean Contract</span> in our repo for why some obvious
        ideas aren&apos;t here.
      </p>

      {phases.length === 0 && (
        <p className="text-sm text-gray-500">Nothing to show yet — check back soon.</p>
      )}

      <div className="space-y-10">
        {phases.map(([phase, phaseItems]) => (
          <div key={phase}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
              Phase {phase}
            </h2>
            <div className="space-y-3">
              {phaseItems.map((item) => (
                <div key={item.id} className="border rounded-lg px-5 py-4">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <span className="font-medium">{item.title}</span>
                    <span className={`shrink-0 text-xs rounded-full px-2 py-1 ${STATUS_STYLE[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-500">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
