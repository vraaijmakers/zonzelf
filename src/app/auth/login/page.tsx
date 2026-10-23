import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sanitizeNextPath } from '@/lib/safe-redirect'
import LoginForm from '@/components/auth/LoginForm'

export const metadata = {
  title: 'Sign in — ZonZelf',
}

export default async function LoginPage(props: PageProps<'/auth/login'>) {
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
      <h1 className="text-2xl font-bold text-zon-ink mb-2">Sign in</h1>
      <p className="text-sm text-zon-body mb-6">
        We&apos;ll email you a link — no password to remember.
      </p>
      {params.error === 'auth' && (
        <p className="text-sm text-zon-red mb-4">
          That link did not work. It may have expired, or been opened in a different browser
          from the one that asked for it. Send yourself a new one below.
        </p>
      )}
      <LoginForm next={next} />
      <p className="text-sm text-zon-muted mt-6">
        New here?{' '}
        <Link
          href={`/auth/signup?next=${encodeURIComponent(next)}`}
          className="underline hover:no-underline"
        >
          Create a free account
        </Link>
        . The calculators need one; the guides do not.
      </p>
    </div>
  )
}
