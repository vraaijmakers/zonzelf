import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sanitizeNextPath } from '@/lib/safe-redirect'

// Accounts are deliberately closed. This route stays reachable rather than 404ing,
// because it has been linked from the nav, the footer, and the load calculator, and a
// bookmark or a stale link should land on an explanation rather than an error. It no
// longer renders LoginForm: a form here would keep creating users, which is the finding
// this closure exists to fix. See the roadmap item
// "GDPR: account deletion path, or stop collecting emails".
export default async function SignupPage(props: PageProps<'/auth/signup'>) {
  const params = await props.searchParams
  const next = sanitizeNextPath(typeof params.next === 'string' ? params.next : null)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    redirect(next)
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold mb-2">Accounts are not open yet</h1>
      <p className="text-sm text-zon-body mb-4">
        ZonZelf is not taking sign-ups. There is no dashboard for an account to hold yet, so
        collecting your email address would give you nothing and us something to look after.
      </p>
      <p className="text-sm text-zon-body mb-6">
        Nothing here needs an account. The{' '}
        <Link href="/calculators/load" className="underline hover:no-underline">
          calculators
        </Link>{' '}
        and{' '}
        <Link href="/guides" className="underline hover:no-underline">
          guides
        </Link>{' '}
        all work without one, and will stay that way.
      </p>
      <p className="text-sm text-zon-muted">
        Already have an account?{' '}
        <Link href="/auth/login" className="underline hover:no-underline">
          Sign in
        </Link>
        .
      </p>
    </div>
  )
}
