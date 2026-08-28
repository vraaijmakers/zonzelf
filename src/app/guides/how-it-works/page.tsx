import Link from 'next/link'
import {
  Sun, Settings2, Battery, PlugZap, Lightbulb, Home,
  ChevronRight, Calculator, Info,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'How a Solar System Actually Works — ZonZelf Guide',
  description: 'Build a solar system up from one panel and one bulb: why you need a charge controller, why you need a battery, and what charging vs. supplying the house actually means.',
}

type NodeKey = 'panel' | 'controller' | 'battery' | 'inverter' | 'load' | 'house'

const NODE: Record<NodeKey, { label: string; sub: string; Icon: LucideIcon }> = {
  panel:      { label: 'Solar panel',       sub: 'variable DC',        Icon: Sun },
  controller: { label: 'Charge controller', sub: 'the "converter"',    Icon: Settings2 },
  battery:    { label: 'Battery',           sub: 'DC storage',         Icon: Battery },
  inverter:   { label: 'Inverter',          sub: 'DC → AC',            Icon: PlugZap },
  load:       { label: 'Bulb',              sub: 'the load',          Icon: Lightbulb },
  house:      { label: 'House',             sub: 'AC loads',          Icon: Home },
}

function DefsArrow({ id }: { id: string }) {
  return (
    <defs>
      <marker id={`arrow-${id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" className="fill-zon-gold-deep" />
      </marker>
    </defs>
  )
}

function Box({ x, y, w, h, node }: { x: number; y: number; w: number; h: number; node: NodeKey }) {
  const { label, sub, Icon } = NODE[node]
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} className="fill-zon-paper stroke-zon-rule" strokeWidth={1.5} />
      <foreignObject x={x} y={y} width={w} height={h}>
        <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 px-1 text-center">
          <Icon className="w-4 h-4 text-zon-gold-deep" />
          <span className="text-[11px] font-semibold text-zon-ink leading-tight">{label}</span>
          <span className="text-[9px] text-zon-muted leading-tight">{sub}</span>
        </div>
      </foreignObject>
    </g>
  )
}

/** Base wire — always physically present, whether or not current is flowing right now. */
function Wire({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-zon-rule" strokeWidth={2} />
}

/** Animated overlay on top of a Wire — this is current actually flowing, right now, in this direction. */
function Flow({ id, x1, y1, x2, y2, reverse = false, bold = false }: {
  id: string; x1: number; y1: number; x2: number; y2: number; reverse?: boolean; bold?: boolean
}) {
  const [sx, sy, ex, ey] = reverse ? [x2, y2, x1, y1] : [x1, y1, x2, y2]
  return (
    <line
      x1={sx} y1={sy} x2={ex} y2={ey}
      className="stroke-zon-gold-deep zon-flow-dash"
      strokeWidth={bold ? 4 : 2.5}
      strokeLinecap="round"
      markerEnd={`url(#arrow-${id})`}
    />
  )
}

const STAGES: NodeKey[][] = [
  ['panel', 'load'],
  ['panel', 'controller', 'load'],
  ['panel', 'controller', 'battery', 'load'],
  ['panel', 'controller', 'battery', 'inverter', 'house'],
]

function BuildDiagram({ stage, id, caption }: { stage: 1 | 2 | 3 | 4; id: string; caption?: string }) {
  const nodes = STAGES[stage - 1]
  const n = nodes.length
  const boxW = n <= 2 ? 150 : n === 3 ? 135 : n === 4 ? 120 : 110
  const boxH = 64
  const vbW = 800
  const y = 30
  const margin = 20
  const gap = (vbW - margin * 2 - boxW * n) / (n - 1)

  return (
    <div>
      <svg viewBox={`0 0 ${vbW} 130`} className="w-full h-auto" role="img" aria-label={caption ?? 'System diagram'}>
        <DefsArrow id={id} />
        {nodes.map((node, i) => {
          const x = margin + i * (boxW + gap)
          const cy = y + boxH / 2
          return (
            <g key={node}>
              <Box x={x} y={y} w={boxW} h={boxH} node={node} />
              {i < n - 1 && (
                <line
                  x1={x + boxW} y1={cy} x2={x + boxW + gap} y2={cy}
                  className="stroke-zon-gold-deep" strokeWidth={2.5}
                  markerEnd={`url(#arrow-${id})`}
                />
              )}
            </g>
          )
        })}
      </svg>
      {caption && <p className="text-xs text-zon-muted text-center mt-1">{caption}</p>}
    </div>
  )
}

type FlowState = 'charging' | 'assist' | 'night'

function FlowDiagram({ state, id }: { state: FlowState; id: string }) {
  const panel      = { x: 20,  y: 20,  w: 120, h: 62 }
  const controller = { x: 190, y: 20,  w: 140, h: 62 }
  const inverter   = { x: 480, y: 20,  w: 110, h: 62 }
  const house      = { x: 650, y: 20,  w: 110, h: 62 }
  const battery    = { x: 480, y: 150, w: 110, h: 62 }
  const busX = 430
  const topY = panel.y + panel.h / 2
  const botY = battery.y + battery.h / 2

  const sunActive = state !== 'night'
  const bigLoad = state === 'assist'
  // The bus↔battery segment always agrees with the bus↕vertical segment: both
  // describe the same current, just two ends of the same wire down to the battery.
  const batteryCharging = state === 'charging'
  const batteryDischarging = state !== 'charging'

  return (
    <svg viewBox="0 0 800 250" className="w-full h-auto" role="img" aria-label={`${state} state diagram`}>
      <DefsArrow id={id} />

      <Wire x1={panel.x + panel.w} y1={topY} x2={controller.x} y2={topY} />
      <Wire x1={controller.x + controller.w} y1={topY} x2={busX} y2={topY} />
      <Wire x1={busX} y1={topY} x2={busX} y2={botY} />
      <Wire x1={busX} y1={botY} x2={battery.x} y2={botY} />
      <Wire x1={busX} y1={topY} x2={inverter.x} y2={topY} />
      <Wire x1={inverter.x + inverter.w} y1={topY} x2={house.x} y2={topY} />

      {sunActive && (
        <>
          <Flow id={id} x1={panel.x + panel.w} y1={topY} x2={controller.x} y2={topY} />
          <Flow id={id} x1={controller.x + controller.w} y1={topY} x2={busX} y2={topY} />
        </>
      )}
      {batteryCharging && (
        <>
          <Flow id={id} x1={busX} y1={topY} x2={busX} y2={botY} />
          <Flow id={id} x1={busX} y1={botY} x2={battery.x} y2={botY} />
        </>
      )}
      {batteryDischarging && (
        <>
          <Flow id={id} x1={busX} y1={topY} x2={busX} y2={botY} reverse />
          <Flow id={id} x1={busX} y1={botY} x2={battery.x} y2={botY} reverse />
        </>
      )}
      <Flow id={id} x1={busX} y1={topY} x2={inverter.x} y2={topY} bold={bigLoad} />
      <Flow id={id} x1={inverter.x + inverter.w} y1={topY} x2={house.x} y2={topY} bold={bigLoad} />

      <Box x={panel.x} y={panel.y} w={panel.w} h={panel.h} node="panel" />
      <Box x={controller.x} y={controller.y} w={controller.w} h={controller.h} node="controller" />
      <Box x={battery.x} y={battery.y} w={battery.w} h={battery.h} node="battery" />
      <Box x={inverter.x} y={inverter.y} w={inverter.w} h={inverter.h} node="inverter" />
      <Box x={house.x} y={house.y} w={house.w} h={house.h} node="house" />

      <g className={sunActive ? '' : 'opacity-25'} transform={`translate(${panel.x + panel.w / 2}, 8)`}>
        {sunActive ? (
          <circle r={5} className="fill-zon-gold" />
        ) : (
          <circle r={5} className="fill-zon-blue" />
        )}
      </g>
    </svg>
  )
}

function StateCard({ n, title, state, id, children }: {
  n: number; title: string; state: FlowState; id: string; children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-full bg-zon-gold-tint text-zon-gold-deep text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <FlowDiagram state={state} id={id} />
        <p className="text-sm text-zon-body mt-2">{children}</p>
      </CardContent>
    </Card>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-zon-blue-tint bg-zon-blue-tint">
      <CardContent className="pt-3 pb-3">
        <div className="flex gap-2 text-sm">
          <Info className="w-4 h-4 shrink-0 text-zon-blue mt-0.5" />
          <p className="text-zon-body">{children}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function HowItWorksGuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zon-muted mb-6">
        <Link href="/guides" className="hover:text-zon-body">Guides</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-zon-body">How a Solar System Works</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary">Fundamentals</Badge>
          <Badge variant="secondary">Beginner</Badge>
          <span className="text-xs text-zon-muted">14 min read</span>
        </div>
        <h1 className="text-3xl font-bold mb-3">How a Solar System Actually Works</h1>
        <p className="text-lg text-zon-body">
          Every off-grid system, no matter how big, is built from the same handful of pieces.
          Instead of listing them, we&apos;ll build one up from scratch — starting with a single
          panel and a light bulb — so each piece earns its place before we add it.
        </p>
      </div>

      {/* TL;DR */}
      <Card className="border-zon-gold-tint bg-zon-gold-tint mb-10">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-zon-gold-deep mb-2">The short answer</p>
          <p className="text-sm text-zon-body">
            A panel alone only powers things while the sun is on it, and its raw output swings
            too much to trust directly. A <strong>charge controller</strong> tames that output.
            A <strong>battery</strong> stores the energy so you have power after dark. An{' '}
            <strong>inverter</strong> turns the battery&apos;s DC into the AC your house sockets expect.
            The part that trips people up: charging and supplying the house are two separate
            paths that don&apos;t both run through the inverter — and at any given moment, the
            system might be doing one, the other, or both at once. That last part is the real
            subject of this guide.
          </p>
        </CardContent>
      </Card>

      {/* Section 1 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">1. The simplest possible system: a panel and a bulb</h2>
        <p className="text-zon-body mb-4">
          Wire a solar panel straight to a light bulb and, when the sun hits the panel, current
          flows and the bulb lights up. That&apos;s the whole idea of solar power: sunlight
          knocks electrons loose inside the panel, and if you give them a path — a wire, through
          the bulb, back to the panel — they flow. That flow <em>is</em> the current.
        </p>
        <BuildDiagram stage={1} id="s1" caption="Direct wiring — current only flows while the sun is on the panel" />
        <p className="text-zon-body mt-4 mb-2">This works, but it has two problems:</p>
        <ul className="text-sm text-zon-body space-y-1.5 list-disc pl-5">
          <li>
            <strong>The panel&apos;s output isn&apos;t steady.</strong> A cloud passing over, the
            sun angle changing through the day, even the panel&apos;s temperature — all of it
            makes the voltage and current swing. A bulb (or anything else) wired straight to the
            panel gets whatever the panel happens to be producing at that instant, which is fine
            for a bulb but will damage more sensitive equipment.
          </li>
          <li>
            <strong>No sun, no power.</strong> The moment the panel is in shadow or it&apos;s
            dark, the current stops. There&apos;s nowhere to store what was generated earlier.
          </li>
        </ul>
      </section>

      {/* Section 2 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">2. Taming the output: the charge controller (the &quot;converter&quot;)</h2>
        <p className="text-zon-body mb-4">
          This is the piece most people just call &quot;the converter,&quot; and it sits directly
          between the panel and everything downstream. Its job is to take the panel&apos;s messy,
          swinging DC output and convert it into a steady, correct output for whatever it&apos;s
          feeding.
        </p>
        <p className="text-zon-body mb-4">
          The good ones (<strong>MPPT</strong> — Maximum Power Point Tracking) constantly hunt
          for the exact combination of voltage and current where the panel is producing the most
          watts, and convert that into what the load actually needs — squeezing more usable
          energy out of the same panel than a simpler <strong>PWM</strong> controller would.
        </p>
        <BuildDiagram stage={2} id="s2" caption="Panel → charge controller → bulb" />
        <p className="text-zon-body mt-4">
          With the controller in place, the bulb gets a steady, safe supply instead of the
          panel&apos;s raw swings. It still only works while the sun is up — that problem hasn&apos;t
          been solved yet.
        </p>
      </section>

      {/* Section 3 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">3. Power after dark: adding a battery</h2>
        <p className="text-zon-body mb-4">
          A battery is a reservoir. Instead of the charge controller feeding the bulb directly,
          it now feeds the battery — and the battery feeds the bulb. During the day, the
          controller&apos;s real job becomes charging the battery correctly: pushing current in
          at a safe rate, then tapering off as the battery fills (this taper is what
          &quot;bulk / absorb / float&quot; charging stages refer to — see the{' '}
          <Link href="/guides/batteries" className="text-zon-gold-deep hover:underline">battery types guide</Link>{' '}
          for how that differs by chemistry).
        </p>
        <BuildDiagram stage={3} id="s3" caption="Panel → charge controller → battery → bulb" />
        <p className="text-zon-body mt-4">
          Now the bulb can run at night, drawing down what the battery stored during the day.
          This is already a complete, working system — plenty of small DC setups (a shed, a
          caravan) stop right here.
        </p>
      </section>

      {/* Section 4 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">4. Powering a house: adding an inverter</h2>
        <p className="text-zon-body mb-4">
          A battery stores DC (direct current). Household sockets and most appliances run on AC
          (alternating current). The <strong>inverter</strong> converts the battery&apos;s DC into
          the AC your house expects. It&apos;s a separate job from charging — many hybrid inverters
          bundle the charge controller and the inverter into one box, but they&apos;re still doing
          two different conversions.
        </p>
        <BuildDiagram stage={4} id="s4" caption="Panel → charge controller → battery → inverter → house" />
        <p className="text-zon-body mt-4">
          One thing worth flagging here, because it&apos;s the part that&apos;s easy to get
          backwards: <strong>charging the battery and powering the house are two separate
          paths.</strong> Current charges the battery by going panel → controller → battery
          directly — it never passes through the inverter to get there. The inverter only ever
          moves current the other way: battery (or the shared DC supply) → inverter → house. A
          small 12V DC load like our original bulb, or a USB charger, can still tap in before the
          inverter entirely and skip the DC→AC→DC round trip.
        </p>
      </section>

      {/* Section 5 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">5. The three things that can be happening at once</h2>
        <p className="text-zon-body mb-4">
          The controller and the battery both connect to a shared DC line — think of it as a
          little internal power bus. The inverter draws from that same bus to power the house.
          Whether the battery is being <em>charged</em> from that bus or <em>discharged</em> into
          it depends entirely on whether the panel is currently producing more or less than the
          house is using. Here are the three states that cover every situation:
        </p>

        <div className="space-y-5">
          <StateCard n={1} title="Sun is up, house load is small — charging" state="charging" id="f1">
            The panel produces more current than the house needs right now. The controller sends
            what the house is drawing straight to it, and routes the surplus down into the
            battery. This is the state you want during the middle of a sunny day.
          </StateCard>

          <StateCard n={2} title="Sun is up, house load is big — solar + battery together" state="assist" id="f2">
            The house is drawing more than the panel alone can supply — a kettle, a microwave, an
            AC unit all running at once. The panel still supplies what it can, and the battery
            simultaneously supplies the rest through the inverter. Both sources feed the house at
            the same time; this is usually called <strong>solar assist</strong>, and a hybrid
            inverter handles the split automatically.
          </StateCard>

          <StateCard n={3} title="No sun — battery only" state="night" id="f3">
            Night, or heavy cloud: the panel produces close to nothing. The battery is now the
            only source, discharging through the inverter to power the house, exactly like the
            simple bulb-at-night case from step 3 — just with an inverter and AC loads in place
            of a single DC bulb.
          </StateCard>
        </div>

        <div className="mt-5">
          <Note>
            The charge controller isn&apos;t deciding any of this in advance — it&apos;s just
            reacting, moment to moment, to the actual voltage and current on the bus. If the
            battery is already full and the house load is low, the controller simply limits how
            much current it draws from the panel. That&apos;s also why oversizing a panel array
            is safe: the extra capacity just goes unused on a bright day, rather than overcharging
            anything, as long as a controller is doing the regulating.
          </Note>
        </div>
      </section>

      {/* Section 6 */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-3">6. Why the calculators talk in kWh, not amps</h2>
        <p className="text-zon-body mb-4">
          The <Link href="/calculators/battery" className="text-zon-gold-deep hover:underline">battery</Link> and{' '}
          <Link href="/calculators/panels" className="text-zon-gold-deep hover:underline">panel</Link> calculators
          on this site size things in kWh — daily energy use, days of autonomy, peak sun hours.
          That&apos;s deliberate: sizing a system starts with &quot;how much energy do I need to
          store and generate,&quot; not with instantaneous amps. It&apos;s a real question,
          answered on its own terms — it isn&apos;t leaving the charging path out of the picture,
          it just isn&apos;t the question those two calculators are answering.
        </p>
        <p className="text-zon-body mb-4">
          The current (amps) this guide has been describing — through the panel wiring, through
          the controller, into the battery — is a separate, physical question: what has to flow
          through an actual wire at a given moment, which is what determines the wire gauge and
          the controller&apos;s amp rating. That&apos;s covered by the{' '}
          <Link href="/calculators/awg" className="text-zon-gold-deep hover:underline">AWG cable calculator</Link>.
        </p>
        <Note>
          The{' '}
          <Link href="/calculators/panels" className="text-zon-gold-deep hover:underline">
            panel calculator
          </Link>{' '}
          now checks whether your array can actually refill the bank in the available sun —
          at the annual average and in the worst month. A &quot;correct&quot; battery and a
          &quot;correct&quot; array sized independently can still under-charge every day;
          that is the first cross-stage check in the chain.
        </Note>
      </section>

      {/* Next steps */}
      <section className="border-t border-zon-rule pt-8">
        <h2 className="text-base font-semibold text-zon-muted uppercase tracking-wide mb-4">Next steps</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link href="/guides/batteries" className="flex items-center gap-3 p-4 rounded-xl border border-zon-rule hover:border-zon-gold-light hover:bg-zon-gold-tint transition-colors group">
            <div className="w-9 h-9 bg-zon-gold-tint rounded-lg flex items-center justify-center shrink-0">
              <Battery className="w-4 h-4 text-zon-gold-deep" />
            </div>
            <div>
              <p className="text-sm font-medium group-hover:text-zon-gold-deep">Battery Types guide</p>
              <p className="text-xs text-zon-muted">Which chemistry, and why</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zon-muted ml-auto group-hover:text-zon-gold" />
          </Link>
          <Link href="/calculators/panels" className="flex items-center gap-3 p-4 rounded-xl border border-zon-rule hover:border-zon-gold-light hover:bg-zon-gold-tint transition-colors group">
            <div className="w-9 h-9 bg-zon-gold-tint rounded-lg flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4 text-zon-gold-deep" />
            </div>
            <div>
              <p className="text-sm font-medium group-hover:text-zon-gold-deep">Panel sizing calculator</p>
              <p className="text-xs text-zon-muted">How many panels do you need?</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zon-muted ml-auto group-hover:text-zon-gold" />
          </Link>
        </div>
      </section>

    </div>
  )
}
