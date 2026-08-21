import Link from 'next/link'
import { Sun, Calculator, BookOpen, Wifi, ChevronRight, Zap, Battery, Cable } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Knowledge Base',
    description: 'Guides on battery types, wiring, grounding, DoD rules, and inverter settings — written for humans, not engineers.',
    href: '/guides',
    badge: 'Free',
  },
  {
    icon: Calculator,
    title: 'Calculators',
    description: 'Size your battery bank, solar array, and cable gauge. Enter your loads and get real numbers.',
    href: '/calculators',
    badge: 'Free',
  },
  {
    icon: BookOpen,
    title: 'Resource Library',
    description: 'Curated YouTube channels, forum threads, and manufacturer docs — vetted by the community.',
    href: '/resources',
    badge: 'Free',
  },
  {
    icon: Wifi,
    title: 'Live Monitoring',
    description: 'Connect your inverter (Victron, Sun Gold, Growatt) and watch solar, load, and battery in real time.',
    href: '/dashboard/monitoring',
    badge: 'Account',
  },
]

const GUIDES = [
  { icon: Battery, title: 'Battery Types Explained',  subtitle: 'AGM vs LiFePO4 vs Gel — what actually matters',       href: '/guides/batteries' },
  { icon: Cable,   title: 'Cable AWG Sizing',         subtitle: 'Which gauge wire for which current and distance',       href: '/guides/wiring' },
  { icon: Zap,     title: 'Depth of Discharge',       subtitle: "Don't kill your batteries — set your inverter right",  href: '/guides/depth-of-discharge' },
  { icon: Sun,     title: 'Grounding Your System',    subtitle: 'Where earth grounding goes and what devices you need',  href: '/guides/grounding' },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-zon-cream to-zon-gold-tint border-b">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-zon-gold"
          aria-hidden="true"
        >
          <defs>
            <pattern id="sun-rays" width="120" height="120" patternUnits="userSpaceOnUse">
              <circle cx="0" cy="0" r="70" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="45" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sun-rays)" />
        </svg>
        <div className="relative max-w-6xl mx-auto px-4 py-20 text-center">
          <Badge className="mb-4 bg-zon-gold-tint text-zon-gold-deep border-zon-gold-light">
            Zon = sun · Zelf = self · Your energy, your way
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-zon-ink">
            Your solar system,<br className="hidden md:block" /> built by you
          </h1>
          <p className="text-lg text-zon-body max-w-2xl mx-auto mb-8">
            Free calculators, plain-English guides, and live monitoring tools for anyone
            setting up an off-grid or hybrid solar system — no engineering degree required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/guides" className={cn(buttonVariants({ size: 'lg' }), 'bg-zon-gold hover:bg-zon-gold-deep text-zon-ink')}>
              Start learning
            </Link>
            <Link href="/calculators" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
              Open calculators
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold mb-8 text-center text-zon-ink">Everything you need in one place</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(({ icon: Icon, title, description, href, badge }) => (
            <Link key={href} href={href} className="group">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-zon-gold-tint flex items-center justify-center">
                      <Icon className="w-5 h-5 text-zon-gold-deep" />
                    </div>
                    <Badge variant={badge === 'Free' ? 'secondary' : 'outline'} className="text-xs">
                      {badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-base group-hover:text-zon-gold-deep transition-colors">
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular guides */}
      <section className="bg-zon-cream border-y">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-zon-ink">Popular guides</h2>
            <Link href="/guides" className="text-sm text-zon-gold-deep hover:underline flex items-center gap-1">
              All guides <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {GUIDES.map(({ icon: Icon, title, subtitle, href }) => (
              <Link key={href} href={href}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center gap-4 pt-5">
                    <div className="w-10 h-10 rounded-full bg-zon-gold-tint flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-zon-gold-deep" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-zon-ink">{title}</p>
                      <p className="text-xs text-zon-muted">{subtitle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zon-muted ml-auto shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Monitoring CTA */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="bg-zon-night rounded-2xl p-10 text-white">
          <Wifi className="w-10 h-10 text-zon-gold-light mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Monitor your system live</h2>
          <p className="text-white/70 max-w-xl mx-auto mb-6">
            Connect Victron, Sun Gold, or any MODBUS inverter. See solar watts, battery state-of-charge,
            and load in real time — from your phone or browser.
          </p>
          <p className="text-xs text-white/40 mb-6 italic">
            ZonZelf — from Dutch <em>zon</em> (sun) + <em>zelf</em> (self). Your energy, yourself.
          </p>
          <Link href="/auth/signup" className={cn(buttonVariants(), 'bg-zon-gold hover:bg-zon-gold-deep text-zon-ink')}>
            Create a free account
          </Link>
        </div>
      </section>
    </div>
  )
}
