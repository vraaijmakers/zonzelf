export type ChemistryId = 'lifepo4' | 'agm' | 'gel' | 'flooded'

interface VoltageBand {
  min: number
  max: number
}

interface CutoffProfile {
  /**
   * Lithium's discharge curve is flat, so voltage barely moves until the
   * pack is nearly empty — a single voltage number can't stand in for a
   * percent-remaining DoD limit. Lead-acid sags more linearly, so a resting
   * voltage is at least a usable clue.
   */
  voltageIsReliableProxy: boolean
  /**
   * Resting-voltage cutoff band per system voltage, sourced from
   * /guides/depth-of-discharge. Not a live/loaded reading — voltage sags
   * under load, so a resting number copied straight into a running cutoff
   * stops the inverter too late.
   */
  bandAtRest: Record<12 | 24 | 48, VoltageBand>
}

const LIFEPO4_CUTOFF: CutoffProfile = {
  voltageIsReliableProxy: false,
  bandAtRest: {
    12: { min: 12.8, max: 13.0 },
    24: { min: 25.6, max: 26.0 },
    48: { min: 51.2, max: 52.0 },
  },
}

const LEAD_ACID_CUTOFF: CutoffProfile = {
  voltageIsReliableProxy: true,
  bandAtRest: {
    12: { min: 12.1, max: 12.2 },
    24: { min: 24.2, max: 24.4 },
    48: { min: 48.4, max: 48.8 },
  },
}

export const CUTOFF_PROFILES: Record<ChemistryId, CutoffProfile> = {
  lifepo4: LIFEPO4_CUTOFF,
  agm: LEAD_ACID_CUTOFF,
  gel: LEAD_ACID_CUTOFF,
  flooded: LEAD_ACID_CUTOFF,
}

export function cutoffBand(chemistry: ChemistryId, systemVoltage: 12 | 24 | 48): VoltageBand {
  return CUTOFF_PROFILES[chemistry].bandAtRest[systemVoltage]
}

export function formatBand(band: VoltageBand): string {
  return `${band.min.toFixed(1)}–${band.max.toFixed(1)}V`
}


/**
 * Round-trip efficiency ranges — energy out divided by energy in.
 *
 * ONE SOURCE, TWO CONSUMERS. /guides/batteries publishes the range to the
 * reader and the battery calculator sizes an array from a single figure. They
 * used to be separate literals, and the calculator had drifted to the BEST case
 * of every range — which biases the array small, the direction that leaves
 * someone short in December. A guide that teaches one thing while the tool does
 * another is the failure this product exists to avoid, so both now read from
 * here and a test asserts the calculator sits at the midpoint.
 */
export interface EfficiencyRange {
  min: number
  max: number
}

export const ROUND_TRIP: Record<ChemistryId, EfficiencyRange> = {
  lifepo4: { min: 0.95, max: 0.98 },
  agm: { min: 0.80, max: 0.85 },
  gel: { min: 0.80, max: 0.85 },
  flooded: { min: 0.70, max: 0.80 },
}

/** The figure the calculators use: the middle of the published range. */
export function roundTripMidpoint(chemistry: ChemistryId): number {
  const r = ROUND_TRIP[chemistry]
  return (r.min + r.max) / 2
}

/** The range as the guide prints it, e.g. "95–98%". */
export function formatRoundTrip(chemistry: ChemistryId): string {
  const r = ROUND_TRIP[chemistry]
  return `${Math.round(r.min * 100)}–${Math.round(r.max * 100)}%`
}
