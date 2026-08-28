import Link from 'next/link'

export const metadata = {
  title: 'Page not found — ZonZelf',
}

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <p className="text-sm font-medium text-zon-muted uppercase tracking-wide mb-2">404</p>
      <h1 className="text-2xl font-bold text-zon-ink mb-3">This page does not exist</h1>
      <p className="text-sm text-zon-body mb-6">
        It may have moved, or the link was never live. The calculators and guides are still
        the place to start.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-zon-gold text-zon-ink font-medium hover:bg-zon-gold-light transition-colors"
        >
          Home
        </Link>
        <Link
          href="/calculators"
          className="px-4 py-2 rounded-lg border border-zon-rule text-zon-body hover:bg-zon-gold-tint transition-colors"
        >
          Calculators
        </Link>
      </div>
    </div>
  )
}
