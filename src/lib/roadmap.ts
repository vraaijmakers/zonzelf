export type RoadmapItem = {
  id: number
  phase: number
  category: string
  title: string
  description: string | null
  status: string
  dev_percent_complete: number
  is_public: boolean
  display_order: number
}

export const STATUS_LABEL: Record<string, string> = {
  planned: 'Planned',
  in_development: 'In development',
  in_test: 'In test',
  in_beta: 'In beta',
  in_production: 'Shipped',
  cancelled: 'Cancelled',
}

export const STATUS_STYLE: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-600',
  in_development: 'bg-blue-100 text-blue-700',
  in_test: 'bg-amber-100 text-amber-700',
  in_beta: 'bg-orange-100 text-orange-700',
  in_production: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export function groupByPhase(items: RoadmapItem[]): [number, RoadmapItem[]][] {
  const groups = new Map<number, RoadmapItem[]>()
  for (const item of items) {
    const group = groups.get(item.phase) ?? []
    group.push(item)
    groups.set(item.phase, group)
  }
  return [...groups.entries()].sort(([a], [b]) => a - b)
}
