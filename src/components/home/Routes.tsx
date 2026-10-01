import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { CALC_STEPS } from '@/lib/calc-steps'
import { cn } from '@/lib/utils'

/**
 * Three ways into the site, marked like trail difficulty (circle, square,
 * diamond) so the grade reads by shape, not by colour alone.
 *
 * Every waypoint is a page that exists. The sizing route is CALC_STEPS itself,
 * so it cannot drift from the calculators' own order; the two guide routes
 * are hand-picked, and a guide added to one belongs here only once it ships.
 */

type Waypoint = { label: string; href: string | null }

type Route = {
  grade: 'easy' | 'moderate' | 'challenging'
  gradeLabel: string
  title: string
  blurb: string
  waypoints: Waypoint[]
  featured?: boolean
}

const ROUTES: Route[] = [
  {
    grade: 'easy',
    gradeLabel: 'Easy',
    title: 'Learn the lay of the land',
    blurb: 'Never touched a battery? Start here.',
    waypoints: [
      { label: 'How a Solar System Works', href: '/guides/how-it-works' },
      { label: 'Battery Types', href: '/guides/batteries' },
      { label: 'Depth of Discharge', href: '/guides/depth-of-discharge' },
      { label: 'Solar Glossary', href: '/guides/glossary' },
    ],
  },
  {
    grade: 'moderate',
    gradeLabel: 'Moderate',
    title: 'Size my system',
    blurb: 'From the kettle to the roof, with real numbers.',
    waypoints: CALC_STEPS.map(s => ({ label: s.label, href: s.href })),
    featured: true,
  },
  {
    grade: 'challenging',
    gradeLabel: 'Challenging',
    title: 'Wire it safely',
    blurb: 'You have the parts. Now the parts that bite.',
    waypoints: [
      { label: 'Cable AWG & Wiring', href: '/guides/wiring' },
      { label: 'Earth Grounding', href: '/guides/grounding' },
      { label: 'One Ground System, Not Two', href: '/guides/one-ground-system' },
      { label: 'The AC Ground Wire', href: '/guides/ac-output-ground' },
      { label: 'Inverter Settings', href: '/guides/inverter-settings' },
    ],
  },
]

const GRADE = {
  easy: { text: 'text-zon-trail-easy', trail: 'border-zon-trail-easy' },
  moderate: { text: 'text-zon-trail-moderate', trail: 'border-zon-trail-moderate' },
  challenging: { text: 'text-zon-ink', trail: 'border-zon-ink' },
} as const

function GradeMark({ grade }: { grade: Route['grade'] }) {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
      {grade === 'easy' && <circle cx="9" cy="9" r="8" className="fill-zon-trail-easy" />}
      {grade === 'moderate' && <rect x="1.5" y="1.5" width="15" height="15" rx="2" className="fill-zon-trail-moderate" />}
      {grade === 'challenging' && <path d="M9 0.5 17.5 9 9 17.5 0.5 9Z" className="fill-zon-ink" />}
    </svg>
  )
}

export default function Routes() {
  return (
    <section id="routes" className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-zon-ink">Pick your route</h2>
        <p className="mt-2 text-zon-body">
          Three ways up the same mountain. Every marker is a guide or a calculator.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {ROUTES.map(route => {
          const first = route.waypoints.find(w => w.href)?.href
          return (
            <div
              key={route.title}
              className={cn(
                'flex flex-col gap-5 rounded-2xl border p-6',
                route.featured ? 'border-2 border-zon-gold bg-zon-gold-tint' : 'bg-card',
              )}
            >
              <div className={cn('flex items-center gap-2 text-xs font-medium uppercase tracking-wider', GRADE[route.grade].text)}>
                <GradeMark grade={route.grade} />
                {route.gradeLabel} · {route.waypoints.length} markers
              </div>
              <div>
                <h3 className="text-xl font-bold text-zon-ink">{route.title}</h3>
                <p className="mt-1 text-sm text-zon-muted">{route.blurb}</p>
              </div>
              <ol className={cn('ml-[7px] flex flex-col gap-3 border-l-[3px] border-dashed pl-5 text-[15px]', GRADE[route.grade].trail)}>
                {route.waypoints.map(w => (
                  <li key={w.label}>
                    {w.href ? (
                      <Link href={w.href} className="text-zon-ink hover:text-zon-gold-deep hover:underline">
                        {w.label}
                      </Link>
                    ) : (
                      <span className="text-zon-muted">{w.label} (coming)</span>
                    )}
                  </li>
                ))}
              </ol>
              {first && (
                <Link
                  href={first}
                  data-umami-event="route-start"
                  data-umami-event-grade={route.grade}
                  className={cn(
                    'mt-auto inline-flex items-center gap-1 text-sm font-semibold',
                    route.featured
                      ? 'justify-center rounded-lg bg-zon-gold px-4 py-3 text-zon-ink hover:bg-zon-gold-deep'
                      : 'text-zon-gold-deep hover:underline',
                  )}
                >
                  Start this route {!route.featured && <ChevronRight className="w-4 h-4" />}
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
