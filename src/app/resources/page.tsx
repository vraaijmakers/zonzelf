import Link from 'next/link'
import { Video, MessagesSquare, FileText, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const metadata = {
  title: 'Resources — ZonZelf',
  description: 'Curated YouTube channels, community forums, and manufacturer docs for DIY solar builders.',
}

interface Resource {
  title: string
  description: string
  href: string
}

interface ResourceGroup {
  icon: typeof Video
  label: string
  items: Resource[]
}

// A starting list, not exhaustive — verified as real and active as of 2026-08-20.
// Grows over time; add entries here rather than building a CMS for this yet.
const GROUPS: ResourceGroup[] = [
  {
    icon: Video,
    label: 'YouTube channels',
    items: [
      {
        title: 'Will Prowse — DIY Solar Power',
        description: 'Equipment reviews, deep dives, and full off-grid build walkthroughs. One of the most trusted names in DIY solar.',
        href: 'https://www.youtube.com/@WillProwse',
      },
      {
        title: 'Off-Grid Garage',
        description: 'Battery and BMS testing, real off-grid builds, and plain explanations of the electronics involved.',
        href: 'https://www.youtube.com/@OffGridGarageAustralia',
      },
    ],
  },
  {
    icon: MessagesSquare,
    label: 'Community & forums',
    items: [
      {
        title: 'DIY Solar Power Forum',
        description: 'The largest DIY solar community — active troubleshooting threads, build logs, and component recommendations.',
        href: 'https://diysolarforum.com',
      },
      {
        title: 'Victron Community',
        description: "Victron's official Q&A forum for their inverters, charge controllers, and monitoring gear.",
        href: 'https://community.victronenergy.com',
      },
    ],
  },
  {
    icon: FileText,
    label: 'Manufacturer docs',
    items: [
      {
        title: 'Victron Energy Manuals',
        description: 'Official manuals and datasheets for Victron inverters, MPPTs, and battery monitors.',
        href: 'https://www.victronenergy.com/manuals',
      },
      {
        title: 'Renogy Manuals & Downloads',
        description: 'Official manuals and quick guides for Renogy panels, controllers, inverters, and batteries.',
        href: 'https://www.renogy.com/pages/manuals-download',
      },
    ],
  },
]

export default function ResourcesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Resources</h1>
        <p className="text-gray-600">
          Hand-picked YouTube channels, forums, and manufacturer docs — a starting point, not
          the whole internet. These are external sites we don&apos;t control; see our{' '}
          <Link href="/disclaimer" className="text-yellow-700 hover:underline">disclaimer</Link>.
        </p>
      </div>

      <div className="space-y-10">
        {GROUPS.map(({ icon: Icon, label, items }) => (
          <div key={label}>
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
              <Icon className="w-4 h-4" /> {label}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {items.map((item) => (
                <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-start justify-between gap-2">
                        {item.title}
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-1" aria-hidden="true" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{item.description}</CardDescription>
                      <span className="sr-only">(opens in a new tab)</span>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
