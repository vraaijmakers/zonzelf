/**
 * Cable sizing. Voltage-drop math is round-trip × copper Ω/100 ft at 20°C.
 *
 * Ampacity has two modes:
 * - conduit (default): NEC Table 310.16 (2020) 75°C copper column, ≤3
 *   current-carrying conductors, 30°C ambient. Conservative for in-wall /
 *   in-conduit / NM-style runs. NEN 1010 / IEC 60364 use mm² — convert and
 *   verify locally; this table does not replace that code.
 * - chassis: SAE-style chassis/battery-cable ratings, only for short,
 *   well-ventilated DC runs (battery interconnects), never in-wall.
 */

export type AmpacityMode = 'conduit' | 'chassis'

export type AwgSpec = {
  awg: number
  /** NEC 310.16 75°C Cu. Null = not a typical building-wire size. */
  conduitAmps: number | null
  chassisAmps: number
  ohmPer100ft: number
}

// Resistance: copper, 20°C, ohms per 100 ft of conductor (one way).
export const AWG_TABLE: AwgSpec[] = [
  { awg: 20, conduitAmps: null, chassisAmps: 11,  ohmPer100ft: 1.015 },
  { awg: 18, conduitAmps: null, chassisAmps: 16,  ohmPer100ft: 0.639 },
  { awg: 16, conduitAmps: null, chassisAmps: 22,  ohmPer100ft: 0.403 },
  { awg: 14, conduitAmps: 20,   chassisAmps: 32,  ohmPer100ft: 0.253 },
  { awg: 12, conduitAmps: 25,   chassisAmps: 41,  ohmPer100ft: 0.159 },
  { awg: 10, conduitAmps: 35,   chassisAmps: 55,  ohmPer100ft: 0.100 },
  { awg: 8,  conduitAmps: 50,   chassisAmps: 73,  ohmPer100ft: 0.0628 },
  { awg: 6,  conduitAmps: 65,   chassisAmps: 101, ohmPer100ft: 0.0395 },
  { awg: 4,  conduitAmps: 85,   chassisAmps: 135, ohmPer100ft: 0.0249 },
  { awg: 2,  conduitAmps: 115,  chassisAmps: 181, ohmPer100ft: 0.0157 },
  { awg: 1,  conduitAmps: 130,  chassisAmps: 211, ohmPer100ft: 0.0125 },
  { awg: 0,  conduitAmps: 150,  chassisAmps: 245, ohmPer100ft: 0.00989 },
  { awg: -1, conduitAmps: 175,  chassisAmps: 283, ohmPer100ft: 0.00785 }, // 2/0
  { awg: -2, conduitAmps: 200,  chassisAmps: 328, ohmPer100ft: 0.00623 }, // 3/0
  { awg: -3, conduitAmps: 230,  chassisAmps: 380, ohmPer100ft: 0.00494 }, // 4/0
]

export function awgLabel(awg: number): string {
  if (awg === -1) return '2/0'
  if (awg === -2) return '3/0'
  if (awg === -3) return '4/0'
  if (awg === 0) return '1/0'
  return String(awg)
}

export function ampacity(spec: AwgSpec, mode: AmpacityMode): number | null {
  return mode === 'conduit' ? spec.conduitAmps : spec.chassisAmps
}

export type AwgResult = AwgSpec & {
  voltDrop: number
  voltDropPct: number
  powerLoss: number
  meetsAmpacity: boolean
  meetsDrop: boolean
}

export function voltageDrop(opts: {
  amps: number
  oneWayFt: number
  voltage: number
  ohmPer100ft: number
}): { voltDrop: number; voltDropPct: number; powerLoss: number } {
  const amps = Number.isFinite(opts.amps) ? Math.max(0, opts.amps) : 0
  const oneWayFt = Number.isFinite(opts.oneWayFt) ? Math.max(0, opts.oneWayFt) : 0
  const voltage = Number.isFinite(opts.voltage) && opts.voltage > 0 ? opts.voltage : 1
  const roundTripFt = oneWayFt * 2
  const totalResistance = (opts.ohmPer100ft / 100) * roundTripFt
  const voltDrop = amps * totalResistance
  const voltDropPct = (voltDrop / voltage) * 100
  const powerLoss = amps * voltDrop
  return { voltDrop, voltDropPct, powerLoss }
}

export function evaluateAwgTable(opts: {
  amps: number
  oneWayFt: number
  voltage: number
  maxDropPct: number
  mode: AmpacityMode
}): AwgResult[] {
  const maxDropPct = Number.isFinite(opts.maxDropPct) ? opts.maxDropPct : 3
  return AWG_TABLE.map(spec => {
    const drop = voltageDrop({
      amps: opts.amps,
      oneWayFt: opts.oneWayFt,
      voltage: opts.voltage,
      ohmPer100ft: spec.ohmPer100ft,
    })
    const rating = ampacity(spec, opts.mode)
    const meetsAmpacity = rating != null && rating >= opts.amps
    const meetsDrop = drop.voltDropPct <= maxDropPct
    return { ...spec, ...drop, meetsAmpacity, meetsDrop }
  })
}

/** Thinnest gauge (highest AWG number) that meets both ampacity and drop. */
export function recommendAwg(results: AwgResult[]): AwgResult | undefined {
  return results.find(r => r.meetsAmpacity && r.meetsDrop)
}

export function minByAmpacity(results: AwgResult[]): AwgResult | undefined {
  return results.find(r => r.meetsAmpacity)
}
