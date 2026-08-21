import Link from 'next/link'
import { Zap, Battery, Sun, Cable, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CALCULATORS = [
  {
    icon: Zap,
    slug: 'load',
    title: 'Load Calculator',
    description: 'Enter your appliances (watts × hours/day) to find your daily kWh consumption. The foundation of every system design.',
    level: 'Start here',
  },
  {
    icon: Battery,
    slug: 'battery',
    title: 'Battery Bank Sizing',
    description: 'Given your adjusted daily kWh, days of autonomy, and chemistry (with DoD), get a starting Ah and kWh estimate — not a shopping list.',
    level: 'Step 2',
  },
  {
    icon: Sun,
    slug: 'panels',
    title: 'Solar Panel Sizing',
    description: 'Enter your adjusted daily kWh and local peak sun hours (annual or worst month) for a starting array size. Warns if the array cannot cover the daily draw.',
    level: 'Step 3',
  },
  {
    icon: Cable,
    slug: 'awg',
    title: 'Cable AWG Calculator',
    description: 'Input amps, one-way length, and voltage. Starting AWG from a cited NEC 75°C table (optional chassis mode) plus voltage drop.',
    level: 'Any time',
  },
]

export default function CalculatorsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Calculators</h1>
        <p className="text-gray-600">
          Use these in order (load → battery → panels) to size a starting estimate from scratch.
        Losses are applied once on the load calculator; the AWG tool can be used anytime.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {CALCULATORS.map(({ icon: Icon, slug, title, description, level }) => (
          <Link key={slug} href={`/calculators/${slug}`} className="group">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-yellow-700" />
                  </div>
                  <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
                    {level}
                  </span>
                </div>
                <CardTitle className="text-base mt-2 group-hover:text-yellow-700 transition-colors flex items-center gap-1">
                  {title} <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-sm text-gray-500 mt-8 text-center">
        All calculators run in your browser — no data is sent anywhere. Results are starting
        estimates, not a specification. Verify with a qualified electrician before you buy or wire.
      </p>
    </div>
  )
}
