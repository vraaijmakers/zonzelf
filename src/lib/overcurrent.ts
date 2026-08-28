/**
 * Overcurrent protection — sizing the fuse or breaker that protects a conductor.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The AWG calculator recommended a conductor and said nothing about the device
 * protecting it. A correctly sized cable behind an oversized breaker is still a
 * fire: the wire becomes the fuse. That made an otherwise-correct output
 * actively unsafe, which is why this was a phase-0 gate rather than a feature.
 *
 * THE ONE RULE
 * ------------
 *     125% of the continuous load  <=  device rating  <=  conductor ampacity
 *
 * A device below the lower bound nuisance-trips. A device above the upper bound
 * does not protect the wire. If no standard size fits between them the
 * conductor is too small, and the answer is thicker cable — never a bigger
 * breaker.
 *
 * SOURCES
 * -------
 * - NEC 240.6(A) — the standard ampere ratings devices are actually made in.
 * - NEC 210.20(A) / 215.3 — at least 125% of a continuous load. "Continuous"
 *   means the maximum current is expected for three hours or more, which most
 *   solar circuits are.
 * - NEC 240.4(D) — the small-conductor rule caps 14, 12 and 10 AWG copper at
 *   15, 20 and 30 A regardless of the ampacity table, and overrides it.
 * - NEC 690.8(A) — PV source circuits take 125% of Isc for irradiance above
 *   nameplate, then 125% again as a continuous load: 156% of Isc in total.
 *   This is why a 10 A string wants a 20 A device rather than a 15 A one.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * ----------------------------------
 * NEC 240.4(B) permits rounding UP to the next standard size past the
 * conductor's ampacity, for devices at or below 800 A, when several conditions
 * hold — none of which can be established from the inputs here. So only sizes
 * at or below the conductor ampacity are returned. That is the conservative
 * reading, and an electrician may legitimately go one size higher.
 *
 * It also does not model ambient derates above 30 °C, conduit fill, motor or
 * transformer circuits (which have their own rules entirely), series-rated
 * assemblies, or interrupting rating — a device must also be able to break the
 * available fault current, which is a separate calculation not attempted here.
 */

import {
  AWG_SPECS, awgLabel, usableAmpacity, sizingFactor,
  type AwgSpec, type TempColumn, type CircuitKind,
} from './awg'
import type { ProtectionView } from './calc-register'

export { sizingFactor, type CircuitKind }

/** NEC 240.6(A), the ratings devices are manufactured in. */
export const STANDARD_RATINGS = [
  15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200,
  225, 250, 300, 350, 400, 450, 500, 600, 700, 800,
] as const

export interface OcpdInput {
  /** Continuous operating current, amps. For a PV source circuit this is Isc. */
  amps: number
  /** Whether the load runs for three hours or more. Most solar circuits do. */
  continuous: boolean
  kind: CircuitKind
  awg: number
  column: TempColumn
}

export interface OcpdResult {
  factor: number
  factorReason: string
  /** Smallest device rating that will not nuisance-trip. */
  minimumAmps: number
  /** Largest device the conductor can be protected by. */
  maximumAmps: number
  /** Whether 240.4(D) rather than the ampacity table set the ceiling. */
  ceilingIsSmallConductorRule: boolean
  conductorLabel: string
  /** Standard ratings satisfying both bounds, smallest first. */
  allowed: number[]
  /** No standard size fits — the conductor is too small for this load. */
  impossible: boolean
}

export function specFor(awg: number): AwgSpec | undefined {
  return AWG_SPECS.find(s => s.awg === awg)
}

export function sizeOvercurrent(input: OcpdInput): OcpdResult | null {
  const spec = specFor(input.awg)
  if (!spec) return null

  const { factor, reason } = sizingFactor(input.kind, input.continuous)
  const amps = Math.max(0, Number.isFinite(input.amps) ? input.amps : 0)
  const minimumAmps = amps * factor

  // The fuse must protect the wire, so the ceiling is what the conductor can
  // carry — after the small-conductor rule, which overrides the ampacity table.
  const maximumAmps = usableAmpacity(spec, input.column)
  const ceilingIsSmallConductorRule =
    spec.ocpdCap !== undefined && spec.ocpdCap < spec.ampacity[input.column]

  const allowed = STANDARD_RATINGS.filter(r => r >= minimumAmps && r <= maximumAmps)

  return {
    factor,
    factorReason: reason,
    minimumAmps,
    maximumAmps,
    ceilingIsSmallConductorRule,
    conductorLabel: awgLabel(spec.awg),
    allowed: [...allowed],
    impossible: allowed.length === 0,
  }
}

/**
 * The thinnest conductor that can carry this load AND be protected by a
 * standard device — what to go to when the chosen one cannot be.
 */
export function thinnestProtectableAwg(
  input: Omit<OcpdInput, 'awg'>,
): { awg: number; rating: number } | undefined {
  for (const spec of AWG_SPECS) {
    const r = sizeOvercurrent({ ...input, awg: spec.awg })
    if (r && !r.impossible) return { awg: spec.awg, rating: r.allowed[0] }
  }
  return undefined
}

export const OCPD_SOURCES = {
  standard: 'NEC 240.6(A) — standard device ratings',
  continuous: 'NEC 210.20(A) — at least 125% of a continuous load',
  smallConductor: 'NEC 240.4(D) — small conductor rule, overrides the ampacity table',
  pv: 'NEC 690.8(A) — 156% of Isc for a PV source circuit',
} as const

/**
 * A DC circuit needs a DC-rated device. An AC breaker cannot reliably break a
 * DC arc: alternating current crosses zero a hundred times a second and helps
 * the arc extinguish itself, while DC does not. A warning rather than a
 * calculation, and the most common dangerous substitution in DIY off-grid work.
 */
export const DC_RATING_WARNING =
  'On the DC side the device must be rated for DC at your system voltage. An AC-only breaker of the right amperage will still fail to break a DC fault, because DC never crosses zero to help the arc go out. Look for a DC voltage rating on the device itself, not just an amp rating.'

/**
 * Protection-register view of fuse/breaker sizing. The headline is the set of
 * standard ratings that fit between the two bounds, not a single device.
 */
export function ocpdProtectionView(ocpd: OcpdResult): ProtectionView {
  const sources = [OCPD_SOURCES.standard, OCPD_SOURCES.continuous, OCPD_SOURCES.smallConductor]
  if (ocpd.impossible) {
    return {
      id: 'ocpd-rating',
      title: `Fuse or breaker for ${ocpd.conductorLabel} AWG`,
      options: [],
      empty:
        `No standard device can protect ${ocpd.conductorLabel} AWG at this load. ` +
        `It would need at least ${ocpd.minimumAmps.toFixed(1)}A, but the conductor may not ` +
        `be protected above ${ocpd.maximumAmps}A. The answer is thicker cable, never a bigger breaker.`,
      steps: [],
      sources,
    }
  }
  return {
    id: 'ocpd-rating',
    title: `Fuse or breaker for ${ocpd.conductorLabel} AWG`,
    options: ocpd.allowed.map(a => `${a} A`),
    empty: null,
    steps: [
      {
        title: 'Not below',
        body:
          `${ocpd.minimumAmps.toFixed(1)}A — ${ocpd.factor}× the operating current. ${ocpd.factorReason}.`,
      },
      {
        title: 'Not above',
        body:
          `${ocpd.maximumAmps}A — what ${ocpd.conductorLabel} AWG can carry` +
          (ocpd.ceilingIsSmallConductorRule ? ', capped by the small-conductor rule' : '') +
          '. Above this the wire becomes the fuse.',
      },
    ],
    sources,
  }
}
