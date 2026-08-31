'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Sign-in only. Accounts are not open: a magic link must never create one,
        // because there is no dashboard an account is for and no deletion flow to
        // honour the promise the privacy policy makes. See the roadmap item
        // "GDPR: account deletion path, or stop collecting emails".
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setStatus('error')
      // Supabase reports the closed-signup case as "Signups not allowed for otp",
      // which reads as a server fault rather than a deliberate policy.
      setError(
        /signups? not allowed/i.test(error.message)
          ? 'Accounts are not open yet, so there is no sign-in link to send. The calculators and guides all work without one.'
          : error.message,
      )
      return
    }

    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <p className="text-sm text-gray-600">
        Check <span className="font-medium text-gray-900">{email}</span> for a sign-in link.
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
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
      />
      <Button type="submit" disabled={status === 'sending'} className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
        {status === 'sending' ? 'Sending link…' : 'Send sign-in link'}
      </Button>
      {status === 'error' && <p className="text-sm text-red-600">{error}</p>}
    </form>
  )
}
