import Link from 'next/link'
import { Cable, Sun } from 'lucide-react'
import {
  GuideBreadcrumb, GuideDisclaimer, GuideHeader, Note, NextSteps, Tldr, Warn,
} from '@/components/guides/GuideChrome'

export const metadata = {
  title: 'Earth Grounding, in Plain English — ZonZelf Guide',
  description: 'Why a DIY solar system needs a path into the earth, what an earth rod and bonding actually do, and where GFCIs fit. Not a substitute for NEN 1010 or NEC.',
}

export default function GroundingGuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <GuideBreadcrumb current="Earth grounding" />
      <GuideHeader
        badges={['Safety', 'Wiring']}
        minutes="7 min read"
        title="Earth Grounding, in Plain English"
        lede="Grounding is the safety path: a way for fault current to go into the earth instead of through a person, and a way for a lightning-nearby surge to have somewhere to go that isn’t your inverter."
      />
      <GuideDisclaimer />

      <Tldr>
        <p>
          Metal chassis, inverter cases, and the frames of solar panels should be bonded
          together and connected to a real earth electrode (usually a rod driven into
          the ground). That is separate from the “minus” of the battery. Mixing those
          two up is a common, dangerous muddle.
        </p>
        <p>
          The exact recipe — how many rods, where the main bond lives, which sockets
          need a GFCI — is written in your local electrical code. In the Netherlands
          that is NEN 1010. This page is the why, not the drawing you build from.
        </p>
      </Tldr>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Two different “grounds”</h2>
        <p className="text-zon-body mb-4">
          People say “ground” for two things that are not the same:
        </p>
        <ul className="text-zon-body space-y-2 list-disc pl-5 mb-4">
          <li>
            <strong>The battery’s negative.</strong> One side of the DC system. It is a
            working conductor. Current is supposed to flow there every day.
          </li>
          <li>
            <strong>Protective earth.</strong> The safety conductor — the green/yellow
            wire, the metal box, the rod in the dirt. Current is <em>not</em> supposed
            to flow there in normal use. It is the escape hatch when something fails.
          </li>
        </ul>
        <p className="text-zon-body">
          Some systems connect them at exactly one point (so a fault has a path). Some
          DC systems stay isolated. Which one you have is a design choice the inverter
          manual and the code have to agree on. You do not improvise a third option.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">The pieces you will hear about</h2>
        <p className="text-zon-body mb-4">
          <strong>Earth rod (earth electrode).</strong> A copper-coated rod driven into
          the soil, or an equivalent the code allows. This is the actual connection to
          the planet. A water pipe is not a substitute — plastic plumbing made that
          shortcut unsafe years ago.
        </p>
        <p className="text-zon-body mb-4">
          <strong>Bonding.</strong> Connecting all the exposed metal together (inverter
          case, panel frames, metal roof, battery rack) so nothing can sit at a
          surprise voltage relative to something you might touch. Bonding is the
          “everything metal is one piece” step. The rod is how that piece meets earth.
        </p>
        <p className="text-zon-body mb-4">
          <strong>GFCI / RCD.</strong> A gadget that watches whether the current going
          out on the live wire comes back on the neutral. If some of it is leaking —
          possibly through a person — it trips in milliseconds. Wet rooms, outdoors,
          and many inverter outputs want one. It does not replace earthing; it is a
          second kind of protection.
        </p>
        <p className="text-zon-body">
          <strong>SPD (surge protection).</strong> A block that tries to swallow a
          voltage spike (nearby lightning, grid blip) before it punches through the
          inverter. Not a lightning rod, and not a guarantee — but cheap insurance on
          a long DC run from the roof.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Panel frames</h2>
        <p className="text-zon-body mb-4">
          Solar panels sit outside, get rained on, and can pick up a charge from the
          weather. Their aluminium frames are usually bonded to each other and then to
          earth. The current-carrying solar cables are a different circuit — don’t
          assume the frame wire is doing the same job as the PV minus.
        </p>
        <Note>
          <p>
            Roof arrays also need a way for a firefighter or you to know the DC is
            isolated. That is a disconnect, not a ground rod. Different tool, same
            “don’t invent this at 9pm” energy.
          </p>
        </Note>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Mistakes that hurt people</h2>
        <ul className="text-zon-body space-y-2 list-disc pl-5 mb-4">
          <li>No earth rod at all on an off-grid cabin, “because there’s no grid.” Shock still exists.</li>
          <li>Bonding in three places instead of one, so current takes a scenic route through a water pipe or a neighbour’s metal fence.</li>
          <li>Using the battery negative as the only “earth” and skipping the rod.</li>
          <li>Leaving inverter chassis un-bonded because “it’s in a plastic shed.” The chassis is still metal.</li>
          <li>Skipping a GFCI on a bathroom or outdoor socket fed from the inverter.</li>
        </ul>
      </section>

      <Warn>
        <p>
          Grounding mistakes are how people get bitten by a “dead” case, and how a
          fault sets a shed on fire instead of tripping a breaker. If you are not sure
          where the single main bond goes, that is an electrician question, not a
          forum question. Local code always wins over this page.
        </p>
      </Warn>

      <div className="mt-10">
        <NextSteps
          items={[
            { href: '/guides/wiring', title: 'Cables and thickness', sub: 'The other half of not starting a fire', Icon: Cable },
            { href: '/guides/how-it-works', title: 'How a solar system works', sub: 'Where each box sits in the chain', Icon: Sun },
          ]}
        />
      </div>
    </div>
  )
}
