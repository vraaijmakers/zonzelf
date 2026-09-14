import type { ProtectionView } from './calc-register'

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

export const CUTOFF_SOURCES = {
  guide: '/guides/depth-of-discharge — resting-voltage bands by chemistry, not a live setpoint',
  rest: 'A resting reading means nothing charging and nothing running. Voltage sags under load.',
  lithium: 'LiFePO4 discharge is flat; voltage is not a reliable DoD proxy. Use the BMS or percent remaining.',
  datasheet: 'Confirm against the battery manufacturer datasheet before programming an inverter.',
} as const

export function nominalSystemVoltage(v: number): 12 | 24 | 48 {
  if (v === 12 || v === 24 || v === 48) return v
  if (v < 18) return 12
  if (v < 36) return 24
  return 48
}

/**
 * Protection-register view of inverter cutoff. Lithium options are "use the
 * BMS", not a volt number — putting 12.8 V in the options list would be the
 * chart this exists to avoid. The resting floor is in the derivation, labelled
 * as already-near-empty. Lead-acid options are a resting band, never a live
 * setpoint.
 */
export function cutoffProtectionView(chemistry: ChemistryId, systemVoltage: number): ProtectionView {
  const volts = nominalSystemVoltage(systemVoltage)
  const profile = CUTOFF_PROFILES[chemistry]
  const band = cutoffBand(chemistry, volts)
  const rest = formatBand(band)

  if (!profile.voltageIsReliableProxy) {
    return {
      id: 'cutoff-voltage',
      title: 'When the inverter should stop',
      options: ['Use the BMS or percent remaining'],
      empty: null,
      steps: [
        {
          title: 'Voltage is not the answer',
          body:
            'LiFePO4 voltage barely moves until the pack is nearly empty, so a single ' +
            'number cannot mean "leave 20% in the tank." Tell the inverter to stop on ' +
            'percent remaining, or let the battery\'s own manager (BMS) do it.',
        },
        {
          title: 'If the inverter only has a voltage setting',
          body:
            `A rough everything-off floor at rest is ${rest} at ${volts}V. That is already ` +
            'close to empty, not 20% left. 12.0 V on a 12 V lithium pack is nearly empty.',
        },
      ],
      sources: [CUTOFF_SOURCES.guide, CUTOFF_SOURCES.lithium, CUTOFF_SOURCES.datasheet],
    }
  }

  return {
    id: 'cutoff-voltage',
    title: 'When the inverter should stop',
    options: [`${rest} at rest`],
    empty: null,
    steps: [
      {
        title: 'Resting voltage only',
        body:
          `${rest} is the "about half empty" neighbourhood for this chemistry at ${volts}V, ` +
          'measured with nothing charging and nothing running, after the bank has sat still.',
      },
      {
        title: 'Under load it sags',
        body:
          'Voltage sags under load, so copying this resting band into a live cutoff stops ' +
          'the inverter too late. 11.8 V while things are running on a 12 V lead-acid bank ' +
          'is already past halfway.',
      },
    ],
    sources: [CUTOFF_SOURCES.guide, CUTOFF_SOURCES.rest, CUTOFF_SOURCES.datasheet],
  }
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
