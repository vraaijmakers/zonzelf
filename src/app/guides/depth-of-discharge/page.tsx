import Link from 'next/link'
import { Battery, Calculator } from 'lucide-react'
import {
  GuideBreadcrumb, GuideDisclaimer, GuideHeader, Note, NextSteps, Tldr, Warn,
} from '@/components/guides/GuideChrome'

export const metadata = {
  title: 'How Deep Can You Drain a Battery? — ZonZelf Guide',
  description: 'Depth of discharge in plain English: why leaving some charge in the battery makes it last, and how to tell the inverter when to stop — without treating voltage as a magic number.',
}

export default function DepthOfDischargePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <GuideBreadcrumb current="How deep can you drain a battery?" />
      <GuideHeader
        badges={['Batteries', 'Beginner']}
        minutes="6 min read"
        title="How Deep Can You Drain a Battery?"
        lede="The label on a battery is the whole tank. You are not supposed to run that tank to empty. How much you leave in it is the single setting that most decides whether the bank lasts three years or ten."
      />
      <GuideDisclaimer />

      <Tldr>
        <p>
          Use about <strong>80%</strong> of a lithium (LiFePO4) battery, and about{' '}
          <strong>50%</strong> of a lead-acid battery (AGM, gel, or flooded). The leftover
          is not wasted — it is what keeps the battery healthy.
        </p>
        <p>
          Lithium voltage barely changes until the battery is almost empty, so “stop at
          X volts” is a poor way to enforce that 20% reserve. Tell the inverter to stop
          on <strong>percent remaining</strong> if you can. Lead-acid voltage is more
          honest, if you measure it with everything off.
        </p>
      </Tldr>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">The tank, not the label</h2>
        <p className="text-zon-body mb-4">
          A “100 Ah” battery is like a 100-litre tank. <strong>Depth of discharge</strong> —
          often shortened to DoD — is how much of that tank you actually use before you
          recharge. Use 80 litres and leave 20, and you have used 80% DoD. The 20 litres
          still in the tank is your reserve.
        </p>
        <p className="text-zon-body mb-4">
          The matching idea is <strong>state of charge</strong> (SoC): how full the tank
          is right now. 80% used means 20% remaining. Same fact, two names. People say
          “don’t go below 20%” and “don’t go past 80% DoD” and mean the same stop sign.
        </p>
        <p className="text-zon-body">
          Why leave anything in the tank? Draining a battery to empty, over and over,
          is what wears it out early. Lithium is more forgiving than lead-acid, which
          is why you can use more of it. The{' '}
          <Link href="/guides/batteries" className="text-zon-gold-deep hover:underline">battery types guide</Link>{' '}
          is the longer version of that trade-off.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">What “80%” and “50%” mean in real numbers</h2>
        <p className="text-zon-body mb-4">
          Suppose you need 4 kWh of usable energy a day (lights, fridge, laptop — after
          the system’s own losses).
        </p>
        <ul className="text-zon-body space-y-2 list-disc pl-5 mb-4">
          <li>
            <strong>Lithium, use 80%:</strong> you need a 5 kWh bank. Four of every five
            kilowatt-hours on the label are yours; one stays in the battery.
          </li>
          <li>
            <strong>Lead-acid, use 50%:</strong> you need an 8 kWh bank. Half the label
            is off-limits if you want the battery to last.
          </li>
        </ul>
        <p className="text-zon-body">
          That is why a “cheaper per kWh” lead-acid bank is often not cheaper once you
          buy the extra capacity. The{' '}
          <Link href="/calculators/battery" className="text-zon-gold-deep hover:underline">battery calculator</Link>{' '}
          does this multiplication for you.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Telling the inverter when to stop</h2>
        <p className="text-zon-body mb-4">
          The inverter is the box that turns battery power into the wall-socket power
          your house uses. It can also be told: “if the battery gets this empty, stop,
          so we don’t wreck it.” That stop is what manuals call a low-voltage disconnect
          or inverter cutoff. In this guide we just call it <strong>when to stop</strong>.
        </p>
        <p className="text-zon-body mb-4">
          <strong>Lithium (LiFePO4):</strong> the voltage you would read on a meter stays
          almost the same from “quite full” to “nearly empty.” A single voltage number
          cannot mean “leave 20% in the tank.” Use the battery’s built-in manager (the
          BMS) or a battery monitor that reports <strong>percent remaining</strong>. If
          the inverter only has a voltage setting, a rough “everything off” floor is
          about 12.8–13.0 V on a 12 V pack, 25.6–26.0 V on 24 V, 51.2–52.0 V on 48 V.
          12.0 V on a 12 V lithium pack is nearly empty — not 20% left.
        </p>
        <p className="text-zon-body mb-4">
          <strong>Lead-acid (AGM, gel, flooded):</strong> voltage is a better clue, but
          only after the system has sat still for an hour or two — nothing charging,
          nothing running. Around 12.1–12.2 V (24.2–24.4 V, 48.4–48.8 V) is the
          “about half empty” neighbourhood. 11.8 V <em>while things are running</em> on
          a 12 V bank is already past halfway.
        </p>
        <Note>
          <p>
            Always check the battery’s own datasheet. These ranges are a starting
            picture, not a setting to punch in and forget. Under load, voltage sags —
            copying a resting number into a running cutoff will stop you too late.
          </p>
        </Note>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">A common mix-up</h2>
        <p className="text-zon-body mb-4">
          The inverter cutoff is not the same as the charge controller’s “full” settings.
          One says when to <em>stop taking energy out</em>. The other says how to{' '}
          <em>put energy back in</em> without overcharging. Both have to match the
          chemistry. Mixing a lithium “full” voltage with a lead-acid “stop” voltage
          is how banks get damaged in a weekend.
        </p>
        <p className="text-zon-body">
          Charging stages — the slow fill at the end — live in the{' '}
          <Link href="/guides/inverter-settings" className="text-zon-gold-deep hover:underline">inverter settings guide</Link>.
        </p>
      </section>

      <Warn>
        <p>
          If a battery is swelling, hot, or smelling like rotten eggs (flooded lead-acid
          overcharged), stop using the system and ventilate. That is not a settings
          problem you can click away.
        </p>
      </Warn>

      <div className="mt-10">
        <NextSteps
          items={[
            { href: '/guides/batteries', title: 'Battery types', sub: 'Which chemistry, and why', Icon: Battery },
            { href: '/calculators/battery', title: 'Battery sizing calculator', sub: 'How big a bank you actually need', Icon: Calculator },
          ]}
        />
      </div>
    </div>
  )
}
