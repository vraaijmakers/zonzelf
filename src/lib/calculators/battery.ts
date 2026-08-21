/**
 * Battery bank sizing. Consumes the load calculator's *adjusted* kWh
 * (losses already applied). Chemistry round-trip efficiency is shown in
 * the UI as a spec, not multiplied in again.
 */

export type BatteryChemistryId = 'lifepo4' | 'agm' | 'gel' | 'flooded'

export type BatteryType = {
  id: BatteryChemistryId
  name: string
  dod: number
  /** Round-trip, informational. Not used in the sizing formula. */
  roundTripEfficiency: number
  cycles: string
  notes: string
}

export const BATTERY_TYPES: BatteryType[] = [
  {
    id: 'lifepo4',
    name: 'LiFePO4 (Lithium)',
    dod: 0.8,
    roundTripEfficiency: 0.97,
    cycles: '3,000–6,000',
    notes: 'Best choice for most off-grid systems. High DoD, long life, safe chemistry. Higher upfront cost.',
  },
  {
    id: 'agm',
    name: 'AGM (Sealed Lead-Acid)',
    dod: 0.5,
    roundTripEfficiency: 0.85,
    cycles: '400–800',
    notes: 'Reliable and widely available. Lower DoD means you need more capacity for the same usable energy.',
  },
  {
    id: 'gel',
    name: 'Gel (Sealed Lead-Acid)',
    dod: 0.5,
    roundTripEfficiency: 0.85,
    cycles: '500–1,000',
    notes: 'Similar to AGM but more tolerant of partial charge. Slightly better cycle life. Slower charge rate.',
  },
  {
    id: 'flooded',
    name: 'Flooded Lead-Acid (FLA)',
    dod: 0.5,
    roundTripEfficiency: 0.80,
    cycles: '500–1,200',
    notes: 'Cheapest upfront. Requires regular maintenance (water topping). Must be vented. Often used in large off-grid systems.',
  },
]

export type BatterySizing = {
  usableKwh: number
  totalKwh: number
  totalAh: number
  usableAh: number
}

export function sizeBatteryBank(opts: {
  dailyKwh: number
  days: number
  voltage: number
  dod: number
}): BatterySizing {
  const dailyKwh = Number.isFinite(opts.dailyKwh) ? Math.max(0, opts.dailyKwh) : 0
  const days = Number.isFinite(opts.days) ? Math.max(1, opts.days) : 1
  const voltage = Number.isFinite(opts.voltage) && opts.voltage > 0 ? opts.voltage : 24
  const dod = Number.isFinite(opts.dod) ? Math.min(0.95, Math.max(0.1, opts.dod)) : 0.5

  const usableKwh = dailyKwh * days
  const totalKwh = usableKwh / dod
  const totalAh = (totalKwh * 1000) / voltage
  const usableAh = totalAh * dod

  return { usableKwh, totalKwh, totalAh, usableAh }
}

export type VoltageFamily = 12 | 24 | 48

export function voltageFamily(v: number): VoltageFamily {
  if (v < 18) return 12
  if (v < 36) return 24
  return 48
}

export type LvdGuidance = {
  /** Resting voltage range at the chemistry's DoD limit, if voltage is even usable. */
  restVolts: { min: number; max: number }
  /**
   * LiFePO4's voltage curve is too flat to use as a DoD setpoint.
   * Lead-acid rest voltage is a reasonable proxy.
   */
  preferSocMeter: boolean
  note: string
}

/**
 * Inverter/BMS cutoff guidance at the chemistry's recommended DoD.
 * These are rest-voltage ranges, not a single "set it to X" spec, and they
 * are not a substitute for the BMS or a shunt SoC meter.
 *
 * LiFePO4 80% DoD ≈ 20% SoC ≈ 3.20 V/cell rest (~12.8 V on a 12.8 V pack).
 * 12.0 V on that pack is near empty, not 80% DoD.
 *
 * Lead-acid 50% DoD rest is ~12.1–12.2 V per 12 V nominal. 11.8 V under load
 * is already deeper than 50%.
 */
export function lvdGuidance(chemistry: BatteryChemistryId, family: VoltageFamily): LvdGuidance {
  const series = family / 12

  if (chemistry === 'lifepo4') {
    const perCell = { min: 3.20, max: 3.25 }
    return {
      restVolts: { min: round1(perCell.min * 4 * series), max: round1(perCell.max * 4 * series) },
      preferSocMeter: true,
      note: 'LiFePO4 voltage is almost flat between ~20% and ~80% SoC, so a single inverter cutoff cannot enforce 80% DoD. Use the BMS SoC% or a shunt monitor. The rest-voltage range below is a rough 20% SoC floor — 12.0 V on a 12 V pack is near empty, not 80% DoD. Under load the voltage sags further; do not copy rest figures into a loaded LVD.',
    }
  }

  // Lead-acid 50% DoD rest: ~12.10–12.20 V per 12 V nominal.
  const per12 = { min: 12.10, max: 12.20 }
  return {
    restVolts: { min: round1(per12.min * series), max: round1(per12.max * series) },
    preferSocMeter: false,
    note: 'Lead-acid rest voltage is a usable SoC proxy. Measure at rest (no charge, no load, 1–2 hours). 11.8 V under load on a 12 V bank is already deeper than 50% DoD. Set the inverter cutoff from the rest range, then confirm against the battery datasheet.',
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
