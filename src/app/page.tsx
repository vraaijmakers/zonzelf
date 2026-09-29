import Link from 'next/link'
import { Calculator, BookOpen, ChevronRight, Battery } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CabinScene, HeroSun } from '@/components/home/CabinScene'
import Routes from '@/components/home/Routes'

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Knowledge Base',
    description: 'Guides on battery types, wiring, grounding, DoD rules, and inverter settings — written for humans, not engineers.',
    href: '/guides',
    badge: 'Free',
    enabled: true,
  },
  {
    icon: Calculator,
    title: 'Calculators',
    description: 'Size your battery bank, solar array, and cable gauge. Enter your loads and get real numbers.',
    href: '/calculators',
    badge: 'Free',
    enabled: true,
  },
  {
    icon: BookOpen,
    title: 'Resource Library',
    description: 'Curated YouTube channels, forum threads, and manufacturer docs — vetted by the community.',
    href: '/resources',
    badge: 'Free',
    enabled: true,
  },
]

// Only guides that actually have a page live here. Add an entry back once
// its /guides/<slug> page ships — see the guides index for the full list.
const GUIDES = [
  { icon: Battery, title: 'Battery Types Explained',  subtitle: 'AGM vs LiFePO4 vs Gel — what actually matters',       href: '/guides/batteries' },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-zon-cream border-b min-h-[600px] md:min-h-[640px]">
        <HeroSun />
        <CabinScene />
        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-[220px] md:pt-24 md:pb-[300px] text-center md:text-left">
          <Badge className="mb-4 bg-zon-gold-tint text-zon-gold-deep border-zon-gold-light">
            Zon = sun · Zelf = self · Your energy, your way
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-zon-ink">
            Your solar system,<br className="hidden md:block" /> built by you
          </h1>
          <p className="text-lg text-zon-body max-w-xl mx-auto md:mx-0 mb-8">
            Free calculators and plain-English guides for the cabin, the homestead, the van
            or the boat — no engineering degree required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <Link href="/guides" className={cn(buttonVariants({ size: 'lg' }), 'bg-zon-gold hover:bg-zon-gold-deep text-zon-ink')}>
              Start learning
            </Link>
            <Link href="/calculators" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'bg-zon-paper')}>
              Open calculators
            </Link>
          </div>
        </div>
      </section>

      <Routes />

      {/* Feature cards */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold mb-8 text-center text-zon-ink">Everything you need in one place</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, description, href, badge, enabled }) => {
            const card = (
              <Card className={`h-full transition-shadow ${enabled ? 'hover:shadow-md' : 'opacity-60'}`}>
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
            )
            return enabled ? (
              <Link key={href} href={href} className="group">
                {card}
              </Link>
            ) : (
              <div key={href} className="cursor-not-allowed" aria-disabled="true">
                {card}
              </div>
            )
          })}
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
    </div>
  )
}
