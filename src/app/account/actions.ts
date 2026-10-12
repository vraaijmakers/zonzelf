'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sanitizeNextPath } from '@/lib/safe-redirect'
import { recordTermsAcceptance } from '@/lib/terms-access'

/**
 * Records the caller's agreement to the current terms. The box is `required`
 * in the form, and checked again here because a Server Action is reachable by
 * a direct POST: no tick, no record.
 */
export async function acceptTerms(formData: FormData) {
  const nextValue = formData.get('next')
  const next = sanitizeNextPath(typeof nextValue === 'string' ? nextValue : null)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(next)}`)
  }

  if (formData.get('agree') !== 'on') {
    throw new Error('Tick the box to agree to the terms before continuing.')
  }

  const { error } = await recordTermsAcceptance(supabase)
  if (error) {
    throw new Error(`That didn't save. Here's what went wrong: ${error}`)
  }

  revalidatePath('/calculators', 'layout')
  revalidatePath('/account')
  redirect(next)
}

/**
 * Deletes the caller's account and everything stored against it. The database
 * function can only ever remove the row of whoever calls it; see the
 * terms_acceptances migration.
 */
export async function deleteAccount() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login?next=/account')
  }

  const { error } = await supabase.rpc('delete_own_account')
  if (error) {
    console.error('account deletion failed:', error.message)
    throw new Error(`Your account was not deleted. Here's what went wrong: ${error.message}`)
  }

  // The user no longer exists, so there is no server session left to revoke —
  // this only clears the cookies in this browser.
  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
  if (signOutError) {
    console.error('clearing the session after account deletion failed:', signOutError.message)
  }

  revalidatePath('/', 'layout')
  redirect('/account/deleted')
}
