import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function CalculatorDisclaimer() {
  return (
    <div className="flex items-start gap-2 text-sm text-yellow-900 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-6">
      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
      <span>
        This tool gives a starting estimate, not professional advice — verify against your
        equipment specs and local electrical code before you build. See our{' '}
        <Link href="/disclaimer" className="underline hover:no-underline">disclaimer</Link>.
      </span>
    </div>
  )
}
