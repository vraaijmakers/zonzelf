import { createClient } from '@/lib/supabase/server'
import { groupByPhase, STATUS_LABEL, STATUS_STYLE, type RoadmapItem } from '@/lib/roadmap'
import NewRoadmapItemForm from '@/components/admin/NewRoadmapItemForm'
import RoadmapStatusForm from '@/components/admin/RoadmapStatusForm'

export default async function AdminRoadmapPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('roadmap_items')
    .select('id, phase, category, title, description, status, dev_percent_complete, is_public, display_order')
    .order('phase', { ascending: true })
    .order('display_order', { ascending: true })
    .order('id', { ascending: true })

  const items = (data ?? []) as RoadmapItem[]
  const phases = groupByPhase(items)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Roadmap</h1>
      <p className="text-sm text-gray-600 mb-6">
        Items marked visible show on the public{' '}
        <a href="/roadmap" className="text-yellow-700 hover:underline">
          /roadmap
        </a>{' '}
        page.
      </p>

      <NewRoadmapItemForm />

      {error && <p className="text-sm text-red-600 mb-4">Couldn&apos;t load the roadmap: {error.message}</p>}

      {phases.length === 0 && !error && (
        <p className="text-sm text-gray-500">No roadmap items yet — add one above.</p>
      )}

      <div className="space-y-8">
        {phases.map(([phase, phaseItems]) => (
          <div key={phase}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
              Phase {phase}
            </h2>
            <div className="space-y-2">
              {phaseItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border rounded-lg px-4 py-3 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{item.title}</span>
                      <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                        {item.category}
                      </span>
                      {!item.is_public && (
                        <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-400 rounded px-1.5 py-0.5">
                          Internal
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-500">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs rounded-full px-2 py-1 ${STATUS_STYLE[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                    <RoadmapStatusForm id={item.id} status={item.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
