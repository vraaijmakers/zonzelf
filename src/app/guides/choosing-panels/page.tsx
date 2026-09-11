import Link from 'next/link'
import { Sun, Cable, Zap, Ruler, Calculator } from 'lucide-react'
import {
  GuideBreadcrumb, GuideHeader, Tldr, Note, Warn, GuideDisclaimer, NextSteps,
} from '@/components/guides/GuideChrome'
import {
  EXAMPLE_PANEL, EXAMPLE_PANEL_LARGE, PV_IRRADIANCE_FACTOR,
} from '@/lib/pv-string'
import { INVERTER_PRESETS } from '@/lib/inverter-sizing'

export const metadata = {
  title: 'Choosing Panels: Why 3 x 400 W Is Not 2 x 600 W — ZonZelf Guide',
  description:
    'Same watts, different array. What actually changes when you pick three smaller panels instead of two big ones: area, weight, wiring arrangements, shade, clipping, freight — and the one spec that matters more than the wattage.',
}

/**
 * The half of "which panels?" that has nothing to do with voltage.
 *
 * /guides/strings-and-mppt already teaches the electrical side, and it is the
 * one that can destroy an inverter. This page is the other question people
 * actually ask first and find no honest answer to: two builds with identical
 * nameplate watts are NOT the same array, and the reasons are mostly physical
 * — area, mass, how many arrangements the panel count factors into, and how
 * gracefully the thing fails when a vent casts a shadow on it.
 *
 * REGISTER. Nearly everything here is capacity or practical, so it is allowed
 * to be specific and opinionated (CLAUDE.md, the capacity/protection split).
 * The two places it touches protection — cold Voc setting the series limit,
 * and per-tracker current — state the mechanism and hand off to
 * /calculators/strings rather than emitting a number. Guides teach.
 *
 * The electrical figures come from src/lib/pv-string.ts so they cannot drift:
 * EXAMPLE_PANEL and EXAMPLE_PANEL_LARGE are the site's two made-up modules and
 * the clipping comparison is computed here, live, from the same
 * PV_IRRADIANCE_FACTOR checkArrangement() uses.
 *
 * THE PHYSICAL FIGURES ARE NOT. PanelSpec carries ten fields and every one is
 * a volt or an amp — no length, no width, no mass, no efficiency. So the size
 * and weight table below is hand-written, class-typical, and labelled as such.
 * Widening PanelSpec is a roadmap item ("Panel choice: form factor, granularity
 * and the physical fields"); until it lands, do not let these numbers grow an
 * air of authority they have not earned.
 */

const eg4 = INVERTER_PRESETS.find(i => i.id === 'eg4-6000xp')

/**
 * Class-typical physical figures. NOT from either example panel's spec,
 * because PanelSpec does not carry them — see the header. A 400 W module is
 * the 108-half-cell / 182 mm format and a 600 W the 210 mm one; these are the
 * sizes those formats land on, not any one manufacturer's.
 */
const FORM = {
  small: { label: '400 W class', mm: [1722, 1134], kg: 21.5, watts: EXAMPLE_PANEL.wattsStc },
  large: { label: '600 W class', mm: [2278, 1134], kg: 28.5, watts: EXAMPLE_PANEL_LARGE.wattsStc },
} as const

function area(mm: readonly [number, number] | number[]) {
  return (mm[0] / 1000) * (mm[1] / 1000)
}

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-3 mt-10 text-2xl font-bold text-zon-ink scroll-mt-24">
      {children}
    </h2>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-zon-body">{children}</p>
}

function Formula({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="my-4">
      <div className="overflow-x-auto rounded-lg border border-zon-rule bg-zon-cream px-4 py-3">
        <code className="whitespace-nowrap font-mono text-sm text-zon-ink">{children}</code>
      </div>
      {note && <p className="mt-1 text-xs text-zon-muted">{note}</p>}
    </div>
  )
}

/** The two builds, side by side. Every number here is arithmetic on FORM. */
function BuildTable() {
  const small = { n: 3, ...FORM.small }
  const large = { n: 2, ...FORM.large }
  const rows: [string, string, string][] = [
    ['Panels', `${small.n} x ${small.watts} W`, `${large.n} x ${large.watts} W`],
    ['Nameplate', `${small.n * small.watts} W`, `${large.n * large.watts} W`],
    [
      'Each panel',
      `${small.mm[0]} x ${small.mm[1]} mm`,
      `${large.mm[0]} x ${large.mm[1]} mm`,
    ],
    [
      'Watts per m²',
      `${Math.round(small.watts / area(small.mm))} W/m²`,
      `${Math.round(large.watts / area(large.mm))} W/m²`,
    ],
    [
      'Total array area',
      `${(small.n * area(small.mm)).toFixed(2)} m²`,
      `${(large.n * area(large.mm)).toFixed(2)} m²`,
    ],
    ['Longest dimension', `${(small.mm[0] / 1000).toFixed(2)} m`, `${(large.mm[0] / 1000).toFixed(2)} m`],
    ['Weight each', `${small.kg} kg`, `${large.kg} kg`],
    [
      'Weight total',
      `${(small.n * small.kg).toFixed(1)} kg`,
      `${(large.n * large.kg).toFixed(1)} kg`,
    ],
    ['Roof penetrations, roughly', `${small.n * 4}`, `${large.n * 4}`],
    ['Pairs of MC4 connectors', `${small.n}`, `${large.n}`],
  ]
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Three 400 W panels compared with two 600 W panels at the same nameplate power
        </caption>
        <thead>
          <tr className="border-b border-zon-rule bg-zon-cream text-left text-zon-muted">
            <th scope="col" className="px-4 py-2 font-medium">&nbsp;</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">3 x 400 W</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">2 x 600 W</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, a, b]) => (
            <tr key={label} className="border-b border-zon-rule-soft last:border-0">
              <td className="px-4 py-3 text-zon-body">{label}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-zon-ink">{a}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-zon-ink">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-zon-rule bg-zon-cream px-4 py-2 text-xs text-zon-muted">
        Sizes and weights are typical of each format, not any one product — always use your own
        datasheet. The electrical figures elsewhere on this page come from the site&apos;s two
        worked-example panels, which are deliberately nobody&apos;s product either.
      </p>
    </div>
  )
}

/** Which way each factor pushes. The actual decision aid. */
function PushTable() {
  const rows: [string, string, string][] = [
    ['You are short of roof area', '', 'Bigger panels — more watts per m²'],
    ['Your roof, van or shed has a length limit', 'Smaller panels — 1.7 m fits where 2.3 m does not', ''],
    ['You are installing alone', 'Smaller panels — one person can place 21 kg', ''],
    ['Anything shades part of the array', 'Smaller panels — you lose a third, not a half', ''],
    ['You need the array to land in the MPPT window', 'Smaller panels — finer steps, more arrangements', ''],
    ['Your tracker has a low usable current', 'Smaller panels — lower Isc per string', ''],
    ['You are paying for racking and labour', '', 'Bigger panels — fewer rails, clamps, penetrations'],
    ['You are buying only a few panels', 'Smaller panels — may still ship parcel, not freight', ''],
    ['You want the best $/W on the panels alone', '', 'Bigger panels — usually cheaper per watt'],
    ['You plan to expand later', 'Smaller panels — commoner formats stay available', ''],
  ]
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule">
      <table className="w-full text-sm">
        <caption className="sr-only">Which situations favour more small panels or fewer large ones</caption>
        <thead>
          <tr className="border-b border-zon-rule bg-zon-cream text-left text-zon-muted">
            <th scope="col" className="px-4 py-2 font-medium">If…</th>
            <th scope="col" className="px-4 py-2 font-medium">More, smaller panels</th>
            <th scope="col" className="px-4 py-2 font-medium">Fewer, bigger panels</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([cond, sm, lg]) => (
            <tr key={cond} className="border-b border-zon-rule-soft last:border-0 align-top">
              <td className="px-4 py-3 font-medium text-zon-ink">{cond}</td>
              <td className="px-4 py-3 text-zon-body">{sm || <span className="text-zon-muted">—</span>}</td>
              <td className="px-4 py-3 text-zon-body">{lg || <span className="text-zon-muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ChoosingPanelsGuide() {
  const small = EXAMPLE_PANEL
  const large = EXAMPLE_PANEL_LARGE
  // The same arithmetic checkArrangement() does: one string on one tracker,
  // Isc lifted by the code factor for irradiance above 1000 W/m².
  const smallDesignIsc = small.iscStc * PV_IRRADIANCE_FACTOR
  const largeDesignIsc = large.iscStc * PV_IRRADIANCE_FACTOR

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <GuideBreadcrumb current="Choosing panels" />

      <GuideHeader
        badges={['arrays', 'buying', 'beginner']}
        minutes="12 min read"
        title="Choosing panels: why 3 x 400 W is not 2 x 600 W"
        lede="Both builds are 1200 W. They are not the same array — and the differences that matter most are not electrical at all."
      />

      <Tldr>
        <p>
          Nameplate watts tell you what an array makes on a perfect day. They tell you nothing
          about whether it fits, whether you can lift it, how many ways it can be wired, or what
          happens when a vent pipe throws a shadow across it.
        </p>
        <p>
          <strong>Bigger panels</strong> win on area, on racking cost and usually on price per
          watt. <strong>Smaller panels</strong> win on fitting awkward spaces, on being liftable
          by one person, on surviving partial shade, and on giving you more ways to wire the
          array into your inverter&apos;s window.
        </p>
        <p>
          And the spec that outlives both: a panel&apos;s <strong>temperature coefficient and
          degradation rate</strong> change what you harvest for twenty-five years. The 400-vs-600
          choice changes one install weekend.
        </p>
      </Tldr>

      <GuideDisclaimer />

      <P>
        Almost every panel-buying guide stops at watts and price per watt. That is genuinely
        useful for a utility-scale buyer filling an empty field, and close to useless for someone
        putting an array on a cabin roof, a camper, or a shed. You are not buying watts. You are
        buying a number of physical objects that have to fit somewhere, be carried there, be
        wired into one particular inverter, and keep working through whatever shade and weather
        your site has.
      </P>

      <P>Here are the two builds, side by side.</P>

      <BuildTable />

      <H2 id="area">1. Area and shape, not watts, is what has to fit</H2>

      <P>
        The first surprise in that table: the <em>smaller-panel</em> build needs more roof. Three
        400 W panels cover{' '}
        {(3 * area(FORM.small.mm)).toFixed(2)} m&sup2; against{' '}
        {(2 * area(FORM.large.mm)).toFixed(2)} m&sup2; for two 600 W panels — about{' '}
        {Math.round(((3 * area(FORM.small.mm)) / (2 * area(FORM.large.mm)) - 1) * 100)}% more area
        for exactly the same watts.
      </P>

      <P>
        That is because a bigger panel is usually a slightly more efficient one:{' '}
        {Math.round(FORM.large.watts / area(FORM.large.mm))} W/m&sup2; against{' '}
        {Math.round(FORM.small.watts / area(FORM.small.mm))} W/m&sup2; here. If your constraint is
        &ldquo;I have this much roof and I want as many watts on it as possible,&rdquo; big panels
        are the answer and it is not close.
      </P>

      <P>
        But <strong>area is rarely the real constraint — shape is.</strong> A 600 W module is
        about {(FORM.large.mm[0] / 1000).toFixed(2)} m long. That will not go across a camper van
        roof between the vents. It will not fit a garden shed with a 2 m rafter run. It is
        awkward on a narrow flat roof with a parapet, and on a boat it is very nearly a sail.
        A {(FORM.small.mm[0] / 1000).toFixed(2)} m panel fits a great many places a{' '}
        {(FORM.large.mm[0] / 1000).toFixed(2)} m one simply does not.
      </P>

      <Note>
        <p>
          <strong>Measure the space before you shop, not after.</strong> Sketch the rectangle you
          actually have — minus vents, hatches, skylights, aerials and the gap you need to walk
          or reach — then see which panel formats tile into it. Panel buying is a rectangle
          packing problem wearing an energy costume.
        </p>
      </Note>

      <H2 id="weight">2. Weight, and whether you can install it alone</H2>

      <P>
        A 400 W panel is around {FORM.small.kg} kg. A 600 W panel is around {FORM.large.kg} kg,
        and a glass-glass bifacial one can reach 35 kg. One reasonably fit person can carry and
        place the first. The second is a two-person lift by any sensible reading, and that is
        before you add a ladder.
      </P>

      <P>
        The number that does not appear on any datasheet is sail area. You are carrying{' '}
        {area(FORM.large.mm).toFixed(2)} m&sup2; of rigid panel up a ladder; a 15 mph gust against
        that is a large shove arriving at the worst possible moment. This is the reason a lot of
        experienced solo DIY builders quietly stick to 400-450 W modules even when the maths
        favours bigger ones.
      </P>

      <Note>
        <p>
          Be clear what this argument is and is not. Per square metre the two builds weigh
          almost the same, so this is <strong>not</strong> about whether your roof can carry the
          load — that is a structural question, and it is about total kg over the area either way.
          It is purely about whether you can safely handle one panel, on your own, on the day.
        </p>
      </Note>

      <H2 id="arrangements">3. More panels means more ways to wire them</H2>

      <P>
        Your inverter&apos;s solar input has a voltage window. Panels wired in series add their
        voltages; strings wired in parallel add their currents. So the number of panels you end
        up with decides how many wiring arrangements even exist to try — and that number is
        simply how many ways the panel count divides.
      </P>

      <Formula note="Every whole-number pair that multiplies to your panel count is one candidate arrangement.">
        panels = series x parallel
      </Formula>

      <P>
        Say you need roughly 3200 W. With 400 W panels that is <strong>8 panels</strong>, and 8
        divides four ways — 8&times;1, 4&times;2, 2&times;4, 1&times;8. Four arrangements to
        check against your window. With 600 W panels you land on <strong>5 or 6 panels</strong>:
        six divides four ways too, but <strong>five is prime</strong> — all five in series, or
        all five in parallel, and nothing in between. If neither of those fits your inverter,
        your only move is to buy a sixth panel you did not want.
      </P>

      <P>
        This is not hypothetical. ZonZelf&apos;s own system designer flags exactly this class of
        conflict, because the panel step rounds <em>up</em> to whole panels on energy while the
        wiring step needs a count that factors into whole strings — and for one real panel and
        inverter pairing it found that <em>every odd panel count had no safe arrangement at all</em>.
        Smaller panels give you finer steps and more divisors, which means more chances to land
        inside the window without buying spare panels.
      </P>

      <H2 id="current">4. Current per string is set by the panel, not the array</H2>

      <P>
        This one catches people, because it does not behave the way &ldquo;same total watts&rdquo;
        suggests. A solar input&apos;s current rating applies <strong>per tracker</strong>, and
        what arrives at that tracker is the short-circuit current of the panels in the string —
        which does not change however many panels you put in series.
      </P>

      <P>
        Our 600 W example panel has an Isc of {large.iscStc} A; the 400 W one has {small.iscStc} A.
        Electrical codes require you to size against more than the label, because irradiance can
        exceed the 1000 W/m&sup2; the label assumes — ZonZelf uses a factor of{' '}
        {PV_IRRADIANCE_FACTOR}, per NEC 690.8(A)(1). So one string on one tracker presents:
      </P>

      <Formula note={`Isc x ${PV_IRRADIANCE_FACTOR} for a single string on a single tracker.`}>
        {small.iscStc} A x {PV_IRRADIANCE_FACTOR} = {smallDesignIsc.toFixed(2)} A
        {'    ·    '}
        {large.iscStc} A x {PV_IRRADIANCE_FACTOR} = {largeDesignIsc.toFixed(2)} A
      </Formula>

      {eg4 && (
        <P>
          Put those against a real unit. The {eg4.brand} {eg4.model} publishes{' '}
          <strong>{eg4.pvMaxCurrentA} A usable</strong> per tracker and{' '}
          <strong>{eg4.pvMaxIscA} A short-circuit</strong>. Neither panel is anywhere near the{' '}
          {eg4.pvMaxIscA} A that would damage it — but the 600 W string at{' '}
          {largeDesignIsc.toFixed(2)} A is already <em>over</em> the {eg4.pvMaxCurrentA} A the
          tracker can actually convert, and the 400 W string at {smallDesignIsc.toFixed(2)} A is
          comfortably under it. Same watts on paper; one of them quietly throws away its peaks.
        </P>
      )}

      <Warn>
        <p>
          Those are two different ceilings and they fail differently.{' '}
          <strong>Usable current is a harvest limit</strong> — go over and the tracker clips, you
          lose some peak production, nothing breaks.{' '}
          <strong>Short-circuit current is a damage limit</strong> — go over that and you are
          past what the hardware is built to survive. Datasheets often print only one of the two.
          When yours does, treat the number you have as the damage limit, because assuming the
          other way round is the direction that costs you an inverter.
        </p>
      </Warn>

      <P>
        Higher-current panels also fill a tracker&apos;s budget faster, so they cap how many
        strings you can parallel onto one input. That interacts with the arrangement count
        above: bigger panels give you fewer arrangements <em>and</em> use up the current
        allowance quicker.
      </P>

      <H2 id="shade">5. Shade, and how gracefully the array fails</H2>

      <P>
        Panels in a series string share one current path, so the shaded one sets the pace for
        the string. Lose one panel out of two and you have lost up to half your array. Lose one
        out of three and you have lost a third. More, smaller panels simply fail in smaller
        pieces — and the same is true when a panel cracks, a connector corrodes, or a junction
        box gives up years from now.
      </P>

      <Note>
        <p>
          Two honest caveats. Modern panels have <strong>bypass diodes</strong> — usually three
          per module — so a partly-shaded panel typically drops to a third or a half of its
          output rather than to nothing, which softens the arithmetic above. And half-cut cell
          layouts split the module into two halves that behave differently depending on whether
          a shadow falls across the panel or along it. The direction of the argument holds; the
          exact fractions are kinder than the worst case.
        </p>
        <p>
          If shade is a serious problem at your site, the real fix is not panel size at all —
          it is separating the shaded panels onto their own MPPT tracker, or using module-level
          electronics.
        </p>
      </Note>

      <H2 id="cost">6. Cost is per watt, plus per panel, plus freight</H2>

      <P>
        Per watt, the bigger panel almost always wins. One frame, one junction box, one pair of
        leads and one set of glass gets you 600 W instead of 400 W, and that efficiency shows up
        in the price. If you only compare the panel line on the invoice, big panels look
        obviously right.
      </P>

      <P>
        Then there is everything that scales with the <em>count</em> rather than the watts:
        rails, mid and end clamps, roof penetrations and their flashings, pairs of MC4
        connectors, and your own time. Three panels means roughly half again as many of all of
        those as two. Every extra connector is also one more joint to get wrong — mating MC4
        connectors from different manufacturers is a well-documented cause of hot joints.
      </P>

      <Warn>
        <p>
          <strong>Then there is freight, and it is the one that ambushes DIY buyers.</strong>{' '}
          Once a panel is much over 2 m long it stops being a parcel. It ships on a pallet by
          LTL freight, often with a delivery appointment, sometimes with a lift-gate fee, and
          usually to a kerb rather than a door. On a two-to-six panel order, that shipping cost
          can comfortably exceed everything you saved by buying the bigger format. Get the
          delivered total for both options before deciding — not the per-watt price.
        </p>
      </Warn>

      <H2 id="matters-more">7. The spec that matters more than the wattage split</H2>

      <P>
        If you are weighing two panels and want one thing to look at beyond size, look at the
        cell technology and what follows from it. Older p-type PERC modules and newer n-type
        TOPCon modules behave measurably differently over a system&apos;s life:
      </P>

      <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule">
        <table className="w-full text-sm">
          <caption className="sr-only">Typical differences between PERC and TOPCon modules</caption>
          <thead>
            <tr className="border-b border-zon-rule bg-zon-cream text-left text-zon-muted">
              <th scope="col" className="px-4 py-2 font-medium">Typically</th>
              <th scope="col" className="px-4 py-2 font-medium">p-type PERC</th>
              <th scope="col" className="px-4 py-2 font-medium">n-type TOPCon</th>
            </tr>
          </thead>
          <tbody>
            {([
              ['Power temperature coefficient', 'around −0.35 %/°C', 'around −0.29 %/°C'],
              ['First-year degradation', 'around 2%', 'around 1%'],
              ['Degradation after that', 'around 0.55%/yr', 'around 0.4%/yr'],
              ['Low-light performance', 'baseline', 'better'],
            ] as [string, string, string][]).map(([k, a, b]) => (
              <tr key={k} className="border-b border-zon-rule-soft last:border-0">
                <td className="px-4 py-3 text-zon-body">{k}</td>
                <td className="px-4 py-3 text-zon-body">{a}</td>
                <td className="px-4 py-3 text-zon-body">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-zon-rule bg-zon-cream px-4 py-2 text-xs text-zon-muted">
          Representative figures for each technology, to show the shape of the difference. Your
          panel&apos;s datasheet states its own, and that is the number to use.
        </p>
      </div>

      <P>
        Compound half a percent a year over twenty-five years and it dwarfs anything the
        400-versus-600 decision does. Our own two example panels show the pattern: the larger
        one carries {large.betaVoc} %/&deg;C against the smaller one&apos;s {small.betaVoc} %/&deg;C,
        because larger modern modules tend to be the newer cell type.
      </P>

      <Note>
        <p>
          <strong>And here is where the two halves of panel choice meet.</strong> That same
          temperature coefficient is the number that decides how many panels may go in a series
          string, because it governs how far the voltage rises on a freezing morning. A gentler
          coefficient means less cold-weather voltage rise, which means you can put{' '}
          <em>more</em> panels in a string before you reach your inverter&apos;s limit. One
          number, two consequences: what you harvest for twenty-five years, and how you are
          allowed to wire the array on day one.{' '}
          <Link href="/guides/strings-and-mppt" className="text-zon-gold-deep hover:underline">
            Strings, Voc and the MPPT window
          </Link>{' '}
          works that side through with the formulas.
        </p>
      </Note>

      <P>
        Two more worth a glance. <strong>Warranties</strong> have stretched — 25 years on the
        product and 30 on performance is now common on better modules, and a warranty is only
        worth the company likely to be standing behind it. And <strong>bifacial</strong> panels
        earn their extra cost on an elevated ground mount over gravel, concrete or snow, where
        light genuinely reaches the back; flush against a dark roof they gain close to nothing
        while still being heavier glass-glass panels to lift.
      </P>

      <H2 id="mixing">8. If you might expand later</H2>

      <P>
        Mixing panel models inside one array is the classic second-year mistake. In a series
        string every panel carries the same current, so the string works at the weakest
        panel&apos;s current; in parallel, strings should have similar voltages or the array
        does not share load the way you expect. The clean approach is to keep each string
        internally identical and give a different model its own string — or, better, its own
        tracker.
      </P>

      <P>
        Which argues quietly for the commoner format. Flagship large-format models turn over
        fast, and the exact 600 W module you bought may be gone in eighteen months, while the
        400-450 W class stays widely stocked. If you are building in stages, buy the whole
        array at once where you can — and where you cannot, prefer the format you will still be
        able to find.
      </P>

      <H2 id="decide">Putting it together</H2>

      <P>
        There is no universally right answer, which is why nobody publishes one. There is a
        right answer for your roof, your climate, your inverter and your back. Read down the
        left column and see which rows are true for you:
      </P>

      <PushTable />

      <P>
        For most DIY builds on a constrained surface — a cabin, a shed, a camper, a boat — the
        rows on the left tend to add up faster, which is why experienced builders so often end
        up with more, smaller panels than the per-watt price suggests. For an open ground mount
        or a big clear roof where you are paying a crew, the right column wins.
      </P>

      <div className="my-8 rounded-xl border border-zon-gold-light bg-zon-gold-tint p-5">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-zon-gold-deep">
          <Calculator className="h-4 w-4" />
          Run it on your own numbers
        </p>
        <p className="mb-3 text-sm text-zon-body">
          The panel sizing step works out how many panels your energy use actually calls for, and
          the array wiring step checks every arrangement of that count against your own
          inverter&apos;s voltage window and current limits — showing the arithmetic for each one,
          including the ones that fail and why.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/calculators/panels"
            className="inline-flex items-center gap-1 text-sm font-medium text-zon-gold-deep hover:underline"
          >
            Panel sizing &rarr;
          </Link>
          <Link
            href="/calculators/strings"
            className="inline-flex items-center gap-1 text-sm font-medium text-zon-gold-deep hover:underline"
          >
            Array wiring &rarr;
          </Link>
        </div>
      </div>

      <NextSteps
        items={[
          {
            href: '/guides/strings-and-mppt',
            title: 'Strings, Voc & the MPPT window',
            sub: 'The electrical half — why cold panels make more voltage',
            Icon: Sun,
          },
          {
            href: '/calculators/panels',
            title: 'Panel sizing',
            sub: 'How many panels your energy use calls for',
            Icon: Ruler,
          },
          {
            href: '/calculators/inverter',
            title: 'Inverter & surge sizing',
            sub: 'The window your array has to land inside',
            Icon: Zap,
          },
          {
            href: '/guides/wiring',
            title: 'Cable & wiring',
            sub: 'Sizing the conductors these currents run through',
            Icon: Cable,
          },
        ]}
      />
    </div>
  )
}
