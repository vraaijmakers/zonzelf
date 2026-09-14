'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { pickScrapedFields } from '@/lib/battery-revision'

export async function publishBatteryModel(id: number) {
  await requireAdmin()

  const supabase = await createClient()
  const { error } = await supabase
    .from('battery_models')
    .update({ is_published: true })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/batteries')
}

export async function unpublishBatteryModel(id: number) {
  await requireAdmin()

  const supabase = await createClient()
  const { error } = await supabase
    .from('battery_models')
    .update({ is_published: false })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/batteries')
}

export async function rejectBatteryModel(id: number) {
  await requireAdmin()

  const supabase = await createClient()
  const { error } = await supabase
    .from('battery_models')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/batteries')
}

/**
 * Accepts a re-scrape's proposed change to a PUBLISHED row.
 *
 * This is the human half of the review gate in scripts/lib/scrape-common.ts:
 * a scraper that disagrees with a live row queues the change here instead of
 * writing it, so applying it IS the re-approval. See
 * supabase/migrations/20260909000001_battery_model_revisions.sql.
 */
export async function applyBatteryRevision(revisionId: number) {
  const { user } = await requireAdmin()

  const supabase = await createClient()
  const { data: revision, error } = await supabase
    .from('battery_model_revisions')
    .select('id, battery_model_id, proposed, status, scraped_at')
    .eq('id', revisionId)
    .single()

  if (error) {
    throw new Error(error.message)
  }
  if (revision.status !== 'pending') {
    // Two admins, two tabs, or a re-scrape that superseded it mid-review.
    throw new Error(`That change was already ${revision.status} — reload the page to see where it stands.`)
  }

  // The stored jsonb is filtered rather than spread: pickScrapedFields drops
  // everything outside SCRAPED_FIELDS, so a proposal can never carry
  // is_published and publish a row on its own.
  const patch = pickScrapedFields(revision.proposed as Record<string, unknown>)
  if (Object.keys(patch).length === 0) {
    throw new Error('That proposal has no reviewable fields left in it — dismiss it instead.')
  }

  // The model first, the revision second. If the second write fails the
  // revision stays pending and applying again writes the same values, which is
  // a duplicate click rather than a lost or half-applied change.
  const { error: updateError } = await supabase
    .from('battery_models')
    .update({ ...patch, scraped_at: revision.scraped_at })
    .eq('id', revision.battery_model_id)

  if (updateError) {
    throw new Error(updateError.message)
  }

  const { error: markError } = await supabase
    .from('battery_model_revisions')
    .update({ status: 'applied', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq('id', revisionId)

  if (markError) {
    throw new Error(markError.message)
  }

  revalidatePath('/admin/batteries')
}

/**
 * Refuses a proposed change. The live row keeps the values a human already
 * approved, and the scraper will not raise this exact change again — see
 * sameProposal() in src/lib/battery-revision.ts. A different value still gets
 * proposed: a rejection silences one claim, not the field.
 */
export async function dismissBatteryRevision(revisionId: number) {
  const { user } = await requireAdmin()

  const supabase = await createClient()
  const { error } = await supabase
    .from('battery_model_revisions')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq('id', revisionId)
    .eq('status', 'pending')

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/batteries')
}
