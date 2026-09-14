import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-side gate for every /admin route. Never hide an admin page behind
 * a nav link alone — RLS on the tables underneath is the real boundary
 * (profiles.role = 'admin'), this just gives a clean redirect instead of an
 * empty/broken page. See CLAUDE.md, "Supabase: RLS is the access control".
 */
export async function requireAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?next=/admin')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  return { user, profile }
}
