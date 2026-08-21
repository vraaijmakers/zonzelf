import Link from 'next/link'
import { Battery, Cable, Zap, Sun, BookOpen, Settings, Workflow, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const GUIDES = [
  {
    icon: Workflow,
    slug: 'how-it-works',
    title: 'How a Solar System Works',
    description: 'Start from a single panel and a light bulb and build up: why you need a charge controller, why you need a battery, and what "charging" vs. "supplying the house" actually means.',
    tags: ['fundamentals', 'beginner'],
    readTime: '14 min',
  },
  {
    icon: Battery,
    slug: 'batteries',
    title: 'Battery Types',
    description: 'Compare AGM, Gel, LiFePO4, and flooded lead-acid. Learn which chemistry suits your budget, climate, and usage pattern.',
    tags: ['batteries', 'beginner'],
    readTime: '8 min',
  },
  {
    icon: Zap,
    slug: 'depth-of-discharge',
    title: 'Depth of Discharge (DoD)',
    description: 'Why draining batteries too low kills them early — and how to configure your inverter shutdown voltage for each chemistry.',
    tags: ['batteries', 'inverter', 'beginner'],
    readTime: '5 min',
  },
  {
    icon: Cable,
    slug: 'wiring',
    title: 'Cable AWG & Wiring',
    description: 'How to pick the right wire gauge for any run. Includes a voltage drop calculator and common DC wiring mistakes.',
    tags: ['wiring', 'safety'],
    readTime: '10 min',
  },
  {
    icon: Sun,
    slug: 'grounding',
    title: 'Earth Grounding',
    description: 'Where to ground your system, what devices to use (earth rods, bonding conductors, GFCIs), and why it matters for safety and surge protection.',
    tags: ['safety', 'wiring'],
    readTime: '7 min',
  },
  {
    icon: Settings,
    slug: 'inverter-settings',
    title: 'Inverter Settings',
    description: 'A practical guide to configuring common inverters (Victron, Sun Gold, Growatt) — bulk/absorb/float voltages, generator input, and battery protection.',
    tags: ['inverter', 'intermediate'],
    readTime: '12 min',
  },
  {
    icon: BookOpen,
    slug: 'glossary',
    title: 'Solar Glossary',
    description: 'Plain-English definitions for every term you\'ll encounter: SOC, DoD, MPPT, PWM, AC coupling, split-phase, and more.',
    tags: ['reference', 'beginner'],
    readTime: 'Reference',
  },
]

export default function GuidesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Guides</h1>
        <p className="text-gray-600">
          Everything you need to understand, plan, and maintain a DIY solar system — explained clearly.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {GUIDES.map(({ icon: Icon, slug, title, description, tags, readTime }) => (
          <Link key={slug} href={`/guides/${slug}`} className="group">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-yellow-700" />
                  </div>
                  <span className="text-xs text-gray-400">{readTime}</span>
                </div>
                <CardTitle className="text-base mt-2 group-hover:text-yellow-700 transition-colors flex items-center gap-1">
                  {title} <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-3">{description}</CardDescription>
                <div className="flex gap-1 flex-wrap">
                  {tags.map(t => (
                    <Badge key={t} variant="secondary" className="text-xs capitalize">{t}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
