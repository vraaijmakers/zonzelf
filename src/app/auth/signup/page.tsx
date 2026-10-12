import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sanitizeNextPath } from '@/lib/safe-redirect'
import LoginForm from '@/components/auth/LoginForm'

export const metadata = {
  title: 'Create an account — ZonZelf',
}

// The only door that creates an account, and it does not open without the
// terms box ticked. Sign-ups were closed until an account could be deleted
// without an operator; /account is that path.
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
      <h1 className="text-2xl font-bold text-zon-ink mb-2">Create a free account</h1>
      <p className="text-sm text-zon-body mb-2">
        An account opens the last three steps of the sizing chain: array wiring, cable and fuse
        sizing, and your whole system in one place.
      </p>
      <p className="text-sm text-zon-muted mb-6">
        We&apos;ll email you a link — no password to remember. Your email address and a record
        of this agreement are all we store, and you can delete the account yourself at any time.
      </p>
      <LoginForm next={next} mode="signup" />
      <p className="text-sm text-zon-muted mt-6">
        Already have an account?{' '}
        <Link
          href={`/auth/login?next=${encodeURIComponent(next)}`}
          className="underline hover:no-underline"
        >
          Sign in
        </Link>
        .
      </p>
    </div>
  )
}
