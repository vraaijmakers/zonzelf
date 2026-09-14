import Link from 'next/link'
import { Battery, Zap } from 'lucide-react'
import {
  GuideBreadcrumb, GuideDisclaimer, GuideHeader, Note, NextSteps, Tldr, Warn,
} from '@/components/guides/GuideChrome'

export const metadata = {
  title: 'Inverter Settings Without the Manual-Speak — ZonZelf Guide',
  description: 'What bulk, absorb, and float actually do, how to stop the inverter emptying the battery, and why generator input is its own setting. Starting points, not a cheat sheet for your model.',
}

export default function InverterSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <GuideBreadcrumb current="Inverter settings" />
      <GuideHeader
        badges={['Inverter', 'Intermediate']}
        minutes="11 min read"
        title="Inverter Settings Without the Manual-Speak"
        lede="The inverter is doing two jobs in one box: turning battery power into wall power, and (on most hybrids) helping charge the battery. The settings are just those two jobs, named like an engineer labelled them in 1998."
      />
      <GuideDisclaimer />

      <Tldr>
        <p>
          Set the battery type first. Everything else — how full is full, when to stop
          using the battery, whether a generator is allowed to help — hangs off that.
          Lithium and lead-acid do not share a profile. Never copy a neighbour’s numbers
          onto a different chemistry or a different size of pack.
        </p>
        <p>
          The numbers in this guide are a picture of the idea. Your battery datasheet
          and your inverter manual are the source of truth. Victron, Sun Gold / SunGold
          Power, and Growatt all hide the same jobs behind different menu names.
        </p>
      </Tldr>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">The two jobs</h2>
        <p className="text-zon-body mb-4">
          <strong>Supplying the house.</strong> Battery (or the shared DC supply) →
          inverter → sockets. Settings here include when to stop if the battery is too
          empty, and what to do if a generator or the grid is present.
        </p>
        <p className="text-zon-body">
          <strong>Charging the battery.</strong> Solar (through the charge controller)
          and sometimes a generator push energy into the battery. Settings here are
          the slow, staged fill described next. On a hybrid inverter both jobs live in
          one menu. They are still two jobs.{' '}
          <Link href="/guides/how-it-works" className="text-zon-gold-deep hover:underline">
            How a solar system works
          </Link>{' '}
          is the picture.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Bulk, absorb, float — the slow fill</h2>
        <p className="text-zon-body mb-4">
          Charging is not “full speed until the tank overflows.” A decent charger
          fills in stages:
        </p>
        <ul className="text-zon-body space-y-2 list-disc pl-5 mb-4">
          <li>
            <strong>Bulk</strong> — the fast part. Current is high, voltage climbs.
            Most of the energy goes in here.
          </li>
          <li>
            <strong>Absorb</strong> (sometimes “absorption”) — the top-up. Voltage
            holds at a set point and current tapers as the battery fills. Skip this
            on lithium and you may never quite get to full; overdo it on gel and you
            can damage the battery.
          </li>
          <li>
            <strong>Float</strong> — the “keep it full” trickle once the battery is
            actually full. Lead-acid likes a lower float than its absorb voltage.
            Many lithium banks prefer float equal to (or very close to) absorb, or
            a rest. The datasheet, not a forum screenshot, decides.
          </li>
        </ul>
        <p className="text-zon-body mb-4">
          Equalise is a special, higher-voltage stage some flooded lead-acid banks
          want occasionally. It is not for lithium, not for gel, and not “because
          the menu has it.”
        </p>
        <Note>
          <p>
            Typical 12 V neighbourhoods, only so you recognise the shape of the
            numbers: lithium absorb often sits around 14.2–14.6 V; AGM around
            14.4–14.8 V; gel lower and slower. Multiply by two for 24 V, by four
            for 48 V. Then throw these numbers out and use the sheet that came
            with <em>your</em> battery.
          </p>
        </Note>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">When to stop using the battery</h2>
        <p className="text-zon-body mb-4">
          This is the other job: don’t empty the tank. Lithium voltage is a bad
          stand-in for “percent remaining.” Lead-acid is better if you measure it
          with everything off. The full plain-English version is the{' '}
          <Link href="/guides/depth-of-discharge" className="text-zon-gold-deep hover:underline">
            how deep can you drain a battery
          </Link>{' '}
          guide — worth reading before you type a cutoff voltage into a menu.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Generator input</h2>
        <p className="text-zon-body mb-4">
          A generator is a noisy, thirsty way to buy solar you didn’t harvest today.
          On many hybrids (Sun Gold / SunGold Power included) the generator plugs
          into an AC-in port and the inverter decides when to wake it, how hard to
          charge from it, and when to let go.
        </p>
        <p className="text-zon-body mb-4">
          The settings that usually matter:
        </p>
        <ul className="text-zon-body space-y-2 list-disc pl-5 mb-4">
          <li>When to start (battery percent or voltage too low, or a big load appears).</li>
          <li>How many amps the charger is allowed to pull — a 3 kW generator cannot feed a 6 kW charge setting.</li>
          <li>Whether the house load and the charger share that generator, so you don’t stall it.</li>
          <li>When to stop (battery full enough that solar can take over).</li>
        </ul>
        <p className="text-zon-body">
          Menu numbers differ by model — Sun Gold “Program 01 / 05 / 26” is not
          Growatt “work mode”, is not Victron ESS. Read the page in <em>your</em>
          manual titled battery type, AC input, or generator. If the generator
          needs a warm-up or a two-wire auto-start, that is extra wiring, not a
          hidden menu.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">A sane order to set things</h2>
        <ol className="text-zon-body space-y-2 list-decimal pl-5 mb-4">
          <li>Battery type / chemistry — lithium vs AGM vs gel vs flooded.</li>
          <li>Bank voltage (12 / 24 / 48) — must match the actual pack.</li>
          <li>Charge voltages (absorb, float) from the battery datasheet.</li>
          <li>Stop-using-the-battery (percent remaining, or a resting voltage you understand).</li>
          <li>Charge current limit — so you don’t ask a small generator or thin cable to do a large inverter’s job.</li>
          <li>Generator / grid rules, last, once the battery is being treated kindly.</li>
        </ol>
        <p className="text-zon-body">
          Victron’s manuals are usually the clearest write-up of the same ideas
          everyone else implements. Use them as a teacher, not as settings for a
          Sun Gold.
        </p>
      </section>

      <Warn>
        <p>
          Wrong charge voltages are a quiet way to ruin a bank: too high cooks
          lead-acid and can trip a lithium BMS forever; too low leaves you
          “full” when you are not. If the inverter has a lithium preset, start
          there, then confirm against the battery sheet. Do not mix old and new
          batteries on the same settings and hope.
        </p>
      </Warn>

      <div className="mt-10">
        <NextSteps
          items={[
            { href: '/guides/depth-of-discharge', title: 'How deep can you drain a battery?', sub: 'The stop-using-it half of these menus', Icon: Zap },
            { href: '/guides/batteries', title: 'Battery types', sub: 'Match the profile to the chemistry', Icon: Battery },
          ]}
        />
      </div>
    </div>
  )
}
