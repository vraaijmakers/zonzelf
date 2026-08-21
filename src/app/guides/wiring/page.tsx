import Link from 'next/link'
import { Cable, Calculator } from 'lucide-react'
import {
  GuideBreadcrumb, GuideDisclaimer, GuideHeader, Note, NextSteps, Tldr, Warn,
} from '@/components/guides/GuideChrome'

export const metadata = {
  title: 'Cables, Thickness, and Why It Matters — ZonZelf Guide',
  description: 'Wire gauge in plain English: why solar cables run thick, what voltage drop is, and the mistakes that start fires. Pairs with the AWG calculator.',
}

export default function WiringGuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <GuideBreadcrumb current="Cables and thickness" />
      <GuideHeader
        badges={['Wiring', 'Safety']}
        minutes="9 min read"
        title="Cables, Thickness, and Why It Matters"
        lede="Solar and battery cables carry a lot of current at a relatively low voltage. Thin wire gets hot, wastes energy, and is how a “small” DIY system becomes a fire. Thickness is not a style choice."
      />
      <GuideDisclaimer />

      <Tldr>
        <p>
          Pick cable so it stays cool <em>and</em> so the voltage at the far end is still
          close to what you started with. The{' '}
          <Link href="/calculators/awg" className="text-zon-gold-deep hover:underline">cable calculator</Link>{' '}
          does both checks. Default to the in-wall table, not the “battery cable” table.
        </p>
        <p>
          The fuse or breaker has to protect the <em>wire</em>, not just the gadget on
          the end. And you measure cable length one way — the calculator already counts
          the return wire.
        </p>
      </Tldr>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">What AWG even is</h2>
        <p className="text-zon-body mb-4">
          <strong>AWG</strong> is American Wire Gauge: a size number for copper cable.
          The confusing bit: the number gets <em>smaller</em> as the cable gets{' '}
          <em>thicker</em>. AWG 10 is thicker than AWG 14. 2/0 (said “two-aught”) is
          thicker still.
        </p>
        <p className="text-zon-body">
          In the Netherlands and much of Europe, the same idea is sold in{' '}
          <strong>mm²</strong> (square millimetres of copper). AWG 10 is roughly 6 mm²;
          AWG 6 is roughly 16 mm². Convert, then have someone who knows NEN 1010 check
          — this site’s calculator speaks AWG because that is what most DIY solar
          datasheets still print.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Two different jobs for a cable</h2>
        <p className="text-zon-body mb-4">
          <strong>1. Don’t overheat.</strong> Every cable size has a maximum current it
          can carry all day without cooking its insulation. That limit depends on
          whether the cable is in open air or stuffed in a wall or conduit. Open-air
          “chassis” ratings look generous. They are the wrong table for anything in a
          wall.
        </p>
        <p className="text-zon-body mb-4">
          <strong>2. Don’t lose too much voltage on the way.</strong> Copper is not a
          perfect pipe. A long, thin run drops voltage — the battery or panel at the
          far end is not the number you think it is, and the missing volts turn into
          heat in the cable. 3% drop is a common target. Critical runs (the ones that
          keep a fridge alive) often aim tighter.
        </p>
        <p className="text-zon-body">
          A cable can pass the heat test and still fail the drop test on a long 12 V
          run. That is why the calculator shows both.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Length is one way, current is round trip</h2>
        <p className="text-zon-body mb-4">
          Measure the distance from A to B once — panel to controller, battery to
          inverter. The electricity has to come back on a second wire, so the
          calculator doubles that length for you. If you already doubled it by hand,
          you will pick a cable that is thicker than you need (safe, just expensive).
        </p>
        <Note>
          <p>
            12 V systems need much thicker cable than 48 V for the same power, because
            current is four times higher. That is the real reason people move to 48 V
            as systems get bigger — not fashion.
          </p>
        </Note>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">The fuse protects the wire</h2>
        <p className="text-zon-body mb-4">
          A fuse or breaker is there so that if something shorts, the thin part of the
          circuit opens before the cable becomes a heater. Size the fuse for the{' '}
          <em>cable’s</em> safe current, and put it as close as you can to the battery
          (the biggest energy store). A fat battery with a skinny unfused lead is a
          classic DIY fire.
        </p>
        <p className="text-zon-body">
          The calculator does <strong>not</strong> pick your fuse. That is a local-code
          and datasheet job.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Mistakes we see over and over</h2>
        <ul className="text-zon-body space-y-2 list-disc pl-5">
          <li>Using speaker wire, extension-cord cable, or household lamp flex on a battery.</li>
          <li>Picking thickness from a “chassis” chart, then running that cable through a wall.</li>
          <li>No fuse at the battery, or a fuse bigger than the wire can survive.</li>
          <li>Measuring a 12 V drop with a 230 V mindset — a 1 V drop on 12 V is already 8%.</li>
          <li>Mixing AC and DC in the same conduit without the separations the code requires.</li>
          <li>Loose lugs. A hot terminal is a loose terminal. Tighten to the spec, then check after a week of use.</li>
        </ul>
      </section>

      <Warn>
        <p>
          Battery cables can deliver hundreds of amps into a short. Rings, watches, and
          uninsulated tools on a live bus bar are how people weld jewellery to a terminal.
          Isolate the battery before you work. If that sentence makes you nervous, that
          is the right instinct — get help.
        </p>
      </Warn>

      <div className="mt-10">
        <NextSteps
          items={[
            { href: '/calculators/awg', title: 'Cable AWG calculator', sub: 'Thickness from current, length, and voltage', Icon: Calculator },
            { href: '/guides/grounding', title: 'Earth grounding', sub: 'Where the safety path goes', Icon: Cable },
          ]}
        />
      </div>
    </div>
  )
}
