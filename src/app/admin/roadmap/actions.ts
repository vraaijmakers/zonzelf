'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'

const CATEGORIES = ['onboarding', 'calculators', 'monitoring', 'community', 'admin', 'infrastructure'] as const
const STATUSES = ['planned', 'in_development', 'in_test', 'in_beta', 'in_production', 'cancelled'] as const

type Category = (typeof CATEGORIES)[number]
type Status = (typeof STATUSES)[number]

function isCategory(value: FormDataEntryValue | null): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

function isStatus(value: FormDataEntryValue | null): value is Status {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}

/**
 * Every Server Action re-runs requireAdmin() itself — it's reachable by a
 * direct POST, not just through this page's UI. RLS on roadmap_items is the
 * real boundary; this is the defense-in-depth layer Next.js's own docs call
 * out as required. See CLAUDE.md, rule 9.
 */
export async function createRoadmapItem(formData: FormData) {
  await requireAdmin()

  const title = formData.get('title')
  const description = formData.get('description')
  const category = formData.get('category')
  const phase = formData.get('phase')
  const isPublic = formData.get('is_public') === 'on'

  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error('Title is required')
  }
  if (!isCategory(category)) {
    throw new Error('Invalid category')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('roadmap_items').insert({
    title: title.trim(),
    description: typeof description === 'string' && description.trim() !== '' ? description.trim() : null,
    category,
    phase: typeof phase === 'string' && phase !== '' ? Number(phase) : 0,
    is_public: isPublic,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/roadmap')
  revalidatePath('/roadmap')
}

export async function updateRoadmapItemStatus(id: number, formData: FormData) {
  await requireAdmin()

  const status = formData.get('status')
  if (!isStatus(status)) {
    throw new Error('Invalid status')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('roadmap_items')
    .update({ status })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/roadmap')
  revalidatePath('/roadmap')
}
