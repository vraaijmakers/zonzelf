'use server'

// Server Actions for /admin/catalog. Every one re-checks requireAdmin(), and
// every write goes through the admin's own session, so RLS and the triggers in
// supabase/migrations/20260930000001 and ...003 are the real boundary: the
// database refuses to publish an unverified or hidden model, and refuses to
// un-verify a live one, whatever this file does.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { parseBatteryVerification, parseInverterVerification, parsePanelVerification } from '@/lib/catalog-view'
import type { ReviewFlag } from '@/lib/battery-review'

export type VerifyState = { status: 'idle' | 'error' | 'ok'; errors: string[]; flags: ReviewFlag[] }

function refresh(id?: number) {
  revalidatePath('/admin/catalog')
  if (id !== undefined) revalidatePath(`/admin/catalog/${id}`)
}

async function modelFor(id: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('component_models').select('id, category, brand, model, mpn, is_published').eq('id', id).single()
  if (error) throw new Error(error.message)
  return {
    supabase,
    model: data as { id: number; category: Category; brand: string; model: string; mpn: string | null; is_published: boolean },
  }
}

type Category = 'panel' | 'inverter' | 'battery'
const SPEC_TABLE: Record<Category, string> = { panel: 'panel_specs', inverter: 'inverter_specs', battery: 'battery_specs' }

/**
 * Records specs read off the manufacturer's datasheet and marks them verified.
 * The physics checks run first (src/lib/catalog-view.ts); a 'fail' flag means
 * the figures cannot all be from one real product, and nothing is written.
 */
export async function verifySpecs(id: number, _prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const { user } = await requireAdmin()
  const { supabase, model } = await modelFor(id)
  if (model.is_published) {
    return { status: 'error', errors: ['Unpublish this model before changing its verified specs.'], flags: [] }
  }

  const get = (name: string) => {
    const v = formData.get(name)
    return typeof v === 'string' ? v : null
  }
  const result = model.category === 'panel' ? parsePanelVerification(get, model)
    : model.category === 'battery' ? parseBatteryVerification(get, model)
    : parseInverterVerification(get, model)
  if (!result.ok) return { status: 'error', errors: result.errors, flags: result.flags }

  const { datasheet_url, ...spec } = result.spec
  const table = SPEC_TABLE[model.category]
  const extra = model.category === 'panel'
    ? { cell_type: get('cell_type')?.trim() || null, bifacial: get('bifacial') === 'on' }
    : {}
  const { error } = await supabase.from(table).upsert({
    component_model_id: id,
    ...spec,
    ...extra,
    spec_source: 'datasheet',
    verified_at: new Date().toISOString(),
    verified_by: user.id,
  }, { onConflict: 'component_model_id' })
  if (error) return { status: 'error', errors: [`That didn't save: ${error.message}`], flags: result.flags }

  // The link the figures were read from becomes the model's citation, and a
  // scraper disagreement is answered by this re-verification.
  const { error: linkError } = await supabase
    .from('component_models')
    .update({ spec_sheet_url: datasheet_url, spec_disagreement: null, spec_disagreement_at: null })
    .eq('id', id)
  if (linkError) return { status: 'error', errors: [`Specs saved, but the datasheet link didn't: ${linkError.message}`], flags: result.flags }

  refresh(id)
  return { status: 'ok', errors: [], flags: result.flags }
}

/** Back to candidate, so the specs can be corrected. Refused on a live model. */
export async function unverifySpecs(id: number) {
  await requireAdmin()
  const { supabase, model } = await modelFor(id)
  const { error } = await supabase
    .from(SPEC_TABLE[model.category]).update({ verified_at: null, verified_by: null }).eq('component_model_id', id)
  if (error) throw new Error(error.message)
  refresh(id)
}

export async function setPublished(id: number, published: boolean) {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('component_models').update({ is_published: published }).eq('id', id)
  if (error) throw new Error(error.message)
  refresh(id)
}

/** Rejects a model without deleting it, so next week's scrape cannot re-add it. */
export async function setHidden(id: number, hidden: boolean, reason?: string) {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('component_models')
    .update(hidden ? { is_hidden: true, is_published: false, hidden_reason: reason?.trim() || null } : { is_hidden: false, hidden_reason: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
  refresh(id)
}

/**
 * A price the scraper held because it moved more than 30% on a live model
 * (src/lib/listing-price.ts). Accepting dates it to when the scraper SAW it,
 * not to this click — a review can sit for days.
 */
export async function resolveHeldPrice(listingId: number, accept: boolean) {
  await requireAdmin()
  const supabase = await createClient()
  const { data: listing, error } = await supabase
    .from('component_listings').select('component_model_id, held_price_usd, held_at').eq('id', listingId).single()
  if (error) throw new Error(error.message)
  if (listing.held_price_usd === null) throw new Error('No held price on that listing — reload the page.')

  const patch = accept
    ? { price_usd: listing.held_price_usd, price_scraped_at: listing.held_at, held_price_usd: null, held_at: null }
    : { held_price_usd: null, held_at: null }
  const { error: updateError } = await supabase.from('component_listings').update(patch).eq('id', listingId)
  if (updateError) throw new Error(updateError.message)
  refresh(listing.component_model_id)
}

/**
 * Folds a duplicate into the model it duplicates: its listings move over and it
 * is deleted. Safe against the scraper because listings are found by the
 * retailer's product id, so next week they land on the surviving model. The
 * duplicate must be unpublished; its specs are discarded, not merged — the
 * surviving model's spec row is the one a human reviews.
 */
export async function mergeInto(sourceId: number, formData: FormData) {
  await requireAdmin()
  const targetId = Number(formData.get('target_id'))
  if (!Number.isInteger(targetId) || targetId === sourceId) throw new Error('Give the id of a different model to merge into.')

  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from('component_models').select('id, category, is_published').in('id', [sourceId, targetId])
  if (error) throw new Error(error.message)
  const source = rows?.find(r => r.id === sourceId)
  const target = rows?.find(r => r.id === targetId)
  if (!source || !target) throw new Error(`No model #${targetId}.`)
  if (source.category !== target.category) throw new Error('Both models must be the same category.')
  if (source.is_published) throw new Error('Unpublish this model before merging it away.')

  const { error: moveError } = await supabase
    .from('component_listings').update({ component_model_id: targetId }).eq('component_model_id', sourceId)
  if (moveError) throw new Error(moveError.message)
  const { error: deleteError } = await supabase.from('component_models').delete().eq('id', sourceId)
  if (deleteError) throw new Error(deleteError.message)

  refresh()
  redirect(`/admin/catalog/${targetId}`)
}
