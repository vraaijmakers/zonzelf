import type { ProtectionView } from './calc-register'

/**
 * Conductor ampacity and voltage drop, from a cited electrical code.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The AWG calculator previously used "chassis wiring" ratings — AWG 10 at 55A,
 * AWG 12 at 41A — presented as the maximum current a conductor could carry.
 * Those are roughly 80% higher than the NEC allows for building wiring, and
 * they were shown next to a large green "Recommended gauge". Under-sizing a
 * conductor is how DIY solar installations start fires, so this is the
 * highest-severity correctness bug found in the 2026-08-21 audit.
 *
 * SOURCE
 * ------
 * NEC Table 310.16 — allowable ampacities of insulated conductors rated up to
 * 2000V, **in raceway, cable, or earth**, at 30°C (86°F) ambient, with not more
 * than three current-carrying conductors. Copper only; ZonZelf does not size
 * aluminium.
 *
 * NEC 240.4(D) — the "small conductor rule". It caps overcurrent protection for
 * 14, 12 and 10 AWG copper regardless of what Table 310.16 allows, and it
 * overrides the ampacity column. This is why 10 AWG is a 30A conductor in
 * practice even though the 90°C column says 40A.
 *
 * WHAT THIS DELIBERATELY DOES NOT MODEL
 * -------------------------------------
 * - Free-air ampacity (NEC Table 310.17). Only one source for it could be
 *   verified, from an older NEC edition, so it is not shipped. Adding it
 *   requires a second independent source.
 * - Ambient temperatures above 30°C (NEC 310.15(B)(1) correction factors) and
 *   more than three current-carrying conductors in a raceway
 *   (310.15(C)(1) adjustment factors). Both REDUCE ampacity. A hot loft or a
 *   crowded conduit needs a derate this does not apply.
 * - Aluminium conductors, conduit fill, and terminal listings beyond the
 *   110.14(C) note below.
 * - Conductors smaller than 14 AWG. Table 310.16 does not cover them; the old
 *   20/18/16 AWG rows had no code basis and are gone.
 *
 * None of this is a substitute for the licensed-electrician review that remains
 * a production gate on the roadmap.
 */

/** Terminal temperature rating. NEC 110.14(C): the whole circuit is limited by
 *  the lowest-rated termination, not by the wire's own insulation. Most
 *  equipment terminals are listed 75°C, which is why that is the default —
 *  buying 90°C THHN does not let you use the 90°C column unless every
 *  termination is also listed for 90°C, which on DIY equipment it rarely is. */
export type TempColumn = 60 | 75 | 90

/** A PV source circuit carries an extra irradiance factor; see sizingFactor(). */
export type CircuitKind = 'general' | 'pv-source'

/**
 * The multiplier from operating current to the current a circuit must be built
 * for. It applies to the CONDUCTOR as well as to the overcurrent device — NEC
 * 210.19(A)(1) requires branch-circuit conductors to have an ampacity not less
 * than 125% of a continuous load, exactly as NEC 210.20(A) requires of the
 * device. Sizing the device at 125% and the wire at 100% is a common and
 * dangerous asymmetry; both bounds move together, so this lives in one place.
 *
 * NEC 690.8(A) stacks two 125% factors on a PV source circuit: one for
 * irradiance above nameplate, one for continuous duty. 1.25 x 1.25 = 1.56.
 */
export function sizingFactor(kind: CircuitKind, continuous: boolean): { factor: number; reason: string } {
  if (kind === 'pv-source') {
    return {
      factor: 1.56,
      reason: 'NEC 690.8(A): 125% of Isc for irradiance above nameplate, then 125% again as a continuous load',
    }
  }
  if (continuous) {
    return { factor: 1.25, reason: 'NEC 210.19(A)(1) and 210.20(A): 125% of a load running three hours or more' }
  }
  return { factor: 1, reason: 'Non-continuous load — no continuous-duty factor applied' }
}

export type AwgSpec = {
  /** Negative sizes are 1/0 (0), 2/0 (-1), 3/0 (-2), 4/0 (-3). */
  awg: number
  /** NEC Table 310.16 copper ampacity by terminal temperature column. */
  ampacity: Record<TempColumn, number>
  /** NEC 240.4(D) maximum overcurrent device, where the small-conductor rule applies. */
  ocpdCap?: number
  /** Ohms per 100 ft of conductor at 20°C, copper. */
  resistancePer100ft: number
}

/**
 * NEC Table 310.16, copper. Cross-checked against two independent published
 * reproductions of the 2023 table before being encoded here.
 */
export const AWG_SPECS: AwgSpec[] = [
  { awg: 14, ampacity: { 60: 15,  75: 20,  90: 25  }, ocpdCap: 15, resistancePer100ft: 0.253  },
  { awg: 12, ampacity: { 60: 20,  75: 25,  90: 30  }, ocpdCap: 20, resistancePer100ft: 0.159  },
  { awg: 10, ampacity: { 60: 30,  75: 35,  90: 40  }, ocpdCap: 30, resistancePer100ft: 0.100  },
  { awg: 8,  ampacity: { 60: 40,  75: 50,  90: 55  },              resistancePer100ft: 0.0628 },
  { awg: 6,  ampacity: { 60: 55,  75: 65,  90: 75  },              resistancePer100ft: 0.0395 },
  { awg: 4,  ampacity: { 60: 70,  75: 85,  90: 95  },              resistancePer100ft: 0.0249 },
  { awg: 3,  ampacity: { 60: 85,  75: 100, 90: 115 },              resistancePer100ft: 0.0197 },
  { awg: 2,  ampacity: { 60: 95,  75: 115, 90: 130 },              resistancePer100ft: 0.0157 },
  { awg: 1,  ampacity: { 60: 110, 75: 130, 90: 145 },              resistancePer100ft: 0.0125 },
  { awg: 0,  ampacity: { 60: 125, 75: 150, 90: 170 },              resistancePer100ft: 0.00989 },
  { awg: -1, ampacity: { 60: 145, 75: 175, 90: 195 },              resistancePer100ft: 0.00785 },
  { awg: -2, ampacity: { 60: 165, 75: 200, 90: 225 },              resistancePer100ft: 0.00623 },
  { awg: -3, ampacity: { 60: 195, 75: 230, 90: 260 },              resistancePer100ft: 0.00494 },
]

export function awgLabel(awg: number): string {
  if (awg === -3) return '4/0'
  if (awg === -2) return '3/0'
  if (awg === -1) return '2/0'
  if (awg === 0) return '1/0'
  return String(awg)
}

/**
 * The current a conductor may actually carry here: the Table 310.16 column
 * value, reduced to the 240.4(D) cap where the small-conductor rule applies.
 */
export function usableAmpacity(spec: AwgSpec, column: TempColumn): number {
  const tableValue = spec.ampacity[column]
  return spec.ocpdCap === undefined ? tableValue : Math.min(tableValue, spec.ocpdCap)
}

/** True when 240.4(D) is what limits this conductor, rather than its ampacity. */
export function isOcpdLimited(spec: AwgSpec, column: TempColumn): boolean {
  return spec.ocpdCap !== undefined && spec.ocpdCap < spec.ampacity[column]
}

export type GaugeEvaluation = {
  spec: AwgSpec
  label: string
  /** amps x the continuous/PV factor — what the conductor must actually carry. */
  designAmps: number
  /** Table 310.16 value before the small-conductor rule. */
  tableAmpacity: number
  /** After 240.4(D). */
  usableAmpacity: number
  ocpdLimited: boolean
  voltageDrop: number
  voltageDropPercent: number
  powerLossWatts: number
  meetsAmpacity: boolean
  meetsVoltageDrop: boolean
  /** Both constraints satisfied. */
  passes: boolean
}

export type EvaluateInput = {
  /** Operating current, amps. The continuous factor is applied here, not by the caller. */
  amps: number
  /** Whether the load runs three hours or more. Defaults to true — most solar does. */
  continuous?: boolean
  /** PV source circuits take the extra irradiance factor. */
  kind?: CircuitKind
  /** ONE-WAY run length in feet; the round trip is applied here. */
  oneWayFeet: number
  /** System nominal voltage. */
  volts: number
  /** Acceptable voltage drop, percent. */
  maxDropPercent: number
  column: TempColumn
}

/**
 * Evaluate every gauge against both constraints.
 *
 * Voltage drop uses the round-trip conductor length, because current flows out
 * and back: a 10 ft run is 20 ft of copper.
 */
export function evaluateGauges(input: EvaluateInput): GaugeEvaluation[] {
  const { amps, oneWayFeet, volts, maxDropPercent, column } = input
  const roundTripFeet = oneWayFeet * 2
  // The conductor is sized for the same design current as its protection.
  const { factor } = sizingFactor(input.kind ?? 'general', input.continuous ?? true)
  const designAmps = Math.max(0, amps) * factor

  return AWG_SPECS.map(spec => {
    const resistance = (spec.resistancePer100ft / 100) * roundTripFeet
    const voltageDrop = amps * resistance
    // Guard against a zero/absent system voltage rather than emitting NaN.
    const voltageDropPercent = volts > 0 ? (voltageDrop / volts) * 100 : Number.POSITIVE_INFINITY
    const usable = usableAmpacity(spec, column)
    const meetsAmpacity = usable >= designAmps
    const meetsVoltageDrop = voltageDropPercent <= maxDropPercent

    return {
      spec,
      label: awgLabel(spec.awg),
      designAmps,
      tableAmpacity: spec.ampacity[column],
      usableAmpacity: usable,
      ocpdLimited: isOcpdLimited(spec, column),
      voltageDrop,
      voltageDropPercent,
      powerLossWatts: amps * voltageDrop,
      meetsAmpacity,
      meetsVoltageDrop,
      passes: meetsAmpacity && meetsVoltageDrop,
    }
  })
}

/**
 * Every gauge satisfying both constraints — a set, not a verdict.
 *
 * The calculator returns the options the user's own inputs allow and shows how
 * each was derived, rather than emitting one authoritative "Recommended gauge".
 * See CLAUDE.md, "Legal posture": conductor sizing is a protection-register
 * output, and protection outputs never appear as a bare number.
 */
export function passingGauges(input: EvaluateInput): GaugeEvaluation[] {
  return evaluateGauges(input).filter(r => r.passes)
}

/** The thinnest gauge meeting ampacity alone, ignoring voltage drop. */
export function thinnestByAmpacity(input: EvaluateInput): GaugeEvaluation | undefined {
  return evaluateGauges(input).find(r => r.meetsAmpacity)
}

export const NEC_SOURCES = {
  ampacity: 'NEC Table 310.16 — copper, in raceway or cable, 30 °C ambient, ≤3 current-carrying conductors',
  smallConductor: 'NEC 240.4(D) — small conductor rule (14 AWG 15 A, 12 AWG 20 A, 10 AWG 30 A)',
  terminals: 'NEC 110.14(C) — the lowest-rated termination limits the circuit',
} as const

/**
 * Protection-register view of conductor sizing. The headline is the set of
 * sizes that pass both limits, not a "recommended gauge."
 */
export function conductorProtectionView(input: EvaluateInput): ProtectionView {
  const passing = passingGauges(input)
  const thinnest = passing[0]
  const roundTripFt = input.oneWayFeet * 2
  const dropBudgetV = (input.volts * input.maxDropPercent) / 100
  const column = input.column

  if (!thinnest) {
    return {
      id: 'conductor-gauge',
      title: 'Cable sizes that pass both limits',
      options: [],
      empty:
        'No listed size meets both your current and your voltage-drop limit. ' +
        'Split the load over two runs, shorten the run, raise the system voltage, or accept a larger drop.',
      steps: [],
      sources: [NEC_SOURCES.ampacity, NEC_SOURCES.smallConductor, NEC_SOURCES.terminals],
    }
  }

  const cap = thinnest.ocpdLimited
    ? ` but capped to ${thinnest.usableAmpacity}A by the small-conductor rule`
    : ''
  const kind = input.kind ?? 'general'
  const pct = kind === 'pv-source' ? '156' : '125'

  return {
    id: 'conductor-gauge',
    title: 'Cable sizes that pass both limits',
    options: passing.map(p => `${p.label} AWG`),
    empty: null,
    steps: [
      {
        title: 'Can it carry the current?',
        body:
          `At ${column} °C, ${thinnest.label} AWG is rated ${thinnest.tableAmpacity}A${cap}. ` +
          `Your ${input.amps}A must be carried as ${thinnest.designAmps.toFixed(1)}A — ` +
          `the conductor is sized at the same ${pct}% as its protection, not at the bare current.`,
      },
      {
        title: 'Is the drop acceptable?',
        body:
          `${input.maxDropPercent}% of ${input.volts}V is a ${dropBudgetV.toFixed(2)}V budget. ` +
          `${thinnest.label} AWG over ${Math.round(roundTripFt)}ft of copper at ${input.amps}A ` +
          `drops ${thinnest.voltageDrop.toFixed(2)}V (${thinnest.voltageDropPercent.toFixed(1)}%). ` +
          `Round trip is twice the one-way run, because current flows out and back.`,
      },
    ],
    sources: [NEC_SOURCES.ampacity, NEC_SOURCES.smallConductor, NEC_SOURCES.terminals],
  }
}

// ---------------------------------------------------------------------------
// Parallel conductors — what you actually do above 4/0
// ---------------------------------------------------------------------------

/**
 * WHY THIS EXISTS
 * ---------------
 * The AWG table stops at 4/0, which carries 230A at 75 degC. A 10kW inverter
 * on a 48V bank draws about 245A, needing 306A of design current — so a
 * perfectly ordinary off-grid system falls off the end of the table and the
 * calculator returned NOTHING, with no explanation.
 *
 * Two things happen above 4/0 in the real world:
 *
 *   1. AWG ITSELF ENDS. Larger conductors are sized in kcmil (thousand
 *      circular mils): 250, 300, 350, 400, 500. NEC Table 310.16 continues
 *      into them. For 306A at 75 degC you would need 350 kcmil. That is a
 *      thumb-thick cable needing a hydraulic crimper, and this calculator does
 *      not carry the kcmil table yet.
 *
 *   2. PARALLEL CONDUCTORS, which is what DIY off-grid actually does. Two 2/0
 *      per polarity instead of one enormous cable: easier to route, easier to
 *      terminate, and usually cheaper. NEC 310.10(H) permits it for 1/0 and
 *      larger.
 *
 * THE CONDITIONS ARE NOT OPTIONAL
 * -------------------------------
 * 310.10(H) allows paralleling only when the conductors are the same length,
 * the same material, the same size, the same insulation type and terminated
 * the same way. That is not bureaucratic: current divides between them in
 * inverse proportion to resistance, so a pair that differs in any of those
 * shares unevenly, and the one carrying more overheats while the meter says
 * the total is fine. Two 2/0 where one is a foot longer is not two 2/0.
 *
 * WHAT THIS DOES NOT MODEL
 * ------------------------
 * NEC 310.15(C)(1) derates when more than three current-carrying conductors
 * share a raceway, and paralleling is a fast way to exceed three. That derate
 * is not applied here, exactly as it is not applied to the single-conductor
 * table above. Conduit fill and the separate rules for parallel conductors in
 * separate raceways are also not modelled.
 */

/** NEC 310.10(H): nothing smaller than 1/0 may be paralleled. */
export const MIN_PARALLEL_AWG = 0

export interface ParallelOption {
  /** Conductors per polarity. */
  count: number
  spec: AwgSpec
  label: string
  /** Ampacity of one conductor, after the small-conductor rule. */
  eachAmpacity: number
  /** All of them together. */
  combinedAmpacity: number
  /** Drop with the current shared across them, percent. */
  voltageDropPercent: number
  meetsAmpacity: boolean
  meetsVoltageDrop: boolean
  passes: boolean
}

/**
 * The smallest number of conductors of each gauge that would carry the load.
 *
 * Returns one entry per gauge — the fewest conductors that work — rather than
 * every combination, because "2 × 2/0 or 3 × 1/0" is a choice a person makes
 * and "2, 3, 4 or 5 × 1/0" is noise.
 */
export function parallelOptions(input: EvaluateInput, maxCount = 4): ParallelOption[] {
  const { amps, oneWayFeet, volts, maxDropPercent, column } = input
  const { factor } = sizingFactor(input.kind ?? 'general', input.continuous ?? true)
  const designAmps = amps * factor
  const roundTripFeet = oneWayFeet * 2
  const out: ParallelOption[] = []

  for (const spec of AWG_SPECS) {
    if (spec.awg > MIN_PARALLEL_AWG) continue
    const each = usableAmpacity(spec, column)
    for (let count = 2; count <= maxCount; count++) {
      const combined = each * count
      // n conductors in parallel present 1/n the resistance.
      const resistance = (spec.resistancePer100ft / 100) * roundTripFeet / count
      const drop = amps * resistance
      const dropPercent = volts > 0 ? (drop / volts) * 100 : Number.POSITIVE_INFINITY
      const meetsAmpacity = combined >= designAmps
      const meetsVoltageDrop = dropPercent <= maxDropPercent
      if (meetsAmpacity && meetsVoltageDrop) {
        out.push({
          count, spec, label: awgLabel(spec.awg),
          eachAmpacity: each, combinedAmpacity: combined,
          voltageDropPercent: dropPercent,
          meetsAmpacity, meetsVoltageDrop, passes: true,
        })
        break
      }
    }
  }
  // Fewest conductors first, then thinnest — two fat ones usually beats four
  // thin ones for terminations, and that is the order people shop in.
  return out.sort((a, b) => a.count - b.count || b.spec.awg - a.spec.awg)
}

export const PARALLEL_SOURCES = {
  permitted: 'NEC 310.10(H) — conductors 1/0 and larger may be paralleled',
  identical:
    'NEC 310.10(H)(2) — parallel conductors must be the same length, material, size, ' +
    'insulation type and termination method',
} as const

export const KCMIL_NOTE =
  'Above 4/0 the AWG scale ends and conductors are sized in kcmil — 250, 300, 350, 400, 500. ' +
  'NEC Table 310.16 continues into them, and this calculator does not carry that table yet. ' +
  'For most DIY off-grid work the parallel option above is the practical answer anyway: two ' +
  'manageable cables beat one that needs a hydraulic crimper and a 6-inch bend radius.'
