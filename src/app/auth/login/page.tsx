import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sanitizeNextPath } from '@/lib/safe-redirect'
import LoginForm from '@/components/auth/LoginForm'

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
      <h1 className="text-2xl font-bold mb-2">Sign in</h1>
      <p className="text-sm text-zon-body mb-2">
        We&apos;ll email you a link — no password to remember.
      </p>
      <p className="text-sm text-zon-muted mb-6">
        Sign-in only: ZonZelf is not opening accounts yet, so a link is sent only to an address
        that already has one. The calculators and guides do not need an account.
      </p>
      <LoginForm next={next} />
    </div>
  )
}
