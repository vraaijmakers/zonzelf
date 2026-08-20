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
    description: 'Given your daily kWh, number of days of autonomy, and battery chemistry (with DoD), get the Ah and kWh you need.',
    level: 'Step 2',
  },
  {
    icon: Sun,
    slug: 'panels',
    title: 'Solar Panel Sizing',
    description: 'Enter your daily kWh need and local peak sun hours to get recommended panel wattage and array size.',
    level: 'Step 3',
  },
  {
    icon: Cable,
    slug: 'awg',
    title: 'Cable AWG Calculator',
    description: 'Input amps, cable length (one way), and voltage. Get the recommended AWG gauge with voltage drop percentage.',
    level: 'Any time',
  },
]

export default function CalculatorsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Calculators</h1>
        <p className="text-gray-600">
          Use these in order (load → battery → panels) to size your system from scratch. The AWG calculator can be used anytime.
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
        All calculators run in your browser — no data is sent anywhere. Results are estimates; always verify with a qualified electrician for final installation.
      </p>
    </div>
  )
}
