import Link from 'next/link'
import { AlertTriangle, ChevronRight, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function GuideBreadcrumb({ current }: { current: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zon-muted mb-6">
      <Link href="/guides" className="hover:text-zon-body">Guides</Link>
      <ChevronRight className="w-4 h-4" />
      <span className="text-zon-body">{current}</span>
    </div>
  )
}

export function GuideHeader({
  badges,
  minutes,
  title,
  lede,
}: {
  badges: string[]
  minutes?: string
  title: string
  lede: string
}) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {badges.map(b => (
          <Badge key={b} variant="secondary">{b}</Badge>
        ))}
        {minutes && <span className="text-xs text-zon-muted">{minutes}</span>}
      </div>
      <h1 className="text-3xl font-bold mb-3">{title}</h1>
      <p className="text-lg text-zon-body">{lede}</p>
    </div>
  )
}

export function Tldr({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-zon-gold-tint bg-zon-gold-tint mb-10">
      <CardContent className="pt-4">
        <p className="text-sm font-semibold text-zon-gold-deep mb-2">The short answer</p>
        <div className="text-sm text-zon-body space-y-2">{children}</div>
      </CardContent>
    </Card>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-zon-blue-tint bg-zon-blue-tint">
      <CardContent className="pt-3 pb-3">
        <div className="flex gap-2 text-sm">
          <Info className="w-4 h-4 shrink-0 text-zon-blue mt-0.5" />
          <div className="text-zon-body space-y-2">{children}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export function Warn({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-zon-red-tint bg-zon-red-tint">
      <CardContent className="pt-3 pb-3">
        <div className="flex gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-zon-red mt-0.5" />
          <div className="text-zon-body space-y-2">{children}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export function GuideDisclaimer() {
  return (
    <p className="text-xs text-zon-muted mb-8">
      Educational starting point, not a wiring spec or a substitute for a licensed
      electrician. See our{' '}
      <Link href="/disclaimer" className="text-zon-gold-deep hover:underline">disclaimer</Link>.
    </p>
  )
}

export function NextSteps({
  items,
}: {
  items: { href: string; title: string; sub: string; Icon: LucideIcon }[]
}) {
  return (
    <section className="border-t border-zon-rule pt-8">
      <h2 className="text-base font-semibold text-zon-muted uppercase tracking-wide mb-4">Next steps</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map(({ href, title, sub, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 p-4 rounded-xl border border-zon-rule hover:border-zon-gold-light hover:bg-zon-gold-tint transition-colors group"
          >
            <div className="w-9 h-9 bg-zon-gold-tint rounded-lg flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-zon-gold-deep" />
            </div>
            <div>
              <p className="text-sm font-medium group-hover:text-zon-gold-deep">{title}</p>
              <p className="text-xs text-zon-muted">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zon-muted ml-auto group-hover:text-zon-gold" />
          </Link>
        ))}
      </div>
    </section>
  )
}
