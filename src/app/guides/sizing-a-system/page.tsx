import type { ReactNode } from 'react'
import Link from 'next/link'
import { Calculator, Sun, Workflow } from 'lucide-react'
import {
  GuideBreadcrumb, GuideHeader, Tldr, Note, GuideDisclaimer, NextSteps,
} from '@/components/guides/GuideChrome'
import {
  SizingYardMap, SizingHopNav, SizingOrderCompare, SizingComic,
} from '@/components/guides/SizingStory'

export const metadata = {
  title: 'From the Kettle to the Roof — Why We Size in This Order — ZonZelf Guide',
  description:
    'The calculators are seven steps, not seven tools. A picture of the walk: why you start at your appliances, pick the inverter before the panels, and only then size the cables.',
}

/**
 * The lecture behind the calculator chain.
 *
 * /guides/how-it-works is what the boxes do. This page is why we visit them
 * in this order. The pictures do the 40,000-ft work; the long guides and the
 * calculators keep the details. No beat emits a protection number — guides
 * teach, calculators show the derivation.
 */

function H2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-3 mt-10 text-2xl font-bold text-zon-ink scroll-mt-24">
      {children}
    </h2>
  )
}

function P({ children }: { children: ReactNode }) {
  return <p className="mb-4 text-zon-body">{children}</p>
}

export default function SizingASystemGuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <GuideBreadcrumb current="From the Kettle to the Roof" />
      <GuideHeader
        badges={['Fundamentals', 'Beginner']}
        minutes="5 min read"
        title="From the Kettle to the Roof"
        lede="The calculators are seven steps, not seven tools. Here is the walk as a picture, so the long guides have a map."
      />

      <Tldr>
        <p>
          You start at the kettle, not the roof. Size what the house uses, then
          what stores it, then the box that runs it — and only then the panels
          that have to fit that box. Wiring, cables, and a final look at the
          whole pile come after. The order is the opposite of how the hardware
          is wired, on purpose.
        </p>
      </Tldr>

      <div className="mb-3 overflow-x-auto rounded-xl border border-zon-rule bg-zon-cream">
        <SizingYardMap />
      </div>
      <SizingHopNav />
      <p className="mt-2 mb-8 text-xs text-zon-muted">
        The yard. Numbered in the order we size, which is not the order current
        flows. Jump to a stop, or just keep scrolling.
      </p>

      <H2 id="two-orders">The two orders</H2>
      <P>
        There is already a guide for{' '}
        <Link href="/guides/how-it-works" className="text-zon-gold-deep hover:underline">
          how a solar system works
        </Link>
        — panel, controller, battery, inverter, house. That is the physical
        path of current. It is not how you size the thing. Sizing starts at
        the load and walks the other way, because every later number is just
        “enough to cover what you already measured.”
      </P>
      <SizingOrderCompare />
      <P>
        A beginner who starts with panels is designing against a house they
        have not measured and an inverter they have not picked. The rest of
        this page is that sentence, drawn.
      </P>

      <H2 id="the-walk">The walk</H2>
      <P>
        Same stick figure throughout. Each picture is the <em>why</em> of that
        stop. The calculator behind it still does the arithmetic — including
        the protection figures this page will not print.
      </P>

      <SizingComic />

      <div className="mt-10">
        <Note>
          Step 6 is the one that can start a fire if it is wrong. The cartoon
          only says the stop exists. Conductor gauge and the fuse that protects
          it are worked out — with the code table and the arithmetic showing —
          on the{' '}
          <Link href="/calculators/awg" className="text-zon-gold-deep hover:underline">
            cable &amp; protection calculator
          </Link>
          .
        </Note>
      </div>

      <div className="mt-8">
        <GuideDisclaimer />
      </div>

      <NextSteps
        items={[
          {
            href: '/calculators/load',
            title: 'Start at your loads',
            sub: 'Step 1 of 7 — walk the house with a clipboard',
            Icon: Calculator,
          },
          {
            href: '/guides/how-it-works',
            title: 'How a solar system works',
            sub: 'What the boxes do, once you have sized them',
            Icon: Sun,
          },
          {
            href: '/calculators',
            title: 'All seven calculators',
            sub: 'The chain, as tools',
            Icon: Workflow,
          },
        ]}
      />
    </div>
  )
}
