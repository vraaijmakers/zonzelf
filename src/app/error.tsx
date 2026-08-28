'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <p className="text-sm font-medium text-zon-muted uppercase tracking-wide mb-2">
        Something went wrong
      </p>
      <h1 className="text-2xl font-bold text-zon-ink mb-3">This page hit a problem</h1>
      <p className="text-sm text-zon-body mb-6">
        The calculators and guides are still there. Try again, or head back to the start.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => retry()}
          className="px-4 py-2 rounded-lg bg-zon-gold text-zon-ink font-medium hover:bg-zon-gold-light transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg border border-zon-rule text-zon-body hover:bg-zon-gold-tint transition-colors"
        >
          Home
        </Link>
      </div>
    </div>
  )
}
