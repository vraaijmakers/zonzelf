import Link from 'next/link'
import { Sun } from 'lucide-react'
import { clean } from '@/lib/version'

export default function Footer() {
  return (
    <footer className="border-t bg-gray-50 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 font-bold text-yellow-600 mb-2">
            <Sun className="w-5 h-5" />
            ZonZelf
          </div>
          <p className="text-sm text-gray-500">
            Free tools and guides for DIY solar builders — from first panel to full system monitoring.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Learn</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link href="/guides" className="hover:underline">All Guides</Link></li>
            <li><Link href="/guides/batteries" className="hover:underline">Battery Types</Link></li>
            <li><Link href="/guides/wiring" className="hover:underline">Wiring & AWG</Link></li>
            <li><Link href="/guides/grounding" className="hover:underline">Grounding</Link></li>
            <li><Link href="/guides/glossary" className="hover:underline">Glossary</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Tools</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link href="/calculators/load" className="hover:underline">Load Calculator</Link></li>
            <li><Link href="/calculators/battery" className="hover:underline">Battery Sizing</Link></li>
            <li><Link href="/calculators/panels" className="hover:underline">Panel Sizing</Link></li>
            <li><Link href="/calculators/awg" className="hover:underline">AWG Calculator</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Account</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link href="/auth/signup" className="hover:underline">Get started</Link></li>
            <li><Link href="/auth/login" className="hover:underline">Sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t text-center text-xs text-gray-400 py-4">
        ZonZelf — Community-built, for the community
        <span className="mx-2">·</span>
        <span>v{clean()}</span>
      </div>
    </footer>
  )
}
