import Link from 'next/link'
import { clean } from '@/lib/version'
import Logo from '@/components/layout/Logo'

export default function Footer() {
  return (
    <footer className="border-t bg-zon-cream mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Logo className="mb-2" />
          <p className="text-sm text-zon-muted">
            Free tools and guides for DIY solar builders — from first panel to full system monitoring.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3 text-zon-ink">Learn</h4>
          <ul className="space-y-2 text-sm text-zon-body">
            <li><Link href="/guides" className="hover:underline">All Guides</Link></li>
            <li><Link href="/guides/batteries" className="hover:underline">Battery Types</Link></li>
            <li><Link href="/guides/wiring" className="hover:underline">Wiring & AWG</Link></li>
            <li><Link href="/guides/grounding" className="hover:underline">Grounding</Link></li>
            <li><Link href="/guides/glossary" className="hover:underline">Glossary</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3 text-zon-ink">Tools</h4>
          <ul className="space-y-2 text-sm text-zon-body">
            <li><Link href="/calculators/load" className="hover:underline">Load Calculator</Link></li>
            <li><Link href="/calculators/battery" className="hover:underline">Battery Sizing</Link></li>
            <li><Link href="/calculators/panels" className="hover:underline">Panel Sizing</Link></li>
            <li><Link href="/calculators/awg" className="hover:underline">AWG Calculator</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3 text-zon-ink">Account</h4>
          <ul className="space-y-2 text-sm text-zon-body">
            <li><Link href="/auth/signup" className="hover:underline">Get started</Link></li>
            <li><Link href="/auth/login" className="hover:underline">Sign in</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3 text-zon-ink">Legal</h4>
          <ul className="space-y-2 text-sm text-zon-body">
            <li><Link href="/disclaimer" className="hover:underline">Disclaimer</Link></li>
            <li><Link href="/terms" className="hover:underline">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-zon-rule text-center text-xs text-zon-muted py-4">
        ZonZelf — Community-built, for the community
        <span className="mx-2">·</span>
        <span>v{clean()}</span>
      </div>
    </footer>
  )
}
