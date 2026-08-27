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
