import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function CalculatorDisclaimer() {
  return (
    <div className="mb-6 flex items-start gap-2 rounded-lg border border-zon-gold-light bg-zon-gold-tint px-4 py-3 text-sm text-zon-body">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-zon-gold-deep" aria-hidden="true" />
      <span>
        This tool gives a starting estimate, not professional advice — verify against your
        equipment specs and local electrical code before you build. See our{' '}
        <Link href="/disclaimer" className="underline hover:no-underline">disclaimer</Link>.
      </span>
    </div>
  )
}
