'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import TermsCheckbox from '@/components/auth/TermsCheckbox'
import { TERMS_VERSION } from '@/lib/terms'

/**
 * One email field, two jobs.
 *
 * `signin` sends a link only to an address that already has an account — it
 * must never create one, because an account made that way has agreed to
 * nothing. `signup` is the only door that creates an account, and it will not
 * submit without the terms box ticked. The version ticked travels through the
 * magic link, and the callback records it once the link is opened; see
 * src/app/auth/callback/route.ts.
 */
export default function LoginForm({
  next,
  mode = 'signin',
}: {
  next: string
  mode?: 'signin' | 'signup'
}) {
  const signup = mode === 'signup'
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (signup && !agreed) return
    setStatus('sending')
    setError('')

    const callback = new URLSearchParams({ next })
    if (signup) callback.set('terms', TERMS_VERSION)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: signup,
        emailRedirectTo: `${window.location.origin}/auth/callback?${callback}`,
      },
    })

    if (error) {
      setStatus('error')
      // Supabase reports "no such account" on sign-in, and sign-ups switched
      // off in the project settings, with the same "Signups not allowed for
      // otp" — which reads as a server fault either way.
      const closed = /signups? not allowed/i.test(error.message)
      setError(
        closed
          ? signup
            ? 'New accounts are switched off at the moment, so there is no link to send. Please try again later.'
            : 'There is no account for that address, so there is no sign-in link to send. Create an account first.'
          : error.message,
      )
      return
    }

    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <p className="text-sm text-zon-body">
        Check <span className="font-medium text-zon-ink">{email}</span> for a{' '}
        {signup ? 'link to finish creating your account' : 'sign-in link'}. Open it in this
        browser.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="login-email" className="sr-only">Email address</label>
      <input
        id="login-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-lg border border-zon-rule bg-zon-paper px-3 py-2 text-sm text-zon-ink outline-none focus:ring-2 focus:ring-zon-gold-light"
      />
      {signup && <TermsCheckbox id="signup-terms" checked={agreed} onChange={setAgreed} />}
      <Button
        type="submit"
        disabled={status === 'sending'}
        className="w-full bg-zon-gold text-zon-ink hover:bg-zon-gold-deep"
      >
        {status === 'sending'
          ? 'Sending link…'
          : signup
            ? 'Create account'
            : 'Send sign-in link'}
      </Button>
      {status === 'error' && <p className="text-sm text-zon-red">{error}</p>}
    </form>
  )
}
