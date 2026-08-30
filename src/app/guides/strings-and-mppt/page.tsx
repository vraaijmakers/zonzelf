import Link from 'next/link'
import { Calculator, Sun, Cable, Snowflake, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { fieldsFor, type DatasheetField } from '@/lib/datasheet-vocabulary'
import {
  GuideBreadcrumb, GuideHeader, Tldr, Note, Warn, GuideDisclaimer, NextSteps,
} from '@/components/guides/GuideChrome'

export const metadata = {
  title: 'Strings, Voc and the MPPT Window — ZonZelf Guide',
  description:
    'Why panel voltage rises as it gets colder, what the two numbers on your inverter’s solar input actually mean, and how to work out how many panels may go in a string. With the formulas.',
}

/**
 * The lecture behind the array-wiring calculator.
 *
 * CLAUDE.md's legal posture in one line: guides teach, calculators show the
 * derivation. This page is the teaching half, and it exists because the
 * calculator asks people for a temperature coefficient — a term nothing on the
 * site defined — and then makes a decision that can destroy their inverter. A
 * tool that does that without an explanation behind it is the Jeppesen chart.
 *
 * Every formula and every worked number here MUST agree with src/lib/pv-string.ts.
 * The example panel is the same one the calculator offers.
 */


/**
 * The translation table, built from src/lib/datasheet-vocabulary.ts — the same
 * source the calculator's field hints read. A guide that listed these
 * separately would drift from the form within a release.
 */
function VocabularyTable({ step, caption }: { step: 'inverter' | 'panel'; caption: string }) {
  const fields: DatasheetField[] = fieldsFor(step)
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-zon-rule bg-zon-cream text-left text-zon-muted">
            <th scope="col" className="px-4 py-2 font-medium">We ask for</th>
            <th scope="col" className="px-4 py-2 font-medium">Your datasheet probably says</th>
          </tr>
        </thead>
        <tbody>
          {fields.map(f => (
            <tr key={f.id} className="border-b border-zon-rule-soft last:border-0 align-top">
              <td className="px-4 py-3 font-medium text-zon-ink">
                {f.label}
                <span className="block text-xs font-normal text-zon-muted">{f.section}</span>
              </td>
              <td className="px-4 py-3 text-zon-body">
                {f.alsoCalled.join(' · ')}
                {f.gotcha && (
                  <span className="mt-1 block text-xs text-zon-muted">{f.gotcha}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
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

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-3 mt-10 text-2xl font-bold text-zon-ink scroll-mt-24">
      {children}
    </h2>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-6 text-lg font-semibold text-zon-ink">{children}</h3>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-zon-body">{children}</p>
}

/** The four label figures, as a table rather than as prose. */
function LabelTable() {
  const rows = [
    ['Voc', 'Open-circuit voltage', 'Nothing connected. The HIGHEST voltage the panel ever makes — and the number that decides whether your inverter survives.', '45.0 V'],
    ['Vmp', 'Voltage at maximum power', 'Where it actually sits while working, about 80–85% of Voc.', '37.5 V'],
    ['Isc', 'Short-circuit current', 'Terminals shorted together. The highest current.', '11.5 A'],
    ['Imp', 'Current at maximum power', 'What it delivers while working.', '10.7 A'],
  ]
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule">
      <table className="w-full text-sm">
        <caption className="sr-only">The four operating points printed on a solar panel label</caption>
        <thead>
          <tr className="border-b border-zon-rule bg-zon-cream text-left text-zon-muted">
            <th scope="col" className="px-4 py-2 font-medium">Symbol</th>
            <th scope="col" className="px-4 py-2 font-medium">Name</th>
            <th scope="col" className="px-4 py-2 font-medium">What it is</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Example</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([sym, name, what, ex]) => (
            <tr key={sym} className="border-b border-zon-rule-soft last:border-0">
              <td className="px-4 py-3 font-mono font-semibold text-zon-ink">{sym}</td>
              <td className="px-4 py-3 text-zon-body">{name}</td>
              <td className="px-4 py-3 text-zon-body">{what}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums text-zon-body">{ex}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function StringsAndMpptGuide() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <GuideBreadcrumb current="Strings & the MPPT Window" />
      <GuideHeader
        badges={['arrays', 'intermediate']}
        minutes="15 min read"
        title="Strings, Voc and the MPPT Window"
        lede="Solar panels make more voltage when they are cold. That one sentence, and the fact that almost nobody expects it, is behind most destroyed inverters in DIY solar. Here is the whole mechanism, with the arithmetic."
      />

      <Tldr>
        <p>
          <strong>Panels in series add their voltages. Panels in parallel add their currents.</strong>{' '}
          Your inverter has a limit on each.
        </p>
        <p>
          <strong>Voltage goes UP as temperature goes DOWN.</strong> A string sized on the
          datasheet figure can be 10–15% higher on a frosty morning. Size it against the coldest
          temperature your site has ever seen, not against the label.
        </p>
        <p>
          <strong>Too much voltage destroys the inverter. Too little just wastes sunshine.</strong>{' '}
          Those two mistakes are not equally bad, and it is worth knowing which one you are
          risking.
        </p>
      </Tldr>

      <GuideDisclaimer />

      <H2>1. A panel does not have &ldquo;a voltage&rdquo;</H2>
      <P>
        The label on the back of a solar panel lists four different numbers, and beginners
        reasonably assume one of them is <em>the</em> voltage. None of them is. They are four
        different operating points, and each answers a different question.
      </P>
      <LabelTable />
      <P>
        The two that matter for string design are <strong>Voc</strong> and{' '}
        <strong>Isc</strong> — the extremes. Everything protective is sized against the worst
        case, and the worst case is an unloaded panel in the cold, or a shorted one in bright sun.
      </P>
      <Note>
        <p>
          All four are quoted at <strong>STC</strong> — Standard Test Conditions: 1000 W/m²
          of light, and a cell temperature of exactly 25 °C. That is a laboratory. Your roof is
          colder than that in January and much hotter than that in July, and the panel behaves
          differently in both.
        </p>
      </Note>

      <H2>2. Series adds volts, parallel adds amps</H2>
      <P>
        This is the whole of array wiring in one sentence, and everything else on this page is
        that sentence checked against your inverter&apos;s limits.
      </P>
      <div className="my-5 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <p className="mb-1 font-semibold text-zon-ink">In series (a &ldquo;string&rdquo;)</p>
            <p className="mb-3 text-sm text-zon-body">
              Panel to panel, positive to negative, like batteries in a torch.
            </p>
            <p className="font-mono text-sm text-zon-ink">Voltage: adds up</p>
            <p className="font-mono text-sm text-zon-ink">Current: stays as one panel&apos;s</p>
            <p className="mt-3 text-xs text-zon-muted">
              6 panels × 45 V = 270 V, still 11.5 A
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="mb-1 font-semibold text-zon-ink">In parallel (strings side by side)</p>
            <p className="mb-3 text-sm text-zon-body">
              All the positives together, all the negatives together.
            </p>
            <p className="font-mono text-sm text-zon-ink">Voltage: stays as one string&apos;s</p>
            <p className="font-mono text-sm text-zon-ink">Current: adds up</p>
            <p className="mt-3 text-xs text-zon-muted">
              2 strings of 6 = 270 V, but 23 A
            </p>
          </CardContent>
        </Card>
      </div>
      <P>
        Twelve panels can be one string of twelve, two strings of six, three of four, four of
        three, six of two, or twelve in parallel. Same panels, same money, same kilowatt-hours
        per day. Wildly different voltages and currents arriving at your inverter.
      </P>

      <H2>3. The MPPT window: two ceilings and a floor</H2>
      <P>
        An MPPT charge controller — Maximum Power Point Tracking — constantly adjusts the load it
        puts on the array to sit exactly at the panel&apos;s Vmp, where it produces the most
        power. It is very good at this, but only within a voltage range, and the datasheet
        usually gives you <em>three</em> numbers, not two.
      </P>
      <div className="my-5 space-y-3">
        <div className="rounded-xl border border-zon-rule p-4">
          <p className="mb-1 font-semibold text-zon-ink">The floor — e.g. &ldquo;MPPT range 120–450 V&rdquo;</p>
          <p className="text-sm text-zon-body">
            Below this the tracker cannot work. Your panels are in the sun and nothing is being
            harvested. Nothing is damaged.
          </p>
        </div>
        <div className="rounded-xl border border-zon-rule p-4">
          <p className="mb-1 font-semibold text-zon-ink">The top of the window — the 450 in that range</p>
          <p className="text-sm text-zon-body">
            Above this the tracker stops tracking properly: it clips, or drops out until the
            voltage falls back. You lose harvest. The unit survives.
          </p>
        </div>
        <div className="rounded-xl border border-zon-red p-4">
          <p className="mb-1 font-semibold text-zon-ink">
            The absolute maximum — e.g. &ldquo;Max PV input voltage 500 V&rdquo;
          </p>
          <p className="text-sm text-zon-body">
            This one is not a performance limit. It is the voltage at which the input stage breaks
            down. Exceed it, even briefly, even once, and the inverter is scrap. There is no
            warning noise and no protection circuit that saves you.
          </p>
        </div>
      </div>
      <Warn>
        <p>
          <strong>These are not the same number and datasheets do not always make that obvious.</strong>{' '}
          &ldquo;MPPT range 120–450 V&rdquo; and &ldquo;Max PV input 500 V&rdquo; can sit in
          different rows of different tables on different pages. If your datasheet gives only one
          figure, treat it as the absolute maximum and design under it.
        </p>
      </Warn>

      <H2>4. Cold weather raises your voltage</H2>
      <P>
        Here is the part that catches people out, including people who have done this before.
        Silicon solar cells produce <em>more</em> voltage when they are cold. Not less. The
        relationship is close to linear and every datasheet gives you the slope, called the{' '}
        <strong>temperature coefficient of Voc</strong>:
      </P>
      <Formula note="The coefficient is in %/°C and is NEGATIVE — typically −0.25 to −0.35 for a modern panel.">
        Voc(T) = Voc<sub>STC</sub> × [ 1 + β<sub>Voc</sub>/100 × (T − 25) ]
      </Formula>
      <P>
        The trap is a sign, not an equation. β is negative. On a cold morning{' '}
        <code className="font-mono text-sm">(T − 25)</code> is <em>also</em> negative. Two
        negatives multiply to a positive, so the bracket is greater than 1 and the voltage goes{' '}
        <strong>up</strong>.
      </P>

      <H3>Worked example — one panel at −12 °C</H3>
      <P>
        Take a 400 W panel with Voc 45.0 V and β<sub>Voc</sub> = −0.28 %/°C, on a site where the
        coldest expected temperature is −12 °C:
      </P>
      <Formula>
        Voc(−12) = 45.0 × [ 1 + (−0.28 / 100) × (−12 − 25) ] = 45.0 × 1.1036 = <strong>49.7 V</strong>
      </Formula>
      <P>
        That is <strong>10.4% over the label</strong>, from one panel, at a temperature that is
        not even unusual. Now put ten of them in series:
      </P>
      <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule">
        <table className="w-full text-sm">
          <caption className="sr-only">String voltage at STC compared with a cold morning</caption>
          <thead>
            <tr className="border-b border-zon-rule bg-zon-cream text-left text-zon-muted">
              <th scope="col" className="px-4 py-2 font-medium">Panels in series</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">On the datasheet (25 °C)</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">On a −12 °C morning</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Against a 500 V input</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['8', '360 V', '397 V', 'fine'],
              ['9', '405 V', '447 V', 'fine'],
              ['10', '450 V', '497 V', 'only just'],
              ['11', '495 V', '546 V', 'destroys it'],
            ].map(([n, stc, cold, verdict]) => (
              <tr key={n} className="border-b border-zon-rule-soft last:border-0">
                <td className="px-4 py-2 font-mono text-zon-ink">{n}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-zon-muted">{stc}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-zon-ink">{cold}</td>
                <td className={`px-4 py-2 text-right ${verdict === 'destroys it' ? 'text-zon-red' : 'text-zon-body'}`}>
                  {verdict}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        Eleven panels look completely safe on the datasheet — 495 V against a 500 V limit. On the
        first cold morning they deliver 546 V and the inverter is gone. The array will have
        worked perfectly all summer, which is exactly why this failure is so common: nothing
        warns you, and the thing that changed was the weather.
      </P>
      <Formula note="Always round DOWN. One panel over is the whole failure.">
        panels in series = floor( max PV input voltage ÷ Voc at your coldest temperature )
      </Formula>

      <H3>Which temperature, and why that one</H3>
      <P>
        Use the <strong>lowest ambient air temperature</strong> your site can see — not an
        average, not a winter mean, and not a cell temperature. Voc peaks at dawn on the coldest
        morning of the year: there is no sun yet, so the cells are not warming themselves and sit
        at air temperature, and the array is unloaded because the inverter has not started. Cold,
        unloaded, and about to be hit by first light is the worst case, and it happens every
        winter.
      </P>
      <Note>
        <p>
          Two figures are in circulation and they are far apart. <strong>NEC 690.7</strong> points
          at ASHRAE&apos;s <em>extreme annual mean minimum design dry-bulb temperature</em> — the
          average of each year&apos;s coldest day, a statistical figure for your location. The
          other is simply the coldest reading ever taken nearby, which is colder and more
          conservative. Either is defensible; the colder one costs you a panel in the string and
          buys certainty.
        </p>
        <p>
          What is <em>not</em> defensible is using a figure for a whole region. Phoenix and
          Flagstaff are both in Arizona and about fifteen degrees apart; a single &ldquo;Arizona&rdquo;
          number is badly wrong for at least one of them, and being wrong on the warm side is what
          destroys inverters. The{' '}
          <Link href="/calculators/strings" className="text-zon-gold-deep hover:underline">
            array wiring calculator
          </Link>{' '}
          carries both figures for around ninety named places, each derived from thirty years of
          daily reanalysis data rather than typed from memory — and it still asks you to replace
          them with a local number, because a place a few miles away in a valley is colder again.
        </p>
      </Note>

      <H2>5. Hot weather lowers it — and that is a different problem</H2>
      <P>
        The same physics runs the other way in summer, on the working voltage rather than the
        open-circuit one:
      </P>
      <Formula note="Cell temperature, not air temperature. Panels run 25–30 °C above the air in full sun.">
        Vmp(T<sub>cell</sub>) = Vmp<sub>STC</sub> × [ 1 + β<sub>Vmp</sub>/100 × (T<sub>cell</sub> − 25) ]
      </Formula>
      <P>
        β<sub>Vmp</sub> is usually a <em>bigger</em> number than β<sub>Voc</sub> — around −0.35 to
        −0.45 %/°C — so Vmp sags harder in heat than Voc rises in cold. And the cells are much
        hotter than the day is: on a 35 °C afternoon the cells are around 65 °C.
      </P>
      <Formula>
        Vmp(65) = 37.5 × [ 1 + (−0.35 / 100) × (65 − 25) ] = 37.5 × 0.86 = <strong>32.3 V</strong>
      </Formula>
      <P>
        A four-panel string that reads 150 V on the datasheet is delivering about{' '}
        <strong>129 V</strong> on a hot afternoon. Against a 120 V tracking floor that still
        works — but only just, and a dirty array or an older panel eats the rest of the margin.
        Below the floor, the tracker gives up and you harvest nothing, at the sunniest hour of
        the year.
      </P>
      <Warn>
        <p>
          <strong>The two failures are not equally serious, and it is worth being explicit.</strong>{' '}
          Too much voltage destroys hardware and costs you the inverter. Too little voltage costs
          you a summer afternoon&apos;s harvest and nothing else. When they pull in opposite
          directions — and they do — protect against the cold end first.
        </p>
      </Warn>

      <H3>Most datasheets do not give you β<sub>Vmp</sub></H3>
      <P>
        They give β<sub>Voc</sub> and β<sub>Pmax</sub>. Use β<sub>Pmax</sub> as the stand-in: since
        Pmax = Vmp × Imp and Imp barely moves with temperature, almost all of the Pmax coefficient
        <em> is</em> the Vmp coefficient. Falling back to β<sub>Voc</sub> is a last resort, and
        note which way it errs — it is the smaller number, so it{' '}
        <strong>understates</strong> the sag and flatters your design.
      </P>

      <H2>6. So what about &ldquo;always design to 220 V, not the 100 V minimum&rdquo;?</H2>
      <P>
        You will see advice like this on forums, and the instinct behind it is exactly right: the
        tracker&apos;s stated minimum is a laboratory floor, and a string sitting near it at STC
        will fall through it in real conditions. Designing well above the minimum is genuinely
        good practice.
      </P>
      <P>
        But the specific number is somebody else&apos;s panel, in somebody else&apos;s climate.
        220 V is meaningless without knowing what Vmp their panel has and how hot their summers
        get. What that advice is really standing in for is this:
      </P>
      <Formula note="A rule of thumb, not a code requirement. The ZonZelf calculator uses 25%.">
        string Vmp when hot ≥ MPPT minimum × (1 + headroom)
      </Formula>
      <P>
        Work out your own number instead of borrowing theirs. Take your panel&apos;s Vmp, sag it
        to a hot cell temperature, and put enough panels in series to clear the floor with room
        to spare. You will end up with a figure that is right for your array — and you will know{' '}
        <em>why</em> it is that figure, which matters the day you change panels.
      </P>
      <P>
        There is one hard rule buried in this: <strong>never solve a low-voltage problem by
        adding panels to a string without re-checking the cold end.</strong> The two limits push
        in opposite directions, and it is entirely possible to fix a summer harvest problem by
        creating a winter destruction problem.
      </P>

      <H2>7. Parallel strings, and why three is the number</H2>
      <P>
        Series is bounded by voltage. Parallel is bounded by current, and it has a second problem
        that is easy to miss: <strong>every string is a fault path as well as a source.</strong>
      </P>
      <P>
        If one string develops a fault, the others do not politely stop. They push current{' '}
        <em>into</em> the faulted string, through its wiring and connectors, which were sized for
        one string&apos;s current. With two strings the worst back-feed is one string&apos;s Isc,
        which a panel is built to survive. Add a third and it is not.
      </P>
      <Formula note="NEC 690.9(A). The 1.25 is NEC 690.8(A)(1) — bright conditions push a panel above nameplate.">
        fuses required when ( n − 1 ) × Isc × 1.25 &gt; module max series fuse rating
      </Formula>
      <P>
        For an ordinary panel — 11.5 A Isc, 20 A max series fuse — that works out as:
      </P>
      <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule">
        <table className="w-full text-sm">
          <caption className="sr-only">Back-feed current by number of parallel strings</caption>
          <thead>
            <tr className="border-b border-zon-rule bg-zon-cream text-left text-zon-muted">
              <th scope="col" className="px-4 py-2 font-medium">Parallel strings</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Possible back-feed</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Against a 20 A module</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['1', '—', 'no fuses needed'],
              ['2', '14.4 A', 'no fuses needed'],
              ['3', '28.8 A', 'fuses required'],
              ['4', '43.1 A', 'fuses required'],
            ].map(([n, bf, verdict]) => (
              <tr key={n} className="border-b border-zon-rule-soft last:border-0">
                <td className="px-4 py-2 font-mono text-zon-ink">{n}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-zon-body">{bf}</td>
                <td className={`px-4 py-2 text-right ${verdict === 'fuses required' ? 'text-zon-ink' : 'text-zon-muted'}`}>
                  {verdict}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        That is where the common rule &ldquo;one or two strings need no fuses, three or more
        do&rdquo; comes from. It is not arbitrary — it falls out of that inequality for typical
        panel numbers. Check it against <em>your</em> panel&apos;s Isc and its max series fuse
        rating, both printed on the label.
      </P>
      <P>
        Separately, the total array current has to stay inside what the tracker&apos;s input is
        rated for, and that also carries the 1.25 factor:
      </P>
      <Formula note="Per tracker. A unit with two MPPTs gets this many strings on each, not in total.">
        strings in parallel = floor( tracker max input current ÷ ( Isc × 1.25 ) )
      </Formula>

      <H3>Two trackers is two inputs, not one bigger input</H3>
      <P>
        Most hybrid inverters have two MPPTs, and this is where a lot of otherwise-careful
        designs go wrong in <em>both</em> directions. Each tracker is a completely separate
        input with its own voltage window and its own current rating. Nothing adds across them.
      </P>
      <Warn>
        <p>
          <strong>Seven panels in series on each of two trackers is not fourteen in series.</strong>{' '}
          Each input sees seven panels&apos; worth of voltage. With a 49.7 V panel at −25.9 °C
          that is about 410 V at each input — comfortably inside a 500 V limit. Wire the same
          fourteen panels as one string and you get 820 V, and the inverter is scrap.
        </p>
      </Warn>
      <P>
        The same logic runs the other way for current, and it is the half people
        <em> over</em>-correct for: two strings on a two-tracker unit is one string per input,
        so each input carries one string&apos;s current, not both. A 22 A per-tracker rating is
        not something two 17.5 A strings breach — unless you put them both on the same tracker.
      </P>
      <P>
        Power is the exception that does add, because the array as a whole has to fit the
        unit&apos;s total. Watch for datasheets that give both: EG4&apos;s 6000XP says
        &ldquo;8000 W (4000 W per MPPT)&rdquo;, so eight kilowatts all on one input is over the
        per-tracker limit even though it exactly matches the total.
      </P>
      <Note>
        <p>
          Rule of thumb: <strong>voltage and current are per input; power is usually both.</strong>{' '}
          When an arrangement is checked, every per-tracker limit is judged on the
          worst-loaded tracker — three strings across two trackers means one of them carries two.
        </p>
      </Note>

      <H3>Current has two limits too, for the same reason voltage does</H3>
      <P>
        Look carefully at which input current your datasheet gives, because good ones give two.
        The EG4 6000XP, for instance, publishes both:
      </P>
      <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule">
        <table className="w-full text-sm">
          <caption className="sr-only">The two PV input current ratings and what each means</caption>
          <thead>
            <tr className="border-b border-zon-rule bg-zon-cream text-left text-zon-muted">
              <th scope="col" className="px-4 py-2 font-medium">On the datasheet</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Value</th>
              <th scope="col" className="px-4 py-2 font-medium">Above it</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zon-rule-soft">
              <td className="px-4 py-2 font-mono text-zon-ink">Max. Usable Input Current</td>
              <td className="px-4 py-2 text-right font-mono tabular-nums text-zon-body">17 A</td>
              <td className="px-4 py-2 text-zon-body">Clipped, not harvested. Nothing breaks.</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-mono text-zon-ink">Max. Short Circuit Input Current</td>
              <td className="px-4 py-2 text-right font-mono tabular-nums text-zon-body">25 A</td>
              <td className="px-4 py-2 text-zon-body">The input stage is damaged.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <P>
        It is the same shape as the voltage pair, and the same trap: one is a harvest limit and
        one is a damage limit. Size your parallel strings against the <strong>short-circuit</strong>{' '}
        figure to know what is safe, and against the <strong>usable</strong> figure to know what
        you will actually collect. Taking the higher number as the usable one would let you wire
        about half again as many strings as the tracker can convert &mdash; and you would never
        see an error, only a quieter array than you paid for.
      </P>
      <Note>
        <p>
          If your datasheet gives only one input current figure, treat it as the damage limit and
          design under it. That is the conservative reading, and it is the same rule as for a
          datasheet that gives only one voltage.
        </p>
      </Note>

      <H2 id="datasheet">8. Reading your own datasheet</H2>
      <P>
        Everything above assumes you can find these numbers on the sheet in front of you. That is
        harder than it sounds, and it is not your fault: there is no standard vocabulary. The same
        number is &ldquo;Max Open Circuit Voltage&rdquo; on one manual and &ldquo;Max PV Input
        Voltage&rdquo; on the next.
      </P>
      <Note>
        <p>
          This section exists because of a real attempt. Someone with the Sun Gold SPH10048P
          manual open — a competent reader, following along — filled in four of nine fields and
          left five blank. The datasheet stated <em>every one</em> of them. Only the names
          differed. If that can happen to someone who is paying attention, it will happen to a
          beginner, so the translation is part of the product rather than something to look up.
        </p>
      </Note>

      <H3>Two that trip almost everyone</H3>
      <P>
        <strong>The MPPT range is one row and two numbers.</strong> A datasheet prints
        &ldquo;MPPT Operating Voltage Range 125 Vdc–425 Vdc&rdquo; on a single line. Those are two
        separate limits: below 125 V the tracker cannot work, above 425 V it stops tracking
        properly. Both are different from &mdash; and lower than &mdash; the &ldquo;Max Open
        Circuit Voltage 500 Vdc&rdquo; sitting a row above, which is the one that destroys the
        unit. Three numbers, three meanings, two adjacent rows.
      </P>
      <P>
        <strong>&ldquo;22/22 A&rdquo; is not a fraction.</strong> On a unit with two MPPT
        trackers, a max input current written like that means 22 A on each tracker. Not 22 A in
        total, not 44 A, and not 11. Enter 22 — the per-tracker figure is what limits how many
        strings go in parallel on each input.
      </P>

      <H3>The inverter fields</H3>
      <VocabularyTable
        step="inverter"
        caption="What ZonZelf asks for, and what inverter datasheets call the same number"
      />

      <H3>The panel fields</H3>
      <VocabularyTable
        step="panel"
        caption="What ZonZelf asks for, and what panel datasheets call the same number"
      />

      <Note>
        <p>
          <strong>Always take the manufacturer&apos;s own document</strong> — their manual or spec
          sheet, not a retailer&apos;s product page. Shop listings re-type these numbers, and a
          re-typed maximum PV input voltage is exactly the kind of error that destroys an
          inverter. Most manufacturers publish a &ldquo;user manuals&rdquo; or
          &ldquo;downloads&rdquo; page; the specification tables are usually near the back.
        </p>
      </Note>

      <H2>9. Putting it together</H2>
      <P>
        A worked design, end to end, using the example panel and inverter from the calculator.
      </P>
      <Card className="my-5">
        <CardContent className="space-y-3 pt-5 text-sm">
          <p className="text-zon-body">
            <strong className="text-zon-ink">The panel:</strong> 400 W · Voc 45.0 V · Vmp 37.5 V ·
            Isc 11.5 A · β<sub>Voc</sub> −0.28 %/°C · β<sub>Pmax</sub> −0.35 %/°C · 20 A max
            series fuse
          </p>
          <p className="text-zon-body">
            <strong className="text-zon-ink">The inverter:</strong> max PV input 500 V · MPPT
            window 120–450 V · 25 A per tracker · 8 kW PV input
          </p>
          <p className="text-zon-body">
            <strong className="text-zon-ink">The site:</strong> −12 °C coldest, 35 °C hottest
          </p>
          <hr className="border-zon-rule" />
          <ol className="ml-5 list-decimal space-y-2 text-zon-body">
            <li>
              <strong className="text-zon-ink">Cold Voc per panel.</strong> 45.0 × [1 + (−0.28/100)
              × (−37)] = 49.7 V.
            </li>
            <li>
              <strong className="text-zon-ink">Most in series.</strong> floor(500 ÷ 49.7) ={' '}
              <strong>10 panels</strong>. Not 11, even though 11 × 45 = 495 looks fine.
            </li>
            <li>
              <strong className="text-zon-ink">Hot Vmp per panel.</strong> Cells reach 35 + 30 =
              65 °C, so 37.5 × [1 + (−0.35/100) × 40] = 32.3 V.
            </li>
            <li>
              <strong className="text-zon-ink">Fewest in series.</strong> With 25% headroom over
              the 120 V floor: ceil(150 ÷ 32.3) = <strong>5 panels</strong>.
            </li>
            <li>
              <strong className="text-zon-ink">Most in parallel.</strong> floor(25 ÷ (11.5 × 1.25))
              = <strong>1 string per tracker</strong>. Two trackers, so two strings total.
            </li>
            <li>
              <strong className="text-zon-ink">The answer.</strong> Between 5 and 10 panels per
              string, one string per tracker. Ten in series × two trackers is 20 panels, 8 kW —
              exactly the unit&apos;s PV input rating.
            </li>
            <li>
              <strong className="text-zon-ink">Fuses?</strong> One string per tracker, so no
              string fusing is required by 690.9(A). Combiner and disconnect requirements are a
              separate question.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Warn>
        <p>
          <strong>This page teaches a method; it is not a design for your system.</strong> Real
          installations also have to deal with shading and string mismatch, rapid shutdown
          requirements, arc-fault protection, conductor and disconnect sizing, and the inverter&apos;s
          own derating in heat or at altitude. Have your design checked by a licensed electrician
          before you energise anything.
        </p>
      </Warn>

      <div className="my-8 rounded-xl border border-zon-gold-light bg-zon-gold-tint p-5">
        <p className="mb-2 flex items-center gap-2 font-semibold text-zon-ink">
          <Calculator className="h-4 w-4 text-zon-gold-deep" aria-hidden="true" />
          Run it on your own numbers
        </p>
        <p className="mb-3 text-sm text-zon-body">
          The array wiring calculator does every step above against your panel, your inverter and
          your site&apos;s temperatures, and shows the arithmetic for each one.
        </p>
        <Link
          href="/calculators/strings"
          className="inline-flex items-center gap-1 text-sm font-medium text-zon-gold-deep hover:underline"
        >
          Open the array wiring calculator →
        </Link>
      </div>

      <NextSteps
        items={[
          {
            href: '/calculators/inverter',
            title: 'Inverter & surge sizing',
            sub: 'The step that collects the window your string is checked against',
            Icon: Zap,
          },
          {
            href: '/calculators/panels',
            title: 'Panel sizing',
            sub: 'How many panels the energy side actually calls for',
            Icon: Sun,
          },
          {
            href: '/guides/how-it-works',
            title: 'How a solar system works',
            sub: 'Where the charge controller sits in the chain',
            Icon: Snowflake,
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
