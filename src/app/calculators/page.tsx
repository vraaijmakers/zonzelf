import Link from 'next/link'
import { Zap, Battery, Sun, Cable, Plug, PanelsTopLeft, ClipboardList, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CALC_STEPS, TOTAL_STEPS, type StepId } from '@/lib/calc-steps'

/**
 * The index and the step spine read from the same list, so they cannot drift.
 * Before this, the index advertised four calculators and labelled cable sizing
 * "Any time" while the flow treated it as the end of the chain — and neither
 * mentioned that a real system also needs an inverter and a charge controller.
 */
const DETAIL: Record<StepId, { icon: LucideIcon; description: string }> = {
  load: {
    icon: Zap,
    description: 'Enter your appliances (watts × hours/day) to find your daily kWh consumption. The foundation of every system design.',
  },
  battery: {
    icon: Battery,
    description: 'Given your daily kWh, how many days you want to ride out, and your battery chemistry, get the kWh and Ah you need — and the real models that add up to it.',
  },
  panels: {
    icon: Sun,
    description: 'Enter your daily kWh need and local peak sun hours (annual average, plus the worst month) to get a panel count as a band, and a check that the array can refill the bank.',
  },
  inverter: {
    icon: Plug,
    description: 'Continuous watts is the easy half. The half that catches people out is surge: a fridge or a pump can pull two to three times its running watts for a second at start-up.',
  },
  controller: {
    icon: PanelsTopLeft,
    description: 'How many panels you can wire in series before the string exceeds your controller’s maximum input — including the cold-temperature correction that catches out an array sized in July.',
  },
  protection: {
    icon: Cable,
    description: 'See which cable sizes your run allows, and the fuse or breaker that can protect them — arithmetic shown, not a single recommended gauge.',
  },
  system: {
    icon: ClipboardList,
    description: 'Everything you have sized and picked, on one page: what it stores, what charges it, and what it costs.',
  },
}

export default function CalculatorsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-10">
        <h1 className="mb-2 text-3xl font-bold text-zon-ink">Calculators</h1>
        <p className="text-zon-body">
          {TOTAL_STEPS} steps from your appliances to a system that works in December. Each one
          feeds the next, so start at the top — the numbers carry forward on their own.
        </p>
        <p className="mt-2 text-sm text-zon-muted">
          Steps marked <span className="font-medium">soon</span> are not built yet. They are
          listed because a system needs them: the chain does not end at cable sizing.
        </p>
      </div>

      <ol className="grid gap-5 md:grid-cols-2">
        {CALC_STEPS.map(step => {
          const { icon: Icon, description } = DETAIL[step.id]
          const built = step.href !== null

          // Same shape and same height whether the step is built or not — the
          // list reads as one chain rather than "the real ones and the rest".
          const card = (
            <Card className={`h-full transition-shadow ${built ? 'hover:shadow-md' : 'opacity-70'}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      built ? 'bg-zon-gold-tint' : 'bg-zon-rule-soft'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${built ? 'text-zon-gold-deep' : 'text-zon-muted'}`}
                      aria-hidden="true"
                    />
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      built
                        ? 'bg-zon-gold-tint text-zon-gold-deep'
                        : 'border border-dashed border-zon-rule text-zon-muted'
                    }`}
                  >
                    {built ? `Step ${step.n}` : 'Soon'}
                  </span>
                </div>
                <CardTitle
                  className={`mt-2 flex items-center gap-1 text-base ${
                    built ? 'text-zon-ink group-hover:text-zon-gold-deep' : 'text-zon-muted'
                  } transition-colors`}
                >
                  {step.label}
                  {built && (
                    <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          )

          return (
            <li key={step.id} className="contents">
              {built ? (
                <Link href={step.href!} className="group">{card}</Link>
              ) : (
                <div aria-disabled="true">{card}</div>
              )}
            </li>
          )
        })}
      </ol>

      <p className="mt-8 text-center text-sm text-zon-muted">
        All calculators run in your browser — no data is sent anywhere. Results are estimates;
        always verify with a qualified electrician for final installation.
      </p>
    </div>
  )
}
