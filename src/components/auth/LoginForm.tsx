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
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setStatus('error')
      setError(error.message)
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
      <input
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
