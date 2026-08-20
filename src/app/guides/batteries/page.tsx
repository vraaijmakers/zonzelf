import Link from 'next/link'
import { Battery, CheckCircle, XCircle, AlertTriangle, ChevronRight, Calculator } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Battery Types for DIY Solar — ZonZelf Guide',
  description: 'LiFePO4 vs AGM vs Gel vs Flooded Lead-Acid. Honest comparison of every battery chemistry used in off-grid and hybrid solar systems.',
}

const COMPARISON = [
  { label: 'Depth of discharge',    lifepo4: '80–90%',       agm: '50%',         gel: '50%',          fla: '50%' },
  { label: 'Cycle life',            lifepo4: '3,000–6,000+', agm: '400–800',     gel: '500–1,000',    fla: '500–1,200' },
  { label: 'Round-trip efficiency', lifepo4: '95–98%',       agm: '80–85%',      gel: '80–85%',       fla: '70–80%' },
  { label: 'Maintenance',           lifepo4: 'None',         agm: 'None',        gel: 'None',         fla: 'Monthly (water)' },
  { label: 'Venting required',      lifepo4: 'No',           agm: 'No',          gel: 'No',           fla: 'Yes (H₂ gas)' },
  { label: 'BMS required',          lifepo4: 'Yes (built-in usually)', agm: 'No', gel: 'No',          fla: 'No' },
  { label: 'Weight (relative)',     lifepo4: 'Light',        agm: 'Heavy',       gel: 'Heavy',        fla: 'Heaviest' },
  { label: 'Upfront cost/kWh',      lifepo4: '$400–600',     agm: '$150–250',    gel: '$200–350',     fla: '$100–180' },
  { label: 'Lifetime cost/kWh',     lifepo4: 'Lowest',       agm: 'High',        gel: 'Medium',       fla: 'Medium' },
  { label: 'Safe indoors',          lifepo4: 'Yes',          agm: 'Yes',         gel: 'Yes',          fla: 'No' },
]

function Pro({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-700">
      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  )
}

function Con({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-700">
      <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
      <span>{text}</span>
    </div>
  )
}

function Warn({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
      <span className="text-gray-700">{text}</span>
    </div>
  )
}

export default function BatteriesGuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/guides" className="hover:text-gray-600">Guides</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-700">Battery Types</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary">Batteries</Badge>
          <Badge variant="secondary">Beginner</Badge>
          <span className="text-xs text-gray-400">8 min read</span>
        </div>
        <h1 className="text-3xl font-bold mb-3">Battery Types for DIY Solar</h1>
        <p className="text-lg text-gray-600">
          Four battery chemistries dominate DIY solar: LiFePO4, AGM, Gel, and Flooded Lead-Acid.
          They all store energy but behave very differently. Here&apos;s what actually matters when choosing.
        </p>
      </div>

      {/* TL;DR */}
      <Card className="border-yellow-200 bg-yellow-50 mb-10">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-yellow-800 mb-2">The short answer</p>
          <p className="text-sm text-gray-700">
            For most new DIY solar builds, <strong>LiFePO4 (lithium iron phosphate) is the right choice</strong> —
            even though it costs more upfront. It lasts 5–10× longer, you can use twice as much of its capacity,
            and it needs zero maintenance. AGM is the best choice if budget is the primary constraint and
            you accept replacing it sooner. Gel and Flooded Lead-Acid are rarely worth choosing for new builds.
          </p>
        </CardContent>
      </Card>

      {/* The one concept that drives everything */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">The one concept that drives every decision: DoD</h2>
        <p className="text-gray-700 mb-4">
          <strong>Depth of Discharge (DoD)</strong> is how far down you can drain a battery before it causes damage.
          A 100 Ah battery at 50% DoD gives you <em>50 Ah of usable energy</em>. The same battery at 80% DoD gives you 80 Ah.
        </p>
        <p className="text-gray-700 mb-4">
          This is why the headline capacity number on a battery is misleading. What matters is <em>usable capacity</em>.
          Lead-acid batteries (AGM, Gel, Flooded) are all limited to ~50% DoD — going deeper dramatically shortens their life.
          LiFePO4 tolerates 80–90% DoD routinely.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-sm">
          <p className="font-medium text-gray-700 mb-2">Example: You need 3 kWh of usable storage daily.</p>
          <div className="space-y-1.5 text-gray-600">
            <div className="flex justify-between"><span>LiFePO4 at 80% DoD</span><strong className="text-gray-800">3.75 kWh total bank needed</strong></div>
            <div className="flex justify-between"><span>AGM at 50% DoD</span><strong className="text-gray-800">6.0 kWh total bank needed</strong></div>
          </div>
          <p className="text-gray-500 mt-2 text-xs">You need 60% more AGM capacity to get the same usable energy — which closes the price gap significantly.</p>
        </div>
        <p className="mt-4">
          <Link href="/guides/depth-of-discharge" className="text-yellow-700 hover:underline text-sm font-medium">
            Full guide: Depth of Discharge and inverter cutoff settings →
          </Link>
        </p>
      </section>

      {/* Comparison table */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Side-by-side comparison</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-40"></th>
                <th className="px-4 py-3 font-semibold text-green-700 text-center">LiFePO4</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">AGM</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Gel</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Flooded</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.label} className={`border-b ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-2.5 text-gray-500 text-xs font-medium">{row.label}</td>
                  <td className="px-4 py-2.5 text-center font-medium text-green-700">{row.lifepo4}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{row.agm}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{row.gel}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{row.fla}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* LiFePO4 */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Battery className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-bold">LiFePO4 — Lithium Iron Phosphate</h2>
          <Badge className="bg-green-100 text-green-800 border-green-200">Recommended</Badge>
        </div>
        <p className="text-gray-700 mb-4">
          LiFePO4 is the safest lithium chemistry — unlike laptop or EV batteries (NMC/NCA),
          it doesn&apos;t catch fire or experience thermal runaway under normal use. It&apos;s been the
          standard for serious off-grid builds for the last few years, and prices have dropped significantly.
        </p>
        <p className="text-gray-700 mb-4">
          Most LiFePO4 batteries sold for solar come with a built-in <strong>Battery Management System (BMS)</strong>
          that handles cell balancing, overcharge protection, and low-voltage cutoff. Brands like
          Ampere Time, EG4, Epoch, SOK, and Enjoybot are popular in the DIY community.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pros</p>
            <Pro text="80–90% DoD — use almost all of it" />
            <Pro text="3,000–6,000+ cycles (10+ year lifespan at typical use)" />
            <Pro text="95–98% round-trip efficiency — less solar wasted charging" />
            <Pro text="Zero maintenance" />
            <Pro text="Safe indoors — no off-gassing" />
            <Pro text="Lightweight — roughly half the weight of lead-acid" />
            <Pro text="Lowest lifetime cost per kWh" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cons</p>
            <Con text="Higher upfront cost ($400–600/kWh)" />
            <Con text="Needs a BMS — most batteries include one, but verify" />
            <Con text="Don't charge below freezing without a self-heating BMS" />
            <Con text="Cell voltage curve is very flat — harder to gauge state of charge from voltage alone" />
          </div>
        </div>
        <Card className="border-blue-100 bg-blue-50">
          <CardContent className="pt-3 pb-3">
            <Warn text="Charging LiFePO4 at temperatures below 0°C (32°F) causes permanent lithium plating damage. If your batteries are in an unheated space in winter, look for self-heating models or add a low-temp cutoff to your charge controller." />
          </CardContent>
        </Card>
      </section>

      {/* AGM */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Battery className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-bold">AGM — Absorbent Glass Mat</h2>
          <Badge variant="secondary">Budget option</Badge>
        </div>
        <p className="text-gray-700 mb-4">
          AGM is a sealed lead-acid battery where the electrolyte is absorbed into fiberglass mats.
          It doesn&apos;t spill, doesn&apos;t need water, and can be mounted in any orientation.
          It&apos;s widely available, works with any charge controller, and requires no special settings beyond
          selecting &quot;AGM&quot; on your charge controller.
        </p>
        <p className="text-gray-700 mb-4">
          The biggest gotcha: <strong>you can only use 50% of the rated capacity</strong> before degradation
          accelerates significantly. A 200 Ah AGM battery gives you 100 Ah of real-world usable energy.
          Size your bank accordingly — and plan to replace it in 3–5 years.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pros</p>
            <Pro text="Lower upfront cost" />
            <Pro text="Works with any charge controller — no special settings" />
            <Pro text="Sealed — safe indoors, no maintenance" />
            <Pro text="Widely available (auto parts, big-box stores)" />
            <Pro text="Tolerates partial state of charge better than Gel" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cons</p>
            <Con text="50% DoD limit — half the capacity is off-limits" />
            <Con text="Only 400–800 cycles before significant capacity loss" />
            <Con text="Heavy — roughly 2× the weight of LiFePO4 for same usable energy" />
            <Con text="Higher lifetime cost once you factor in replacements" />
            <Con text="Sensitive to heat — Florida heat degrades them faster" />
          </div>
        </div>
      </section>

      {/* Gel */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Battery className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold">Gel</h2>
          <Badge variant="secondary">Niche use</Badge>
        </div>
        <p className="text-gray-700 mb-4">
          Gel batteries suspend the electrolyte in silica gel. They&apos;re more tolerant of deep discharge
          and partial state of charge than AGM, handle high temperatures slightly better, and have
          a longer cycle life. However, they have one critical limitation: they must be charged slowly.
          Charging too fast permanently damages the gel structure.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pros</p>
            <Pro text="Better heat tolerance than AGM" />
            <Pro text="Longer cycle life than AGM (500–1,000 cycles)" />
            <Pro text="More tolerant of partial charge states" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cons</p>
            <Con text="Must use a Gel-specific charge profile — wrong settings destroy the battery" />
            <Con text="Maximum charge rate is low (C/10 or slower)" />
            <Con text="Same 50% DoD limit as AGM" />
            <Con text="More expensive than AGM, less available" />
          </div>
        </div>
      </section>

      {/* Flooded */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Battery className="w-5 h-5 text-yellow-600" />
          <h2 className="text-xl font-bold">Flooded Lead-Acid (FLA)</h2>
          <Badge variant="secondary">Large systems only</Badge>
        </div>
        <p className="text-gray-700 mb-4">
          Flooded (or &quot;wet cell&quot;) lead-acid is the oldest battery technology and still used in large
          off-grid systems — think remote cabins, farms, telecom towers. The cells contain liquid
          electrolyte that you top up with distilled water every 1–3 months.
          They must be installed in a <strong>vented enclosure</strong> because charging produces hydrogen gas.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pros</p>
            <Pro text="Lowest upfront cost per kWh" />
            <Pro text="Can be reconditioned and equalized to extend life" />
            <Pro text="Best cycle life of any lead-acid type" />
            <Pro text="Forgiving of overcharging (vents excess)" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cons</p>
            <Con text="Requires monthly maintenance (distilled water)" />
            <Con text="Must be vented — hydrogen gas is explosive" />
            <Con text="Cannot be installed indoors without proper ventilation" />
            <Con text="Spills if tipped over" />
            <Con text="Heaviest option — not practical for mobile/RV use" />
          </div>
        </div>
        <Card className="border-red-100 bg-red-50">
          <CardContent className="pt-3 pb-3">
            <Warn text="Never install flooded lead-acid batteries in a sealed or enclosed space. Hydrogen gas accumulates and can explode with a single spark. Always vent to outside air." />
          </CardContent>
        </Card>
      </section>

      {/* Never mix */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-3">Never mix battery types — or ages</h2>
        <p className="text-gray-700 mb-3">
          Connecting different battery chemistries in the same bank is one of the most common
          and damaging mistakes in DIY solar. Each chemistry has a different voltage curve,
          charge acceptance rate, and internal resistance. When connected in parallel, the
          stronger battery continuously tries to charge the weaker one, causing heat, accelerated
          degradation, and potentially fire.
        </p>
        <p className="text-gray-700">
          The same applies to batteries of significantly different ages. If you&apos;re adding capacity,
          buy a new matched bank and wire it separately — don&apos;t mix old and new.
        </p>
      </section>

      {/* Which to choose */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Which should you choose?</h2>
        <div className="space-y-3">
          {[
            { condition: 'New build, budget allows', answer: 'LiFePO4', reason: 'Best long-term value, least hassle, highest usable capacity.' },
            { condition: 'Tight budget, replacing in 3–5 years is OK', answer: 'AGM', reason: 'Lower upfront, widely available. Size the bank at 2× your usable need to account for 50% DoD.' },
            { condition: 'Hot climate (Florida, Texas, Southwest)', answer: 'LiFePO4', reason: 'Heat kills lead-acid faster. AGM in Florida may last only 2–3 years.' },
            { condition: 'Mobile (RV, boat, van)', answer: 'LiFePO4', reason: 'Weight matters. LiFePO4 is roughly half the weight for the same usable energy.' },
            { condition: 'Large stationary system, very cost-sensitive', answer: 'Flooded LA or AGM', reason: 'Still viable for large farm/cabin systems where maintenance is acceptable.' },
            { condition: 'Cold climate, batteries in unheated space', answer: 'Self-heating LiFePO4 or AGM', reason: 'Standard LiFePO4 cannot be charged below freezing. AGM tolerates cold better.' },
          ].map(({ condition, answer, reason }) => (
            <div key={condition} className="flex gap-4 p-4 rounded-xl border bg-white">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-0.5">If: <span className="text-gray-700 font-medium">{condition}</span></p>
                <p className="text-sm font-semibold text-yellow-700">→ {answer}</p>
                <p className="text-xs text-gray-500 mt-0.5">{reason}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Next steps */}
      <section className="border-t pt-8">
        <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-4">Next steps</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link href="/guides/depth-of-discharge" className="flex items-center gap-3 p-4 rounded-xl border hover:border-yellow-400 hover:bg-yellow-50 transition-colors group">
            <div className="w-9 h-9 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
              <Battery className="w-4 h-4 text-yellow-700" />
            </div>
            <div>
              <p className="text-sm font-medium group-hover:text-yellow-700">Depth of Discharge guide</p>
              <p className="text-xs text-gray-500">Set your inverter cutoff correctly</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-yellow-500" />
          </Link>
          <Link href="/calculators/battery" className="flex items-center gap-3 p-4 rounded-xl border hover:border-yellow-400 hover:bg-yellow-50 transition-colors group">
            <div className="w-9 h-9 bg-yellow-100 rounded-lg flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4 text-yellow-700" />
            </div>
            <div>
              <p className="text-sm font-medium group-hover:text-yellow-700">Battery sizing calculator</p>
              <p className="text-xs text-gray-500">How many kWh do you actually need?</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-yellow-500" />
          </Link>
        </div>
      </section>

    </div>
  )
}
