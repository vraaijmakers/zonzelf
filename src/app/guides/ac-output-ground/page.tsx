import Link from 'next/link'
import { BookOpen, Cable, Ruler, Sun, Waypoints } from 'lucide-react'
import {
  GuideBreadcrumb, GuideDisclaimer, GuideHeader, Note, NextSteps, Tldr, Warn,
} from '@/components/guides/GuideChrome'
import { GuideClaims } from '@/components/guides/ClaimStamp'

export const metadata = {
  title: 'The AC Ground Wire Is Not the PV Ground Wire — ZonZelf Guide',
  description:
    'Panels grounded, copper run to the inverter, cabin panel another hundred feet away. The AC cable needs its own ground wire, landed at the inverter. The neutral-to-ground bond happens once, at that end — not again in the cabin.',
}

/**
 * The question one-ground-system deliberately does not answer.
 *
 * That page joins the array electrode to the inverter. Readers then build the
 * next hundred feet — inverter AC output to a cabin panel — and ask whether
 * the AC ground "also" has to land at the inverter. It does. The PV copper
 * is a different circuit, in a different trench, and the earth between two
 * rods will not clear a fault in an outlet box.
 *
 * REGISTER. Grounding is protection. This page shows where each rule is
 * written and does not name a gauge. The Sungold menu item is a worked
 * example of "read your manual, then meter it," not a setting to copy onto
 * a different inverter.
 *
 * THE BIG DIAGRAM is the page. Numbered markers in the drawing match the
 * short key under it, so the prose never has to re-describe a picture the
 * reader cannot see.
 */

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

function Derivation({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="my-5">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zon-muted">{title}</p>
      <div className="overflow-x-auto rounded-lg border border-zon-rule bg-zon-cream px-4 py-3">
        <pre className="font-mono text-sm leading-relaxed text-zon-ink">{children}</pre>
      </div>
    </div>
  )
}

function GroundGlyph({ x, y }: { x: number; y: number }) {
  return (
    <g className="stroke-zon-ink" strokeWidth={2} strokeLinecap="round">
      <line x1={x - 14} y1={y} x2={x + 14} y2={y} />
      <line x1={x - 9} y1={y + 6} x2={x + 9} y2={y + 6} />
      <line x1={x - 4} y1={y + 12} x2={x + 4} y2={y + 12} />
    </g>
  )
}

function Marker({ n, x, y }: { n: string; x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={9} className="fill-zon-ink" />
      <text
        x={x}
        y={y + 3.5}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        className="fill-zon-paper"
      >
        {n}
      </text>
    </g>
  )
}

/**
 * Three places, two circuits, one bond. Markers 1–5 are the only things the
 * prose needs the reader to find.
 */
function SystemDiagram() {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule bg-zon-paper p-4 lg:relative lg:left-1/2 lg:w-[min(60rem,calc(100vw-2rem))] lg:-translate-x-1/2">
      <svg
        viewBox="0 0 1040 640"
        className="h-auto w-[60rem] max-w-none lg:w-full"
        role="img"
        aria-label="Three locations. At the array, panel frames, a DC surge protector and a DC switch bond to earth rods, and a ground wire runs with the PV positive and PV negative to the inverter. At the inverter, that ground wire, the chassis, a DC surge protector and an AC surge protector all land on one ground bar. The only neutral-to-ground bond is a link from the inverter neutral terminal down to that bar. To the cabin, L1, L2, neutral and a separate ground wire travel in the same cable. At the cabin panel the neutral bar is not bonded to the ground bar. The ground bar receives the feeder ground wire, the grounds from the air conditioner, lights and outlets, and a conductor down to rods at the cabin. The soil between the rods is not the connection."
      >
        <text x={120} y={22} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-zon-ink">
          Array
        </text>
        <text x={500} y={22} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-zon-ink">
          Inverter
        </text>
        <text x={900} y={22} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-zon-ink">
          Cabin panel
        </text>

        {/* Array */}
        <rect x={24} y={40} width={192} height={200} rx={8} className="fill-zon-paper stroke-zon-ink" strokeWidth={2} />
        <text x={120} y={64} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-zon-ink">Panel frames</text>
        <text x={120} y={80} textAnchor="middle" fontSize={11} className="fill-zon-muted">bonded to each other</text>
        <rect x={40} y={98} width={72} height={32} rx={4} className="fill-zon-cream stroke-zon-ink" strokeWidth={1.5} />
        <text x={76} y={118} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-zon-ink">DC SPD</text>
        <rect x={128} y={98} width={72} height={32} rx={4} className="fill-zon-cream stroke-zon-ink" strokeWidth={1.5} />
        <text x={164} y={118} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-zon-ink">DC switch</text>
        <text x={120} y={156} textAnchor="middle" fontSize={11} className="fill-zon-body">frames, SPD, switch</text>
        <text x={120} y={172} textAnchor="middle" fontSize={11} className="fill-zon-body">all tied to the rods</text>
        <line x1={120} y1={240} x2={120} y2={268} className="stroke-zon-green" strokeWidth={3} />
        <GroundGlyph x={120} y={280} />
        <text x={120} y={312} textAnchor="middle" fontSize={11} className="fill-zon-muted">array rods</text>

        {/* PV pair */}
        <line x1={216} y1={96} x2={360} y2={96} className="stroke-zon-gold-deep" strokeWidth={2.5} />
        <line x1={216} y1={122} x2={360} y2={122} className="stroke-zon-gold-deep" strokeWidth={2.5} />
        <text x={288} y={88} textAnchor="middle" fontSize={11} className="fill-zon-gold-deep">PV+ / PV−</text>

        {/* 1 — DC ground copper */}
        <line x1={216} y1={250} x2={400} y2={250} className="stroke-zon-green" strokeWidth={4} strokeLinecap="round" />
        <Marker n="1" x={288} y={232} />
        <text x={288} y={214} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-zon-green">with the PV pair</text>

        {/* Inverter enclosure */}
        <rect x={360} y={40} width={300} height={430} rx={8} className="fill-zon-paper stroke-zon-ink" strokeWidth={2} />
        <text x={510} y={64} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-zon-ink">Chassis on the ground bar</text>

        <rect x={376} y={80} width={64} height={28} rx={4} className="fill-zon-cream stroke-zon-ink" strokeWidth={1.5} />
        <text x={408} y={98} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-zon-ink">DC SPD</text>
        <line x1={408} y1={108} x2={408} y2={242} className="stroke-zon-green" strokeWidth={2} />

        <rect x={560} y={78} width={80} height={28} rx={4} className="fill-zon-cream stroke-zon-ink" strokeWidth={1.5} />
        <text x={600} y={96} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-zon-ink">AC SPD</text>
        <line x1={600} y1={106} x2={600} y2={242} className="stroke-zon-green" strokeWidth={2} />

        {/* AC terminals */}
        <text x={520} y={148} fontSize={12} fontWeight={600} className="fill-zon-ink">L1</text>
        <text x={520} y={172} fontSize={12} fontWeight={600} className="fill-zon-ink">L2</text>
        <text x={520} y={198} fontSize={12} fontWeight={600} className="fill-zon-blue">N</text>
        <line x1={548} y1={194} x2={590} y2={194} className="stroke-zon-blue" strokeWidth={2.5} />

        {/* 3 — the only bond */}
        <line x1={590} y1={194} x2={590} y2={242} className="stroke-zon-green" strokeWidth={3} />
        <Marker n="3" x={548} y={214} />
        <text x={430} y={214} fontSize={11} fontWeight={600} className="fill-zon-green">only N–G bond</text>

        {/* 2 — ground bar */}
        <rect x={384} y={242} width={252} height={16} rx={3} className="fill-zon-green" />
        <Marker n="2" x={396} y={276} />
        <text x={416} y={280} fontSize={11} fontWeight={600} className="fill-zon-ink">one ground bar</text>
        <text x={510} y={304} textAnchor="middle" fontSize={11} className="fill-zon-muted">chassis screw · both SPDs · wire 1 · wire 4</text>
        <text x={510} y={340} textAnchor="middle" fontSize={11} className="fill-zon-body">Short SPD leads. No second rod</text>
        <text x={510} y={356} textAnchor="middle" fontSize={11} className="fill-zon-body">just for the AC side.</text>

        <text x={510} y={400} textAnchor="middle" fontSize={11} className="fill-zon-muted">AC output terminals</text>
        <text x={510} y={418} textAnchor="middle" fontSize={11} className="fill-zon-body">L1, L2, neutral, and ground</text>
        <text x={510} y={436} textAnchor="middle" fontSize={11} className="fill-zon-body">leave from here together.</text>

        {/* Feeder: hots, neutral, ground */}
        <line x1={660} y1={144} x2={800} y2={144} className="stroke-zon-ink" strokeWidth={2.5} />
        <line x1={660} y1={168} x2={800} y2={168} className="stroke-zon-ink" strokeWidth={2.5} />
        <line x1={660} y1={194} x2={820} y2={194} className="stroke-zon-blue" strokeWidth={2.5} />
        <line x1={636} y1={250} x2={820} y2={250} className="stroke-zon-green" strokeWidth={4} strokeLinecap="round" />
        <text x={730} y={136} textAnchor="middle" fontSize={11} className="fill-zon-ink">L1</text>
        <text x={730} y={162} textAnchor="middle" fontSize={11} className="fill-zon-ink">L2</text>
        <text x={730} y={188} textAnchor="middle" fontSize={11} className="fill-zon-blue">N</text>
        <Marker n="4" x={730} y={228} />
        <text x={730} y={276} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-zon-green">same cable, ~100 ft</text>

        {/* Cabin */}
        <rect x={800} y={40} width={216} height={430} rx={8} className="fill-zon-paper stroke-zon-ink" strokeWidth={2} />
        <text x={908} y={78} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-zon-ink">Load breakers</text>
        <rect x={820} y={186} width={176} height={14} rx={3} className="fill-zon-blue" />
        <text x={908} y={176} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-zon-blue">neutral bar — isolated</text>
        <text x={908} y={222} textAnchor="middle" fontSize={11} fontWeight={700} className="fill-zon-red">not connected</text>

        <rect x={820} y={242} width={176} height={16} rx={3} className="fill-zon-green" />
        <Marker n="5" x={836} y={284} />
        <text x={854} y={288} fontSize={11} fontWeight={600} className="fill-zon-ink">ground bar</text>

        <text x={908} y={318} textAnchor="middle" fontSize={11} className="fill-zon-muted">each load grounds here</text>
        <line x1={848} y1={258} x2={848} y2={436} className="stroke-zon-green" strokeWidth={2} />
        {(
          [
            [340, 'Airco'],
            [378, 'Lights'],
            [416, 'Outlets'],
          ] as const
        ).map(([y, label]) => (
          <g key={label}>
            <line x1={848} y1={y + 12} x2={868} y2={y + 12} className="stroke-zon-green" strokeWidth={2} />
            <rect x={868} y={y} width={120} height={24} rx={4} className="fill-zon-cream stroke-zon-ink" strokeWidth={1.5} />
            <text x={928} y={y + 16} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-zon-ink">{label}</text>
          </g>
        ))}

        <line x1={908} y1={470} x2={908} y2={508} className="stroke-zon-green" strokeWidth={3} />
        <GroundGlyph x={908} y={520} />
        <text x={908} y={552} textAnchor="middle" fontSize={11} className="fill-zon-muted">cabin rods</text>

        {/* Soil is not the conductor */}
        <line x1={20} y1={590} x2={1020} y2={590} className="stroke-zon-rule" strokeWidth={2} strokeDasharray="3 5" />
        <text x={24} y={608} fontSize={11} className="fill-zon-muted">soil</text>
        <text x={520} y={628} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-zon-ink">
          The connection between the rods is the green wire above, not the dirt.
        </text>
      </svg>
    </div>
  )
}

function FaultDiagram() {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule bg-zon-paper p-4 lg:relative lg:left-1/2 lg:w-[min(60rem,calc(100vw-2rem))] lg:-translate-x-1/2">
      <svg
        viewBox="0 0 880 230"
        className="h-auto w-[48rem] max-w-none lg:w-full"
        role="img"
        aria-label="A hot wire touching a metal outlet box. Fault current returns on the ground wire in the AC cable to the neutral-ground bond at the inverter, and the breaker opens. A path through the soil between two rods is crossed out, because the earth is not a fault-clearing path."
      >
        <rect x={24} y={36} width={150} height={64} rx={6} className="fill-zon-paper stroke-zon-ink" strokeWidth={2} />
        <text x={99} y={62} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-zon-ink">Outlet box</text>
        <text x={99} y={80} textAnchor="middle" fontSize={11} className="fill-zon-red">hot touches metal</text>

        <line x1={174} y1={58} x2={330} y2={58} className="stroke-zon-green" strokeWidth={4} />
        <text x={252} y={46} textAnchor="middle" fontSize={11} fontWeight={600} className="fill-zon-green">ground wire in the AC cable</text>

        <rect x={330} y={36} width={170} height={64} rx={6} className="fill-zon-paper stroke-zon-ink" strokeWidth={2} />
        <text x={415} y={62} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-zon-ink">N–G bond</text>
        <text x={415} y={80} textAnchor="middle" fontSize={11} className="fill-zon-muted">at the inverter</text>

        <line x1={500} y1={58} x2={640} y2={58} className="stroke-zon-ink" strokeWidth={2.5} />
        <polygon points="640,52 652,58 640,64" className="fill-zon-ink" />
        <rect x={660} y={36} width={190} height={64} rx={6} className="fill-zon-green-tint stroke-zon-green" strokeWidth={2} />
        <text x={755} y={62} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-zon-ink">Breaker opens</text>
        <text x={755} y={80} textAnchor="middle" fontSize={11} className="fill-zon-muted">fault current got home</text>

        <line x1={99} y1={100} x2={99} y2={150} className="stroke-zon-red" strokeWidth={2} strokeDasharray="4 3" />
        <line x1={755} y1={100} x2={755} y2={150} className="stroke-zon-red" strokeWidth={2} strokeDasharray="4 3" />
        <line x1={99} y1={150} x2={755} y2={150} className="stroke-zon-red" strokeWidth={2} strokeDasharray="4 3" />
        <line x1={400} y1={138} x2={460} y2={168} className="stroke-zon-red" strokeWidth={2.5} />
        <line x1={460} y1={138} x2={400} y2={168} className="stroke-zon-red" strokeWidth={2.5} />
        <text x={430} y={198} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-zon-red">
          Through the soil, the breaker never sees it
        </text>
        <text x={430} y={216} textAnchor="middle" fontSize={11} className="fill-zon-muted">
          250.4(A)(5) — earth is not a ground-fault path
        </text>
      </svg>
    </div>
  )
}

function BondDiagram() {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule bg-zon-paper p-4 lg:relative lg:left-1/2 lg:w-[min(60rem,calc(100vw-2rem))] lg:-translate-x-1/2">
      <svg
        viewBox="0 0 880 250"
        className="h-auto w-[48rem] max-w-none lg:w-full"
        role="img"
        aria-label="Two arrangements. On the left, neutral joins ground only at the inverter and the cabin neutral bar is isolated, so normal current stays on the neutral. On the right, a second bond at the cabin lets normal neutral current travel back on the ground wire as well."
      >
        <text x={210} y={22} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-zon-green">One bond</text>
        <text x={650} y={22} textAnchor="middle" fontSize={13} fontWeight={700} className="fill-zon-red">Bond at both ends</text>

        {/* Correct */}
        <rect x={30} y={40} width={150} height={70} rx={6} className="fill-zon-paper stroke-zon-ink" strokeWidth={2} />
        <text x={105} y={68} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-zon-ink">Inverter</text>
        <text x={105} y={88} textAnchor="middle" fontSize={11} className="fill-zon-green">N joined to G</text>
        <line x1={180} y1={62} x2={300} y2={62} className="stroke-zon-blue" strokeWidth={2.5} />
        <line x1={180} y1={88} x2={300} y2={88} className="stroke-zon-green" strokeWidth={3} />
        <text x={240} y={54} textAnchor="middle" fontSize={10} className="fill-zon-blue">neutral</text>
        <text x={240} y={108} textAnchor="middle" fontSize={10} className="fill-zon-green">ground, idle</text>
        <rect x={300} y={40} width={150} height={70} rx={6} className="fill-zon-paper stroke-zon-ink" strokeWidth={2} />
        <text x={375} y={68} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-zon-ink">Cabin</text>
        <text x={375} y={88} textAnchor="middle" fontSize={11} className="fill-zon-muted">bars kept apart</text>
        <text x={210} y={150} textAnchor="middle" fontSize={12} className="fill-zon-body">Everyday current stays</text>
        <text x={210} y={168} textAnchor="middle" fontSize={12} className="fill-zon-body">on the neutral wire.</text>

        {/* Wrong */}
        <rect x={490} y={40} width={150} height={70} rx={6} className="fill-zon-paper stroke-zon-ink" strokeWidth={2} />
        <text x={565} y={68} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-zon-ink">Inverter</text>
        <text x={565} y={88} textAnchor="middle" fontSize={11} className="fill-zon-red">N joined to G</text>
        <line x1={640} y1={62} x2={760} y2={62} className="stroke-zon-red" strokeWidth={2.5} />
        <line x1={640} y1={88} x2={760} y2={88} className="stroke-zon-red" strokeWidth={3} />
        <text x={700} y={54} textAnchor="middle" fontSize={10} className="fill-zon-red">neutral current</text>
        <text x={700} y={108} textAnchor="middle" fontSize={10} className="fill-zon-red">and on the ground</text>
        <rect x={760} y={40} width={100} height={70} rx={6} className="fill-zon-paper stroke-zon-red" strokeWidth={2} />
        <text x={810} y={68} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-zon-ink">Cabin</text>
        <text x={810} y={88} textAnchor="middle" fontSize={11} className="fill-zon-red">bonded too</text>
        <text x={670} y={150} textAnchor="middle" fontSize={12} className="fill-zon-body">The ground wire is now</text>
        <text x={670} y={168} textAnchor="middle" fontSize={12} className="fill-zon-body">a second neutral. 250.6.</text>
      </svg>
    </div>
  )
}

function LandingTable() {
  const rows: [string, string, string][] = [
    ['PV+ and PV−', 'Array DC switch', 'Inverter PV input, via the inverter-end DC SPD'],
    ['1  Array ground copper', 'Frames, array SPD, array rods', 'Inverter ground bar'],
    ['2  Inverter ground bar', 'Chassis screw, both SPDs, wire 1', 'Wire 4, and the single N–G bond'],
    ['L1 and L2', 'Inverter AC output', 'Cabin breakers, then the loads'],
    ['Neutral', 'Inverter N terminal', 'Cabin neutral bar — isolated'],
    ['4  AC ground wire', 'Inverter ground bar', 'Cabin ground bar'],
    ['5  Cabin ground bar', 'Wire 4, load grounds, cabin rods', 'Not the neutral bar'],
  ]
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-zon-rule">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Where each conductor starts and where it lands
        </caption>
        <thead>
          <tr className="border-b border-zon-rule bg-zon-cream text-left text-zon-muted">
            <th scope="col" className="px-4 py-2 font-medium">Conductor</th>
            <th scope="col" className="px-4 py-2 font-medium">From</th>
            <th scope="col" className="px-4 py-2 font-medium">Lands on</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([what, from, to]) => (
            <tr key={what} className="border-b border-zon-rule-soft last:border-0">
              <td className="px-4 py-3 font-medium text-zon-ink">{what}</td>
              <td className="px-4 py-3 text-zon-body">{from}</td>
              <td className="px-4 py-3 text-zon-body">{to}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AcOutputGroundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <GuideBreadcrumb current="The AC ground wire" />
      <GuideHeader
        badges={['Safety', 'Wiring']}
        minutes="12 min read"
        title="The AC Ground Wire Is Not the PV Ground Wire"
        lede="The panels are grounded. A copper ground runs to the inverter with the DC lines, and the inverter chassis is on that copper. The cabin panel is another hundred feet of AC away. Does the AC output have to be grounded at the inverter too?"
      />
      <GuideDisclaimer />

      <Tldr>
        <p>
          <strong>Yes — a ground wire in the AC cable, landed on the inverter&apos;s ground bar and on the cabin panel&apos;s ground bar.</strong> It joins the grounding system you already built. It does not replace the PV copper, and it is not a new earth of its own.
        </p>
        <p>
          <strong>Neutral joins that ground in exactly one place, at the inverter end.</strong> The cabin panel keeps its neutral bar and its ground bar apart. A second bond there puts ordinary load current onto the ground wire for the whole hundred feet.
        </p>
        <p>
          <strong>A surge protector protects what is next to it.</strong> The one at the array does not cover this AC run. An AC unit belongs at the inverter output, and another at the cabin panel.
        </p>
      </Tldr>

      <P>
        Read{' '}
        <Link href="/guides/one-ground-system" className="text-zon-gold-deep hover:underline">
          one ground system, not two
        </Link>{' '}
        first if the array and the inverter are already a long way apart. That page is the DC hop. This one is the AC hop after it. The primer on what an earth rod actually is lives in{' '}
        <Link href="/guides/grounding" className="text-zon-gold-deep hover:underline">
          earth grounding
        </Link>.
      </P>

      <H2 id="picture">The picture</H2>
      <P>
        Three places. Two circuits. One bond. The numbers on the drawing are the whole argument — the rest of the page just says why each one is where it is.
      </P>
      <SystemDiagram />
      <ol className="mb-4 list-decimal space-y-2 pl-5 text-zon-body">
        <li>
          <strong>The copper you already ran</strong>, in the trench with PV+ and PV−. It bonds the array frames, the array surge protector, and the array rods to the inverter. It is not in the AC cable, so it cannot be the AC ground.
        </li>
        <li>
          <strong>One ground bar at the inverter.</strong> Chassis screw, both surge protectors, the array copper, and the AC ground wire. Not two leads that only meet out at a rod.
        </li>
        <li>
          <strong>The only neutral-to-ground bond</strong>, from the inverter neutral down to that bar. Nowhere else.
        </li>
        <li>
          <strong>The ground wire in the AC cable</strong>, the same cable as L1, L2, and neutral, all the way to the cabin.
        </li>
        <li>
          <strong>The cabin ground bar.</strong> Feeder ground, the grounds from the air conditioner, the lights, and the outlets, and a conductor down to rods at the cabin. The neutral bar is not on this list.
        </li>
      </ol>

      <H2 id="missing-wire">The wire that is still missing</H2>
      <P>
        Grounding the chassis answered a different question: if a PV conductor chafes through onto a panel frame, or a surge arrives at the array, the inverter and the array have to be the same piece of metal. That copper does that job, and only that job.
      </P>
      <P>
        The cabin circuit is L1, L2, neutral, and — this is the one people leave out — a ground wire, all in the same cable or conduit. <strong>300.3(B)</strong> is the general rule that the conductors of a circuit travel together. <strong>250.32(B)(1)</strong> is the rule for a separate building: an equipment grounding conductor runs with the supply, lands on the cabin disconnect, and lands on the cabin&apos;s grounding electrode. The neutral is not connected to that ground bar, and not to those rods.
      </P>
      <P>
        Why the rods are not enough is the part that feels wrong until you watch a fault try to clear.
      </P>
      <FaultDiagram />
      <P>
        A hot conductor touches a metal box in the cabin. The breaker opens only if that current can get back to the source on a low-resistance path. The source is the inverter. The path is the ground wire in the AC cable, through the bond, back into the inverter. <strong>250.4(A)(5)</strong> says the earth shall not be considered that path. Two rods and a hundred feet of soil are tens of ohms. A breaker needs a fraction of an ohm. Until the wire exists, the box just sits there, live.
      </P>
      <Warn>
        <p>
          An equipment ground at the inverter means the green wire of the AC cable lands on the inverter ground bar. It does not mean a fresh rod driven next to the inverter and called the AC ground. A rod that is not tied to this same bar is a second system, which is the failure the{' '}
          <Link href="/guides/one-ground-system" className="text-zon-gold-deep hover:underline">array page</Link>{' '}
          is about.
        </p>
      </Warn>

      <H2 id="lands">Where every wire lands</H2>
      <LandingTable />
      <P>
        The cabin still gets rods. <strong>250.32(A)</strong> wants a grounding electrode at a separate building supplied by a feeder. Those rods connect to the cabin ground bar, and the ground bar is already tied to the inverter by wire 4, which is tied to the array by wire 1. One system, touched to the earth in more than one place. The dashed line at the bottom of the drawing is soil. It is not a conductor you own.
      </P>
      <Note>
        <p>
          If the inverter sits in its own shed, that shed is a structure too. An electrode there belongs on the same ground bar — bonded in, not stood up as a private earth for the AC terminals.
        </p>
      </Note>

      <H2 id="bond">One neutral-to-ground bond, at the inverter end</H2>
      <P>
        Everything above is equipment grounding. Current is not supposed to flow on it. The other connection people mean by &ldquo;ground the AC output&rdquo; is the <strong>neutral-to-ground bond</strong>: the one point where the neutral, which does carry current all day, is tied to that grounding system so a fault has somewhere to return.
      </P>
      <P>
        An off-grid inverter is the source. It is not a utility service. <strong>250.30(A)(1)</strong> puts that system bonding jumper at a single point between the source and the first disconnect or overcurrent device — at the inverter, or in a disconnect next to it. Not at both. And because the cabin is a different building, <strong>250.32(B)(1)</strong> forbids making the bond out there on a new feeder. The allowance for a neutral-only run, with the bond at the far building and no ground wire, is an exception for existing premises. It came out of the code for new work in 2008.
      </P>
      <BondDiagram />
      <P>
        With one bond, a fault in the cabin travels the ground wire back to the inverter and the breaker opens. Neutral current from the air conditioner stays on the neutral. With a bond at both ends, the ground wire is in parallel with the neutral for a hundred feet. Part of the ordinary load current flows on it. That is objectionable current, <strong>250.6</strong>, and it is also a shock path on every bonded metal part along the run. More ground is not better ground. A second bond is a different circuit, sharing a name.
      </P>
      <Note>
        <p>
          <strong>Confirm the bond with a meter, on the mode you will actually run.</strong> Inverter on, no utility and no generator connected: neutral to the AC ground terminal should be a short. If it is open, nothing has made the bond, and the cabin panel is the wrong place to quietly add one. If you later connect a grid inlet or a generator, meter it again. Most portable generators bond neutral themselves. A bond you cannot open, plus theirs, is the two-bond picture.
        </p>
      </Note>
      <P>
        All-in-one inverters do not agree with each other, and the manual often describes the relay in one line. On the SunGoldPower SPH8 / SPH10 (manual V1.3) it is setting 63, &ldquo;Auto N-PE connection switch.&rdquo; It ships <strong>DIS</strong> — off. <strong>ENA</strong> turns the switch on. The manual does not draw the relay, so enabling it is not proof. Meter the output. The hybrid sibling, SG10KHB-48, calls the same idea &ldquo;PE-N connect enable&rdquo; and describes it as automatic switching of the PE-to-neutral connection, which is a hint that it is meant to change state — and still a thing to meter in inverter mode and again in bypass, not a hint to trust.
      </P>
      <P>
        Section 4.3 of that SPH manual already says to connect live, neutral, and ground on the AC output. Section 4.7 is the chassis screw: to the grounding bar, not smaller than 4 mm², kept short. That 4 mm² figure is the chassis lead. It is not the size of wire 4. The same manual&apos;s PV table lists a 22 A maximum input and a 2-pole 25 A breaker, and a 500 V maximum open-circuit voltage. A switch in that circuit has to be a DC switch at the string voltage. An AC breaker is not one, and 22 A is the input current, not the breaker the table names.
      </P>
      <Warn>
        <p>
          Leave setting 63 off and also leave the cabin bonding screw out, and there is no bond at all. Fault current has nowhere to return, and a GFCI has nothing solid to measure against. The ground wire being present does not create the bond. Someone has to make it, once, at the source end.
        </p>
      </Warn>

      <H2 id="spd">The surge protector has to sit next to what it protects</H2>
      <P>
        An SPD clamps at its own terminals, against its own ground reference. It does not clean a cable, and it does not reach a hundred feet. The array SPD limits what gets handed to the PV pair. It is not protecting the inverter, and it has nothing to do with the AC run. The same length rule that puts a DC unit at each end of a long PV run puts an <strong>AC</strong> unit at the inverter output and another at the cabin panel. Past about 10 m, both ends see their own event. A hundred feet is three times that.
      </P>
      <P>
        Use an AC-rated Type 2 device, not a spare DC PV cartridge. Land it on the ground bar beside it — marker 2 at the inverter, marker 5 at the cabin — on a short, straight lead. A foot of ground wire with a tidy loop in it can add more voltage than the SPD removed. The SPH maintenance section tells you to replace a failed arrester. It does not give you one inside the chassis you can skip buying.
      </P>
      <P>
        How the DC pair is coordinated, and why an array SPD with no bond to the inverter makes a surge worse, is the other page:{' '}
        <Link href="/guides/one-ground-system#spd-placement" className="text-zon-gold-deep hover:underline">
          where the SPD goes
        </Link>.
      </P>

      <H2 id="size">How big the AC ground wire is</H2>
      <P>
        Two lookups, and then whichever conductor satisfies both. Neither lookup is a number this page is willing to hand you.
      </P>
      <Derivation title="As the equipment grounding conductor in the AC cable">
{`250.32(B)(1) →  size it per 250.122
Table 250.122  →  from the rating of the overcurrent
                  device protecting the feeder, not from
                  the length and not from a chart of
                  "chassis wire"
250.122(B)     →  if you upsize L1 and L2, upsize the
                  ground wire in the same proportion`}
      </Derivation>
      <P>
        That last line is the one that costs money on a hundred-foot run, and it is the line people carry over from the PV side by mistake. On the array, <strong>690.45</strong> says you do not have to grow the equipment grounding conductor just because you grew the PV conductors for voltage drop. The waiver stops at the inverter. On the AC side, <strong>250.122(B)</strong> still applies. A ground wire sized for the breaker, next to hots you fattened for voltage drop, is no longer big enough.
      </P>
      <P>
        The manual&apos;s AC output table is a terminal minimum for a short connection at the inverter&apos;s listed current. It is not a design for a hundred feet, and it is not Table 250.122. Work the table against your breaker, then apply 250.122(B) if the hots grew, and have the result confirmed by whoever inspects the job. The voltage-drop half of the hot-wire decision is the{' '}
        <Link href="/calculators/awg" className="text-zon-gold-deep hover:underline">cable calculator</Link>.
      </P>
      <Note>
        <p>
          The cabin electrode conductor, down from the ground bar to the rods, is a different article again — <strong>250.66</strong>, with the rod-only ceiling in 250.66(A). The{' '}
          <Link href="/guides/one-ground-system#sizing" className="text-zon-gold-deep hover:underline">array page</Link>{' '}
          walks that derivation. Do not reuse it as the size of wire 4.
        </p>
      </Note>

      <H2 id="mistakes">What people do instead</H2>
      <ul className="mb-4 list-disc space-y-2 pl-5 text-zon-body">
        <li>Landing the AC output&apos;s ground on a new rod at the inverter, and not in the cable to the cabin. The chassis is earthed. The outlet box is not protected.</li>
        <li>Trusting the PV copper to be the AC ground, because both pieces of metal are &ldquo;ground&rdquo; and they meet at the inverter. They meet. They are not in the AC cable.</li>
        <li>A bonding screw in the cabin panel, and the inverter&apos;s N–PE switch left on. Two bonds, and load current on the ground wire.</li>
        <li>No bond anywhere: cabin screw removed, inverter switch left at its default off. The ground wire is installed and still does not clear a fault.</li>
        <li>One AC surge protector at the cabin, nothing at the inverter, on a run three times the length where one device can cover both ends.</li>
        <li>A DC surge protector moved to the AC output because a spare was in the box. Wrong voltage, wrong waveform, wrong device.</li>
        <li>Sizing the AC ground from the chassis-lead minimum in the manual, or from the PV-side rule that lets you skip a voltage-drop upsize.</li>
      </ul>

      <Warn>
        <p>
          This page is the mechanism, not your drawing. Conductor size, where the single bond is physically made, and whether your inverter&apos;s relay actually closes are decisions your edition of the code, your manual, and your inspector make for this build. Meter the bond before the trench is closed. A ground wire you cannot get back to is the expensive version of a wrong assumption.
        </p>
      </Warn>

      <GuideClaims slug="ac-output-ground" />

      <div className="mt-10">
        <NextSteps
          items={[
            {
              href: '/guides/one-ground-system',
              title: 'One ground system, not two',
              sub: 'The DC hop — array rods to the inverter',
              Icon: Waypoints,
            },
            {
              href: '/guides/grounding',
              title: 'Earth grounding, in plain English',
              sub: 'What a rod, a bond, and a GFCI each are',
              Icon: Sun,
            },
            {
              href: '/guides/wiring',
              title: 'Cables and thickness',
              sub: 'The hots this ground wire has to keep up with',
              Icon: Cable,
            },
            {
              href: '/calculators/awg',
              title: 'Voltage drop and AWG',
              sub: 'What a hundred feet costs the current-carrying wires',
              Icon: Ruler,
            },
            {
              href: '/guides/glossary',
              title: 'Glossary',
              sub: 'EGC, neutral-to-ground bond, SPD',
              Icon: BookOpen,
            },
          ]}
        />
      </div>

      <p className="mt-8 text-xs text-zon-muted">
        Section numbers refer to the US National Electrical Code (NFPA 70), 2023 edition unless an older cycle is named. The about-10 m SPD spacing is the same IEC 60364-7-712 / IEC 61643-32 threshold as the array guide. The Sungold menu names are from SPH8-10KW User Manual V1.3 and the SG10KHB-48 manual, read as worked examples — your model wins over either one. Outside the US the principle is the same and the article numbers are not. In the Netherlands the governing document is NEN 1010. See our{' '}
        <Link href="/disclaimer" className="text-zon-gold-deep hover:underline">disclaimer</Link>.
      </p>
    </div>
  )
}
