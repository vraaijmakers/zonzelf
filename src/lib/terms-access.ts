import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { TERMS_VERSION, termsAccess, type TermsAccess } from '@/lib/terms'

/**
 * Server-side check for the protection steps. Called from the page itself, not
 * a layout: Next does not re-run a layout on navigation, and a layout that
 * swaps its children does not stop them rendering (see the "Layouts and auth
 * checks" section of Next's authentication guide).
 *
 * Fails closed. If the acceptance lookup errors, the reader is asked to accept
 * again rather than shown the numbers on an unknown.
 */
export const getTermsAccess = cache(async (): Promise<TermsAccess> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'anonymous'

  // Filtered by user_id explicitly: an admin's read policy returns every row.
  const { data, error } = await supabase
    .from('terms_acceptances')
    .select('terms_version')
    .eq('user_id', user.id)

  if (error) {
    console.error('terms_acceptances lookup failed:', error.message)
    return 'needs-acceptance'
  }

  return termsAccess(user.id, (data ?? []).map(row => row.terms_version))
})

/**
 * Records that the signed-in caller agreed to the current terms. user_id and
 * accepted_at are set by the database, never sent from here.
 *
 * Agreeing twice is not an error — the unique constraint (23505) means the
 * record already exists, which is the outcome asked for.
 */
export async function recordTermsAcceptance(
  supabase: SupabaseClient,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('terms_acceptances')
    .insert({ terms_version: TERMS_VERSION })

  if (error && error.code !== '23505') {
    console.error('recording terms acceptance failed:', error.message)
    return { error: error.message }
  }
  return { error: null }
}
