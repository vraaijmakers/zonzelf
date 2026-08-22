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
