import type { ReactNode } from 'react'
import Link from 'next/link'
import { CALC_STEPS, type StepId } from '@/lib/calc-steps'
import { SIZING_STORY, SIZING_STORY_HREF, beatStep } from '@/lib/sizing-story'
import { cn } from '@/lib/utils'

/**
 * DIY stick-figure pictures for the sizing chain.
 *
 * One person, seven stops. The character is drawn here so every panel is
 * obviously the same walk. Tokens only — gold is the accent, green/amber/red
 * are state (healthy / attention / fault), never decoration.
 */

const STROKE = 2.1

function DiyPerson({
  x, y, pose, scale = 1, flip = false, night = false,
}: {
  x: number
  y: number
  pose: 'clipboard' | 'night' | 'surge' | 'shade' | 'point' | 'cable' | 'hips'
  scale?: number
  flip?: boolean
  night?: boolean
}) {
  const stroke = night ? 'stroke-zon-paper' : 'stroke-zon-ink'
  const fill = night ? 'fill-zon-paper' : 'fill-zon-ink'
  const head = night ? 'fill-zon-night-soft' : 'fill-zon-paper'
  const sx = flip ? -scale : scale

  return (
    <g
      transform={`translate(${x} ${y}) scale(${sx} ${scale})`}
      className={stroke}
      fill="none"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1={0} y1={-15} x2={-7} y2={0} />
      <line x1={0} y1={-15} x2={7} y2={0} />
      <line x1={0} y1={-15} x2={0} y2={-31} />

      {pose === 'clipboard' && (
        <>
          <path d="M 0 -28 L -11 -22 L -13 -16" />
          <path d="M 0 -28 L 9 -20" />
          <g transform="translate(-24 -32) rotate(-12)">
            <rect x={0} y={0} width={13} height={17} rx={1.6} className="fill-zon-paper stroke-zon-ink" strokeWidth={1.6} />
            <rect x={3.5} y={-2.2} width={6} height={3.2} rx={1} className="fill-zon-gold stroke-zon-ink" strokeWidth={1} />
            <line x1={3} y1={6} x2={10} y2={6} className="stroke-zon-muted" strokeWidth={1.2} />
            <line x1={3} y1={9.5} x2={10} y2={9.5} className="stroke-zon-muted" strokeWidth={1.2} />
            <line x1={3} y1={13} x2={8} y2={13} className="stroke-zon-muted" strokeWidth={1.2} />
          </g>
        </>
      )}
      {pose === 'night' && (
        <>
          <path d="M 0 -28 L -8 -12" />
          <path d="M 0 -28 L 8 -14" />
        </>
      )}
      {pose === 'surge' && (
        <>
          <path d="M 0 -28 L -12 -46" />
          <path d="M 0 -28 L 14 -26" />
        </>
      )}
      {pose === 'shade' && (
        <>
          <path d="M 0 -28 L -9 -14" />
          <path d="M 0 -28 L 7 -40 L 2 -42" />
        </>
      )}
      {pose === 'point' && (
        <>
          <path d="M 0 -28 L -8 -14" />
          <path d="M 0 -28 L 18 -24" />
        </>
      )}
      {pose === 'cable' && (
        <>
          <path d="M 0 -28 L -6 -16" />
          <path d="M 0 -28 L 11 -18" />
          <ellipse cx={16} cy={-16} rx={7} ry={5.5} className="fill-none stroke-zon-gold-deep" strokeWidth={2.4} />
          <ellipse cx={16} cy={-16} rx={4} ry={3} className="fill-none stroke-zon-gold-deep" strokeWidth={1.6} />
        </>
      )}
      {pose === 'hips' && (
        <>
          <path d="M 0 -28 L -10 -22 L -6 -15" />
          <path d="M 0 -28 L 10 -22 L 6 -15" />
        </>
      )}

      <circle cx={0} cy={-39} r={8} className={`${head} ${stroke}`} strokeWidth={STROKE} />
      <circle cx={-2.6} cy={-40} r={1.05} className={fill} />
      <circle cx={2.6} cy={-40} r={1.05} className={fill} />
      {pose === 'surge' ? (
        <circle cx={0} cy={-35.6} r={1.3} className={fill} />
      ) : (
        <path d="M -2.6 -36.4 Q 0 -34.4 2.6 -36.4" />
      )}
    </g>
  )
}

function House({
  x, y, w = 88, h = 58, lit = false, night = false,
}: {
  x: number
  y: number
  w?: number
  h?: number
  lit?: boolean
  night?: boolean
}) {
  const peakX = x + w / 2
  const eaves = y - h
  return (
    <g>
      <polygon
        points={`${x - 8},${eaves} ${peakX},${eaves - 26} ${x + w + 8},${eaves}`}
        className="fill-zon-ink"
      />
      <rect
        x={x} y={eaves} width={w} height={h}
        className={night ? 'fill-zon-night-soft stroke-zon-paper' : 'fill-zon-paper stroke-zon-ink'}
        strokeWidth={1.8}
      />
      <rect
        x={x + w / 2 - 8} y={y - 32} width={16} height={32}
        className={night ? 'fill-zon-night stroke-zon-paper' : 'fill-zon-cream stroke-zon-ink'}
        strokeWidth={1.4}
      />
      <rect
        x={x + 12} y={eaves + 16} width={18} height={14} rx={1}
        className={lit ? 'fill-zon-gold' : 'fill-zon-blue-tint stroke-zon-ink'}
        strokeWidth={lit ? 0 : 1.2}
      />
    </g>
  )
}

function BatteryPack({ x, y, w = 26, h = 38 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} className="fill-zon-paper stroke-zon-ink" strokeWidth={1.8} />
      <rect x={x + 5} y={y - 4} width={6} height={4} rx={0.8} className="fill-zon-gold stroke-zon-ink" strokeWidth={1} />
      <rect x={x + w - 11} y={y - 4} width={6} height={4} rx={0.8} className="fill-zon-ink" />
      <line x1={x + 6} y1={y + 12} x2={x + w - 6} y2={y + 12} className="stroke-zon-rule" strokeWidth={1.2} />
      <line x1={x + 6} y1={y + 20} x2={x + w - 6} y2={y + 20} className="stroke-zon-rule" strokeWidth={1.2} />
    </g>
  )
}

function InverterBox({
  x, y, w = 52, h = 36, state = 'plain',
}: {
  x: number
  y: number
  w?: number
  h?: number
  state?: 'plain' | 'ok' | 'dead'
}) {
  const ring =
    state === 'ok' ? 'stroke-zon-green' :
    state === 'dead' ? 'stroke-zon-red' :
    'stroke-zon-ink'
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} className={`fill-zon-paper ${ring}`} strokeWidth={1.8} />
      <path
        d={`M ${x + 10} ${y + h / 2} q ${w * 0.12} ${-h * 0.28} ${w * 0.22} 0 t ${w * 0.22} 0 t ${w * 0.22} 0`}
        className={state === 'dead' ? 'stroke-zon-red' : 'stroke-zon-gold-deep'}
        fill="none"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {state === 'ok' && (
        <path d={`M ${x + w - 6} ${y - 8} l 4 4 l 8 -9`} className="stroke-zon-green" fill="none" strokeWidth={2.2} strokeLinecap="round" />
      )}
      {state === 'dead' && (
        <>
          <line x1={x + w - 2} y1={y - 12} x2={x + w + 10} y2={y} className="stroke-zon-red" strokeWidth={2.2} strokeLinecap="round" />
          <line x1={x + w + 10} y1={y - 12} x2={x + w - 2} y2={y} className="stroke-zon-red" strokeWidth={2.2} strokeLinecap="round" />
        </>
      )}
    </g>
  )
}

function PvModule({
  x, y, w = 38, h = 22, tilt = -18, snow = false,
}: {
  x: number
  y: number
  w?: number
  h?: number
  tilt?: number
  snow?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={2} className="fill-zon-night-soft stroke-zon-ink" strokeWidth={1.5} />
      <line x1={-w / 2 + 4} y1={0} x2={w / 2 - 4} y2={0} className="stroke-zon-rule" strokeWidth={1} />
      <line x1={0} y1={-h / 2 + 3} x2={0} y2={h / 2 - 3} className="stroke-zon-rule" strokeWidth={1} />
      {snow && (
        <rect x={-w / 2} y={-h / 2} width={w} height={5} rx={2} className="fill-zon-paper" />
      )}
    </g>
  )
}

function Fridge({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={34} height={92} rx={3} className="fill-zon-paper stroke-zon-ink" strokeWidth={1.8} />
      <line x1={x} y1={y + 28} x2={x + 34} y2={y + 28} className="stroke-zon-ink" strokeWidth={1.5} />
      <line x1={x + 28} y1={y + 10} x2={x + 28} y2={y + 20} className="stroke-zon-muted" strokeWidth={2} strokeLinecap="round" />
      <line x1={x + 28} y1={y + 42} x2={x + 28} y2={y + 58} className="stroke-zon-muted" strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

function Lamp({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x} y1={y + 62} x2={x} y2={y + 18} className="stroke-zon-ink" strokeWidth={1.8} strokeLinecap="round" />
      <polygon points={`${x - 14},${y + 20} ${x + 14},${y + 20} ${x + 8},${y} ${x - 8},${y}`} className="fill-zon-gold-tint stroke-zon-ink" strokeWidth={1.5} />
      <ellipse cx={x} cy={y + 64} rx={10} ry={3} className="fill-zon-rule-soft stroke-zon-ink" strokeWidth={1.2} />
    </g>
  )
}

function Laptop({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={36} height={22} rx={2} className="fill-zon-night-soft stroke-zon-ink" strokeWidth={1.5} />
      <rect x={x - 4} y={y + 22} width={44} height={5} rx={1} className="fill-zon-paper stroke-zon-ink" strokeWidth={1.4} />
    </g>
  )
}

function Pump({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={40} height={28} rx={3} className="fill-zon-paper stroke-zon-ink" strokeWidth={1.8} />
      <circle cx={x + 14} cy={y + 14} r={8} className="fill-zon-gold-tint stroke-zon-ink" strokeWidth={1.5} />
      <path d={`M ${x + 40} ${y + 10} h 14 v 36`} className="stroke-zon-ink" fill="none" strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={x + 54} cy={y + 50} r={3} className="fill-zon-blue stroke-zon-ink" strokeWidth={1} />
    </g>
  )
}

function Sun({ cx, cy, r, winter = false }: { cx: number; cy: number; r: number; winter?: boolean }) {
  const rays = winter ? 6 : 8
  const outer = winter ? r + 7 : r + 10
  return (
    <g>
      {Array.from({ length: rays }, (_, i) => {
        const a = (Math.PI * 2 * i) / rays - Math.PI / 2
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * (r + 3)}
            y1={cy + Math.sin(a) * (r + 3)}
            x2={cx + Math.cos(a) * outer}
            y2={cy + Math.sin(a) * outer}
            className="stroke-zon-gold"
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        )
      })}
      <circle cx={cx} cy={cy} r={r} className="fill-zon-gold" />
    </g>
  )
}

function Stop({
  n, x, y, label, labelAt = 'below',
}: {
  n: number
  x: number
  y: number
  label: string
  labelAt?: 'below' | 'right'
}) {
  const labelX = labelAt === 'right' ? x + 16 : x
  const labelY = labelAt === 'right' ? y + 4 : y + 24
  return (
    <g>
      <circle cx={x} cy={y} r={11} className="fill-zon-gold" />
      <text
        x={x} y={y + 4} textAnchor="middle"
        fontSize={11} fontWeight={700}
        className="fill-zon-ink font-sans"
      >
        {n}
      </text>
      <text
        x={labelX} y={labelY}
        textAnchor={labelAt === 'right' ? 'start' : 'middle'}
        fontSize={10}
        className="fill-zon-muted font-sans"
      >
        {label}
      </text>
    </g>
  )
}

function Caption({ x, y, children, night = false }: { x: number; y: number; children: string; night?: boolean }) {
  return (
    <text x={x} y={y} fontSize={11} className={`font-sans ${night ? 'fill-zon-gold-light' : 'fill-zon-muted'}`}>
      {children}
    </text>
  )
}

function Scene({
  label, night = false, children,
}: {
  label: string
  night?: boolean
  children: ReactNode
}) {
  // 240-tall so captions and the rounded-xl clip have room. Ground stays at 198.
  return (
    <svg viewBox="0 0 480 240" className="h-auto w-full font-sans" role="img" aria-label={label}>
      <rect width="480" height="240" className={night ? 'fill-zon-night' : 'fill-zon-cream'} />
      {children}
    </svg>
  )
}

function SceneLoad() {
  const g = 198
  return (
    <Scene label={SIZING_STORY[0].scene}>
      {/* Daylight through a window — this is inside the house, not a floating still-life. */}
      <rect x={36} y={22} width={42} height={34} rx={2} className="fill-zon-gold-tint stroke-zon-ink" strokeWidth={1.6} />
      <line x1={57} y1={22} x2={57} y2={56} className="stroke-zon-ink" strokeWidth={1.3} />
      <line x1={36} y1={39} x2={78} y2={39} className="stroke-zon-ink" strokeWidth={1.3} />
      <line x1={16} y1={g} x2={464} y2={g} className="stroke-zon-rule" strokeWidth={2} />
      <Fridge x={28} y={g - 92} />
      <Caption x={28} y={g + 22}>fridge</Caption>
      <Lamp x={100} y={g - 66} />
      <Caption x={86} y={g + 22}>lights</Caption>
      <Laptop x={148} y={g - 28} />
      <Caption x={148} y={g + 22}>laptop</Caption>
      <Pump x={230} y={g - 50} />
      <Caption x={230} y={g + 22}>well pump</Caption>
      <DiyPerson x={410} y={g} pose="clipboard" scale={1.55} flip />
    </Scene>
  )
}

function SceneBattery() {
  const g = 198
  return (
    <Scene label={SIZING_STORY[1].scene} night>
      <circle cx={64} cy={36} r={14} className="fill-zon-gold-light" />
      <circle cx={72} cy={30} r={14} className="fill-zon-night" />
      {[
        [140, 28], [200, 18], [280, 34], [360, 22], [430, 40],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.6} className="fill-zon-gold" />
      ))}
      <line x1={16} y1={g} x2={464} y2={g} className="stroke-zon-night-soft" strokeWidth={2} />
      <House x={36} y={g} w={100} h={64} lit night />
      <BatteryPack x={210} y={g - 42} />
      <BatteryPack x={244} y={g - 42} />
      <BatteryPack x={278} y={g - 42} />
      <Caption x={210} y={g + 22} night>the night shift</Caption>
      <DiyPerson x={400} y={g} pose="night" scale={1.55} night flip />
    </Scene>
  )
}

function SceneInverter() {
  const g = 198
  return (
    <Scene label={SIZING_STORY[2].scene}>
      <line x1={16} y1={g} x2={464} y2={g} className="stroke-zon-rule" strokeWidth={2} />
      <Pump x={36} y={g - 50} />
      {/* Surge from the motor into the box — the gulp is the whole point of this stop. */}
      <path
        d="M 80 158 L 108 92 L 126 128 L 148 80 L 168 122 L 192 88 L 230 166"
        className="stroke-zon-amber"
        fill="none"
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon points="230,166 218,158 222,172" className="fill-zon-amber" />
      <text x={132} y={68} fontSize={13} fontWeight={700} className="fill-zon-amber font-sans">gulp</text>
      <InverterBox x={230} y={g - 44} />
      <Caption x={230} y={g + 22}>the box that runs the house</Caption>
      <DiyPerson x={410} y={g} pose="surge" scale={1.55} flip />
    </Scene>
  )
}

function ScenePanels() {
  const g = 198
  return (
    <Scene label={SIZING_STORY[3].scene}>
      <Sun cx={70} cy={36} r={9} winter />
      <path d="M 16 52 q 28 -14 50 2" className="stroke-zon-rule" fill="none" strokeWidth={2} strokeLinecap="round" />
      {/* Bare winter tree */}
      <line x1={36} y1={g} x2={36} y2={88} className="stroke-zon-ink" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M 36 120 L 18 96 M 36 120 L 52 92 M 36 108 L 22 84 M 36 108 L 50 82" className="stroke-zon-ink" fill="none" strokeWidth={1.6} strokeLinecap="round" />
      {/* Roof */}
      <polygon points="90,198 250,72 460,198" className="fill-zon-paper stroke-zon-ink" strokeWidth={1.8} strokeLinejoin="round" />
      <PvModule x={250} y={118} tilt={-28} snow />
      <PvModule x={292} y={136} tilt={-28} snow />
      <PvModule x={334} y={154} tilt={-28} snow />
      <DiyPerson x={200} y={118} pose="shade" scale={1.25} />
      <Caption x={300} y={228}>December sun. Not July.</Caption>
    </Scene>
  )
}

function SceneArray() {
  const g = 198
  return (
    <Scene label={SIZING_STORY[4].scene}>
      <line x1={16} y1={g} x2={464} y2={g} className="stroke-zon-rule" strokeWidth={2} />
      <line x1={240} y1={16} x2={240} y2={204} className="stroke-zon-rule" strokeWidth={1.4} strokeDasharray="4 5" />
      <text x={120} y={28} textAnchor="middle" fontSize={11} className="fill-zon-muted font-sans">a warm afternoon</text>
      <text x={360} y={28} textAnchor="middle" fontSize={11} className="fill-zon-muted font-sans">a cold morning</text>

      <PvModule x={120} y={58} tilt={0} />
      <PvModule x={120} y={86} tilt={0} />
      <PvModule x={120} y={114} tilt={0} />
      <line x1={120} y1={126} x2={120} y2={150} className="stroke-zon-gold-deep" strokeWidth={1.8} />
      <InverterBox x={94} y={152} state="ok" />

      <PvModule x={360} y={58} tilt={0} snow />
      <PvModule x={360} y={86} tilt={0} snow />
      <PvModule x={360} y={114} tilt={0} snow />
      <line x1={360} y1={126} x2={360} y2={150} className="stroke-zon-red" strokeWidth={1.8} />
      <InverterBox x={334} y={152} state="dead" />
      {/* Snowflake */}
      <g transform="translate(410 48)" className="stroke-zon-blue" fill="none" strokeWidth={1.4} strokeLinecap="round">
        <line x1={0} y1={-8} x2={0} y2={8} />
        <line x1={-7} y1={-4} x2={7} y2={4} />
        <line x1={-7} y1={4} x2={7} y2={-4} />
      </g>

      <DiyPerson x={240} y={g} pose="point" scale={1.35} />
    </Scene>
  )
}

function SceneProtection() {
  const g = 198
  return (
    <Scene label={SIZING_STORY[5].scene}>
      <line x1={16} y1={g} x2={464} y2={g} className="stroke-zon-rule" strokeWidth={2} />
      {/* A real run: battery → fuse → inverter. The cartoon names the stop, not a gauge. */}
      <BatteryPack x={28} y={g - 42} />
      <path
        d="M 54 168 H 132"
        className="stroke-zon-ink"
        fill="none"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <rect x={132} y={156} width={40} height={24} rx={4} className="fill-zon-gold-tint stroke-zon-ink" strokeWidth={1.8} />
      <text x={152} y={172} textAnchor="middle" fontSize={10} fontWeight={700} className="fill-zon-ink font-sans">fuse</text>
      <path
        d="M 172 168 H 250"
        className="stroke-zon-ink"
        fill="none"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <InverterBox x={250} y={g - 44} />
      <Caption x={28} y={g + 22}>the fuse protects the wire</Caption>
      <DiyPerson x={400} y={g} pose="cable" scale={1.55} flip />
    </Scene>
  )
}

function SceneSystem() {
  const g = 198
  return (
    <Scene label={SIZING_STORY[6].scene}>
      <line x1={16} y1={g} x2={464} y2={g} className="stroke-zon-rule" strokeWidth={2} />
      <rect x={28} y={168} width={280} height={10} rx={2} className="fill-zon-ink" />
      <line x1={48} y1={178} x2={42} y2={g} className="stroke-zon-ink" strokeWidth={2.2} strokeLinecap="round" />
      <line x1={288} y1={178} x2={294} y2={g} className="stroke-zon-ink" strokeWidth={2.2} strokeLinecap="round" />
      <BatteryPack x={44} y={128} w={22} h={32} />
      <InverterBox x={86} y={132} w={44} h={30} />
      <PvModule x={164} y={148} tilt={-8} />
      <path d="M 196 156 C 220 148 236 162 258 156" className="stroke-zon-ink" fill="none" strokeWidth={3} strokeLinecap="round" />
      {/* Checklist — five ticks, one circled mismatch. */}
      <rect x={268} y={78} width={44} height={70} rx={3} className="fill-zon-paper stroke-zon-ink" strokeWidth={1.6} />
      {[0, 1, 2, 3].map(i => (
        <path
          key={i}
          d={`M ${278} ${94 + i * 12} l 3 3 l 6 -7`}
          className="stroke-zon-green"
          fill="none"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      ))}
      <circle cx={284} cy={140} r={7} className="fill-none stroke-zon-amber" strokeWidth={1.8} />
      <text x={284} y={144} textAnchor="middle" fontSize={10} fontWeight={700} className="fill-zon-amber font-sans">?</text>
      <DiyPerson x={400} y={g} pose="hips" scale={1.55} flip />
      <Caption x={28} y={g + 22}>make them talk to each other</Caption>
    </Scene>
  )
}

const SCENES: Record<StepId, () => ReactNode> = {
  load: SceneLoad,
  battery: SceneBattery,
  inverter: SceneInverter,
  panels: ScenePanels,
  array: SceneArray,
  protection: SceneProtection,
  system: SceneSystem,
}

export function SizingYardMap() {
  const g = 168
  const walk = g + 28
  const under = g + 68
  // Stop 6 sits under the cable run so 5 → 6 → 7 is a rectangular U, not a
  // left-to-right 6-5-7 that looks like the numbers got shuffled.
  const stops: { n: number; x: number; y: number; labelAt?: 'below' | 'right' }[] = [
    { n: 1, x: 92, y: walk },
    { n: 2, x: 248, y: walk },
    { n: 3, x: 348, y: walk },
    { n: 4, x: 500, y: 50, labelAt: 'right' },
    { n: 5, x: 590, y: walk, labelAt: 'right' },
    { n: 6, x: 430, y: under },
    { n: 7, x: 710, y: walk },
  ]

  return (
    <svg
      viewBox="0 0 800 280"
      className="h-auto w-full min-w-[640px] bg-zon-cream font-sans"
      role="img"
      aria-label="A yard with seven numbered stops: house, battery, inverter, roof, wiring, cable protection, and a workbench"
    >
      <rect width="800" height="280" className="fill-zon-cream" />
      <Sun cx={760} cy={32} r={11} />
      <line x1={20} y1={g} x2={780} y2={g} className="stroke-zon-rule" strokeWidth={2} />

      {/* Path in sizing order, not hardware order — the zigzag is the lesson. */}
      <path
        d={`M 92 ${walk} L 248 ${walk} L 348 ${walk} L 500 50 L 590 ${walk}
            L 590 ${under} L 430 ${under} L 710 ${under} L 710 ${walk}`}
        className="stroke-zon-gold"
        fill="none"
        strokeWidth={2.4}
        strokeDasharray="6 7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <House x={48} y={g} w={88} h={56} />
      <DiyPerson x={168} y={g} pose="clipboard" scale={1.2} />

      <BatteryPack x={226} y={g - 40} />
      <BatteryPack x={258} y={g - 40} />

      <InverterBox x={322} y={g - 40} />

      <PvModule x={444} y={96} tilt={-22} />
      <PvModule x={482} y={110} tilt={-22} />
      <PvModule x={520} y={124} tilt={-22} />
      <PvModule x={558} y={138} tilt={-22} />

      {/* Inverter, through a fuse, along the string — the cable stop 6 is about. */}
      <path
        d={`M 374 ${g - 20} C 408 ${g - 16} 424 ${g - 4} 444 102
            L 482 116 L 520 130 L 558 144`}
        className="stroke-zon-ink"
        fill="none"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x={412} y={g - 8} width={28} height={16} rx={3} className="fill-zon-gold-tint stroke-zon-ink" strokeWidth={1.4} />
      <text x={426} y={g + 4} textAnchor="middle" fontSize={8} fontWeight={700} className="fill-zon-ink font-sans">
        fuse
      </text>

      <rect x={650} y={g - 10} width={120} height={10} rx={2} className="fill-zon-ink" />
      <line x1={666} y1={g} x2={660} y2={g + 16} className="stroke-zon-ink" strokeWidth={2} strokeLinecap="round" />
      <line x1={754} y1={g} x2={760} y2={g + 16} className="stroke-zon-ink" strokeWidth={2} strokeLinecap="round" />
      <BatteryPack x={666} y={g - 48} w={20} h={28} />
      <InverterBox x={696} y={g - 44} w={36} h={24} />
      <PvModule x={758} y={g - 28} w={28} h={16} tilt={-10} />

      {stops.map(({ n, x, y, labelAt }) => (
        <Stop key={n} n={n} x={x} y={y} label={CALC_STEPS[n - 1].short} labelAt={labelAt} />
      ))}
    </svg>
  )
}

export function SizingHopNav() {
  return (
    <ol className="mt-3 flex flex-wrap gap-1.5">
      {CALC_STEPS.map(step => (
        <li key={step.id}>
          <a
            href={`#${step.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-zon-rule bg-zon-paper px-2.5 py-1 text-xs text-zon-body transition-colors hover:border-zon-gold-light hover:bg-zon-gold-tint"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zon-gold text-[10px] font-bold text-zon-ink">
              {step.n}
            </span>
            {step.short}
          </a>
        </li>
      ))}
    </ol>
  )
}

export function SizingOrderCompare() {
  const hardware = ['panel', 'controller', 'battery', 'inverter', 'house']
  const sizing = CALC_STEPS.map(s => s.short)

  return (
    <div className="space-y-4 rounded-xl border border-zon-rule bg-zon-cream p-4 sm:p-5">
      <ChainRow
        label="What the boxes do"
        items={hardware}
        hint="the physical path of current"
      />
      <ChainRow
        label="How we size them"
        items={sizing}
        hint="start at the kettle, not the roof"
        accent
      />
    </div>
  )
}

function ChainRow({
  label, items, hint, accent = false,
}: {
  label: string
  items: string[]
  hint: string
  accent?: boolean
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zon-muted">
        {label}
        <span className="ml-2 font-normal normal-case tracking-normal">· {hint}</span>
      </p>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={`${item}-${i}`} className="flex items-center gap-1.5">
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium',
                accent
                  ? 'bg-zon-gold-tint text-zon-ink'
                  : 'bg-zon-paper text-zon-body ring-1 ring-zon-rule',
              )}
            >
              {accent ? `${i + 1} ${item}` : item}
            </span>
            {i < items.length - 1 && (
              <span aria-hidden="true" className="text-zon-muted">→</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function SizingComic() {
  return (
    <ol className="space-y-12">
      {SIZING_STORY.map(beat => {
        const step = beatStep(beat.id)
        const Picture = SCENES[beat.id]
        return (
          <li key={beat.id} id={beat.id} className="scroll-mt-24">
            <article>
              <div className="overflow-hidden rounded-xl border border-zon-rule">
                <Picture />
              </div>
              <div className="mt-4 flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zon-gold text-sm font-bold text-zon-ink">
                  {step.n}
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-zon-ink">{step.label}</h3>
                  <p className="mt-1 text-zon-body">{beat.what}</p>
                  <p className="mt-1 text-zon-body">{beat.why}</p>
                  {step.href && (
                    <Link
                      href={step.href}
                      className="mt-2 inline-block text-sm font-medium text-zon-gold-deep hover:underline"
                    >
                      Open this step →
                    </Link>
                  )}
                </div>
              </div>
            </article>
          </li>
        )
      })}
    </ol>
  )
}

export function SizingStoryTeaser() {
  return (
    <section className="mb-10">
      <div className="overflow-x-auto rounded-t-xl border border-zon-rule bg-zon-cream">
        <SizingYardMap />
      </div>
      <div className="flex flex-col gap-2 rounded-b-xl border border-t-0 border-zon-rule bg-zon-paper px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zon-body">
          Seven stops from the kettle to a system that still works in December.
        </p>
        <Link
          href={SIZING_STORY_HREF}
          className="shrink-0 text-sm font-medium text-zon-gold-deep hover:underline"
        >
          See why this order →
        </Link>
      </div>
    </section>
  )
}
