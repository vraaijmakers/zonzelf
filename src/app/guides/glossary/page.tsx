import { Sun, Workflow } from 'lucide-react'
import {
  GuideBreadcrumb, GuideDisclaimer, GuideHeader, NextSteps,
} from '@/components/guides/GuideChrome'
import GlossaryClient from './GlossaryClient'

export const metadata = {
  title: 'Solar Glossary — ZonZelf Guide',
  description: 'Plain-English definitions for the terms you\'ll run into building a DIY solar system: SoC, DoD, MPPT, PWM, AC coupling, split-phase, and more.',
}

const ENTRIES = [
  {
    term: 'AC coupling',
    html: 'Connecting a solar inverter to the <strong>output</strong> side of a battery inverter/charger — on the "house power" wires — instead of wiring the panels straight into a DC charge controller. Common when solar is added to an existing battery system, or when the array is far from the battery. The two inverters have to talk to each other (frequency-shift or a data link) so the battery inverter can tell the solar inverter to back off once the battery is full.',
  },
  {
    term: 'Ampacity',
    html: 'How much current a cable can carry continuously without its insulation cooking. It is a property of the <em>cable in its situation</em>, not just the cable — the same copper carries less inside a wall or a conduit than lying in open air, and less again in a hot loft. Published in NEC Table 310.16 for cable in a wall or conduit, which is the conservative table the <a href="/calculators/awg">cable calculator</a> uses. Beware charts labelled "chassis" or "battery cable": those are open-air figures, often nearly double, and using them for a cable that runs through a wall is a classic way to start a fire.',
  },
  {
    term: 'AWG',
    aka: 'American Wire Gauge',
    html: 'A sizing system for copper cable. Counter-intuitively, the number gets <em>smaller</em> as the cable gets thicker — AWG 10 is thicker than AWG 14. See the <a href="/guides/wiring">cables and thickness guide</a> for how to pick a size.',
  },
  {
    term: 'Absorb',
    aka: 'absorption',
    html: 'The second stage of battery charging: voltage holds at a set point while current tapers off as the battery tops up. Comes after bulk, before float. Details in the <a href="/guides/inverter-settings">inverter settings guide</a>.',
  },
  {
    term: 'Autonomy',
    aka: 'days of autonomy',
    html: 'How many days your battery can run the house with <strong>no meaningful solar at all</strong>. It is not the same as getting through a night — a night ends with sunrise and the panels start refilling, so an ordinary night needs far less battery than a full sunless day. Confusing the two is the most expensive mistake in battery sizing, which is why the <a href="/calculators/battery">battery calculator</a> shows both side by side instead of one number.',
  },
  {
    term: 'Bonding',
    html: 'Connecting all the exposed metal in a system — inverter case, panel frames, battery rack — together, so nothing can sit at a surprise voltage relative to something you might touch. See <a href="/guides/grounding">earth grounding</a>.',
  },
  {
    term: 'BMS',
    aka: 'Battery Management System',
    html: 'The electronics built into (or attached to) a battery, usually lithium, that watches individual cell voltages and temperature and can disconnect the battery to protect it. On lithium packs, the BMS — not a voltage number — is usually the real judge of "how full."',
  },
  {
    term: 'Bulk',
    html: 'The first, fastest stage of battery charging: current is high and voltage climbs steadily. Most of the day\'s energy goes in here, before the charger switches to absorb. See <a href="/guides/inverter-settings">inverter settings</a>.',
  },
  {
    term: 'Charge controller',
    html: 'The box between the solar panels and the battery. It tames the panel\'s raw, variable output into something the battery can safely accept. The two common kinds are <strong>MPPT</strong> and <strong>PWM</strong>. See <a href="/guides/how-it-works">how a solar system works</a>.',
  },
  {
    term: 'Continuous load',
    html: 'A load whose maximum current keeps running for <strong>three hours or more</strong>. Almost everything in an off-grid system qualifies — a fridge, a router, anything charging all afternoon. It matters because the rules then require both the cable <em>and</em> its fuse to be sized at <strong>125%</strong> of that current. The margin is for heat, not for current: things that run for hours warm up the wire and its terminals in a way a short burst never does. See <a href="/guides/wiring">cables and thickness</a>.',
  },
  {
    term: 'Design current',
    html: 'The current a circuit is actually built for, as opposed to what it draws. For a <a href="/guides/glossary#continuous-load">continuous load</a> that is the running current × 1.25 — so a steady 30 A circuit is designed as 37.5 A. For a solar panel string it is × 1.56, because a panel can briefly beat its own label on a bright day <em>and</em> it runs for hours. Both the cable and the fuse are chosen from this number, never from the bare one. Sizing one of them from each is how people end up with a cable no legal fuse can protect.',
  },
  {
    term: 'DoD',
    aka: 'Depth of Discharge',
    html: 'How much of a battery\'s labelled capacity you actually use before recharging it. Draining a "100 Ah" battery to 80 Ah used is 80% DoD. The matching idea is <strong>SoC</strong> — same fact, counted from the other end. Full explanation in <a href="/guides/depth-of-discharge">how deep can you drain a battery?</a>',
  },
  {
    term: 'Duty cycle',
    html: 'The share of its plugged-in hours that an appliance actually draws power. A light bulb is 100% — switched on, it pulls its full watts. A fridge is not: its compressor cycles against a thermostat and runs roughly a third of the time in a normal kitchen, so a fridge plugged in for 24 hours is not drawing for 24 hours. Multiplying the label watts by 24 is how a 1.3 kWh/day fridge becomes a 3.6 kWh/day one on paper — and then oversizes the battery, the array and the cable behind them. The <a href="/calculators/load">load calculator</a> asks for it directly.',
  },
  {
    term: 'Equalise',
    aka: 'equalization',
    html: 'An occasional, deliberately higher-voltage charging stage some flooded lead-acid batteries want, to mix the electrolyte and reverse stratification. Not for lithium, gel, or AGM — check the datasheet before using it just because the inverter menu has it.',
  },
  {
    term: 'Float',
    html: 'The last stage of battery charging: a low "keep it full" trickle once the battery has actually reached full. Lead-acid usually wants a lower float than its absorb voltage; lithium often wants float at or near absorb. See <a href="/guides/inverter-settings">inverter settings</a>.',
  },
  {
    term: 'GFCI',
    aka: 'RCD, ground-fault protection',
    html: 'A device that watches whether the current going out on the live wire all comes back on neutral. If some is leaking — possibly through a person — it trips in milliseconds. A second layer of protection on top of, not instead of, earthing. See <a href="/guides/grounding">earth grounding</a>.',
  },
  {
    term: 'Earth rod',
    aka: 'earth electrode, ground rod',
    html: 'A conductive rod driven into the soil (or an equivalent your local code allows) that is the system\'s actual physical connection to the earth. Not the same thing as the battery\'s negative terminal. See <a href="/guides/grounding">earth grounding</a>.',
  },
  {
    term: 'Hybrid inverter',
    html: 'An inverter that combines the jobs of a charge controller/charger and a power inverter in one box — it can take in solar and/or grid/generator, charge the battery, and supply the house, all from one unit. Most DIY off-grid systems use one. See <a href="/guides/inverter-settings">inverter settings</a>.',
  },
  {
    term: 'Inverter',
    html: 'The box that turns battery (DC) power into the AC power your house sockets use — and on a hybrid inverter, also manages charging the battery. See <a href="/guides/how-it-works">how a solar system works</a>.',
  },
  {
    term: 'Isc',
    aka: 'short-circuit current',
    html: 'The current a solar panel produces into a dead short, printed on its label. It is the number PV circuits are sized from — not the panel\'s rated operating current — because it is the most current the panel can ever push. The rules then add margin on top: 125% because bright conditions with cloud edges can briefly push a panel past its own label, and 125% again because it runs for hours. See <a href="/guides/wiring">cables and thickness</a>.',
  },
  {
    term: 'kWh',
    aka: 'kilowatt-hour',
    html: 'A unit of energy — power used or produced over time. A 100 W bulb left on for 10 hours uses 1 kWh. ZonZelf\'s calculators size systems in kWh/day rather than amps, because kWh stays the same number no matter the system voltage.',
  },
  {
    term: 'LVD',
    aka: 'low-voltage disconnect, inverter cutoff',
    html: 'The point at which an inverter stops drawing from the battery to protect it from over-discharging. On lithium, voltage barely moves until the battery is nearly empty, so a single voltage number is a poor way to enforce a DoD limit — see <a href="/guides/depth-of-discharge">how deep can you drain a battery?</a>',
  },
  {
    term: 'MPPT',
    aka: 'Maximum Power Point Tracking',
    html: 'The smarter of the two common charge-controller types. It constantly hunts for the panel\'s most efficient operating point, squeezing more usable energy out of the same panel than a simpler PWM controller — especially when panel voltage is higher than battery voltage. See <a href="/guides/how-it-works">how a solar system works</a>.',
  },
  {
    term: 'OCPD',
    aka: 'fuse or breaker',
    html: 'Overcurrent protection device — the fuse or breaker on a circuit. Its job is to protect the <strong>cable</strong>, not the appliance on the end: if something shorts, it has to open before the cable becomes a heater. That gives it two limits. It must be big enough not to trip on the normal <a href="/guides/glossary#design-current">design current</a>, and small enough that the cable can survive whatever it lets through. If no real fuse size fits between those two, the cable is too thin — the fix is thicker cable, never a bigger fuse. On the DC side it must also be <em>DC-rated</em>: an AC-only breaker will not reliably break a DC fault, because DC never crosses zero to help the arc go out.',
  },
  {
    term: 'Peak sun hours',
    html: 'A way of measuring how much sunlight a location gets, expressed as the number of hours per day of "full strength" (1000 W/m²) sun that would deliver the same total energy as the real, varying sunlight actually did. Regional averages are typically annual figures — the real number swings a lot by season.',
  },
  {
    term: 'PWM',
    aka: 'Pulse Width Modulation',
    html: 'The simpler, cheaper of the two common charge-controller types. It essentially switches the panel on and off rapidly to regulate charging, but wastes more of the panel\'s potential output than MPPT, particularly when panel voltage is well above battery voltage. See <a href="/guides/how-it-works">how a solar system works</a>.',
  },
  {
    term: 'Round-trip efficiency',
    html: 'Energy out divided by energy in, for a battery. Put 10 kWh into a lithium pack and you get roughly 9.6 back; a flooded lead-acid bank returns closer to 7.5. The missing part becomes heat while charging. It matters for <em>panel</em> sizing rather than battery sizing: the bank is sized by what it must hand to the inverter, but the array has to generate everything the bank will lose as well. A flooded system therefore needs noticeably more panel than a lithium one for the same daily use. Ranges per chemistry are in the <a href="/guides/batteries">battery types guide</a>.',
  },
  {
    term: 'SoC',
    aka: 'State of Charge',
    html: 'How full a battery is right now, as a percentage. 20% remaining is the same fact as 80% DoD used — just counted from the other end. See <a href="/guides/depth-of-discharge">how deep can you drain a battery?</a>',
  },
  {
    term: 'SPD',
    aka: 'surge protection device',
    html: 'A component that tries to absorb a voltage spike — nearby lightning, a grid blip — before it reaches and damages the inverter. Not a lightning rod and not a guarantee, but cheap insurance on a long DC run from a roof array. See <a href="/guides/grounding">earth grounding</a>.',
  },
  {
    term: 'Split-phase',
    html: 'A common way of wiring a house\'s AC supply as two 120 V "legs" that are out of phase with each other, so a 240 V appliance can be fed by using both legs together (mainly a North American convention). An inverter or generator described as "split-phase" or "120/240 V" is built to produce that pair, not a single 230 V feed like most of Europe.',
  },
  {
    term: 'Voltage drop',
    html: 'The loss of voltage along a cable run, caused by the cable\'s own resistance. Longer and thinner cables drop more. A cable can be thick enough to avoid overheating and still lose too much voltage over a long run — see <a href="/guides/wiring">cables and thickness</a>.',
  },
]

export default function GlossaryPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <GuideBreadcrumb current="Glossary" />
      <GuideHeader
        badges={['Reference', 'Beginner']}
        title="Solar Glossary"
        lede="Plain-English definitions for the terms you'll run into elsewhere on this site — no engineering degree required. Search, or scan the list."
      />
      <GuideDisclaimer />

      <GlossaryClient entries={ENTRIES} />

      <div className="mt-10">
        <NextSteps
          items={[
            { href: '/guides/how-it-works', title: 'How a solar system works', sub: 'Where each term fits in the chain', Icon: Workflow },
            { href: '/guides', title: 'All guides', sub: 'Back to the guides index', Icon: Sun },
          ]}
        />
      </div>
    </div>
  )
}
