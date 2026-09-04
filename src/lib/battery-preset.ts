/**
 * Real battery packs a visitor can pick, with the programming fields the
 * shopping catalogue does not carry.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * battery_models can say "51.2 V, 100 Ah, LiFePO4, 80% DoD." That is enough
 * to count how many to buy. It is not enough to program an inverter: charge
 * voltage, series count, BMS ports, and the recommended SOC window live on
 * the manufacturer's battery manual, and a wrong one of those is how a
 * lithium pack is charged on a gel profile.
 *
 * The commissioning map (roadmap: "System designer: commissioning map for
 * chosen equipment") is gated on admitted equipment IDs. This list is the
 * battery half of that gate, sibling of INVERTER_PRESETS. Empty would be
 * honest until a row is admitted; a padded list would be worse.
 *
 * ADMISSION GATE — read before adding a row.
 *   1. Every number comes from the manufacturer's own battery manual, opened
 *      and read — not a retailer spec table, not the inverter's L16 preset.
 *   2. sourceUrl points at that manual, and it is reachable.
 *   3. Series count is derived from the labelled voltage (51.2 V LiFePO4 is
 *      16S) and written down, because the inverter menu speaks in L14/L15/L16
 *      and the sheet often never prints "16S".
 *   4. battery-preset-review.ts passes on the row.
 *
 * The inverter's lithium preset (SPH L16 boost 56.8 V) is NOT a source for
 * this list. Same brand, different document, and they disagree: this pack's
 * sheet says charge at 54.5 V. Flattening that into one number is the
 * failure the commissioning map exists to surface.
 */

import type { ChemistryId } from './battery-chemistry'
import { nominalSystemVoltage } from './battery-chemistry'

export type BatteryComms = 'can' | 'rs485' | 'rs232'

export interface BatteryPreset {
  id: string
  brand: string
  model: string
  chemistry: ChemistryId

  /** Nominal pack voltage as labelled, e.g. 51.2. */
  voltage: number
  /** Amp-hour capacity of one unit. */
  capacityAh: number
  /** kWh of one unit. Must equal voltage × Ah / 1000. */
  capacityKwh: number
  /**
   * Series cell count. 16S for a 51.2 V LiFePO4 pack (16 × 3.2 V). The
   * inverter menu names this L14/L15/L16; the battery sheet often does not
   * print it at all.
   */
  seriesCount: number

  /** Absorb / recommended charge voltage from the battery sheet. */
  recommendedChargeV: number
  /** Charge limited / maximum cut-off voltage. */
  chargeLimitV: number
  /** Full-charge judgment voltage, where the sheet states one separately. */
  fullChargeV?: number
  /** Taper current that counts as full, amps. */
  fullChargeCutoffA?: number
  /** Discharge cut-off voltage — already near empty on lithium. */
  dischargeCutoffV: number

  /** Recommended remaining-SOC floor, percent. 20 means leave 20% in the tank. */
  socMinPct: number
  /** Recommended remaining-SOC ceiling, percent. */
  socMaxPct: number
  /** Cycle-life DoD the sheet quotes, percent USED. 80 means 20% left. */
  cycleDodPct: number

  standardChargeA: number
  maxChargeA: number
  standardDischargeA: number
  maxDischargeA: number
  /** How many of these may sit in parallel. */
  maxParallel: number

  comms: BatteryComms[]
  canBaud?: number
  rs485Baud?: number

  chargeMinC: number
  chargeMaxC: number
  dischargeMinC: number
  dischargeMaxC: number

  /**
   * The MANUFACTURER's own manual. Never a retailer listing — a reseller's
   * spec table is a transcription. See the Discover Energy correction in
   * supabase/migrations/20260826000005_*.sql.
   */
  sourceUrl: string
}

/** 12/24/48 family the rest of the chain speaks in. */
export function presetVoltageFamily(preset: BatteryPreset): 12 | 24 | 48 {
  return nominalSystemVoltage(preset.voltage)
}

export function findBatteryPreset(id: string): BatteryPreset | undefined {
  return BATTERY_PRESETS.find(p => p.id === id)
}

export function batteryPresetsFor(
  chemistry: ChemistryId,
  family: 12 | 24 | 48,
): BatteryPreset[] {
  return BATTERY_PRESETS.filter(
    p => p.chemistry === chemistry && presetVoltageFamily(p) === family,
  )
}

const SUNGOLD_SG48100P_MANUAL =
  'https://cdn.shopify.com/s/files/1/0323/4090/2025/files/SG48100P_241122_42e6e869-4c34-41c0-b654-1e5c60a7ebda.pdf?v=1732775335'

export const BATTERY_PRESETS: BatteryPreset[] = [
  // Sun Gold Power SG48100P. Every figure below is from the manufacturer's
  // own "48V100Ah Lithium Battery" user manual, linked from
  // sungoldpower.com/pages/user-manual as "48V 100AH Server Rack LiFePO4
  // Lithium Battery SG48100P" and verified reachable. Spec table is §3
  // (document pages 3–4); BMS comms baud is §7.3 (page 12).
  //
  // The sheet never prints "16S". 51.2 V LiFePO4 is 16 × 3.2 V, and that is
  // the number the SPH menu needs (L16). Recording 15S would pick L15 and
  // charge a 16-cell pack as if it had 15.
  //
  // Recommended charge is 54.5 V, not the SPH L16 boost of 56.8 V. Those
  // two numbers are the disagreement the commissioning map has to show,
  // not a choice this row is allowed to make.
  //
  // "Support multiple protocols" is recorded as the ports and baud rates
  // the sheet actually states. The inverter's menu token SGP is an inverter
  // fact, not a battery-sheet fact, and does not belong here.
  {
    id: 'sungold-sg48100p',
    brand: 'Sun Gold Power',
    model: 'SG48100P',
    chemistry: 'lifepo4',
    voltage: 51.2,
    capacityAh: 100,
    capacityKwh: 5.12,
    seriesCount: 16,
    recommendedChargeV: 54.5,
    chargeLimitV: 57.6,
    fullChargeV: 56,
    fullChargeCutoffA: 5,
    dischargeCutoffV: 43.2,
    socMinPct: 20,
    socMaxPct: 95,
    cycleDodPct: 80,
    standardChargeA: 50,
    maxChargeA: 100,
    standardDischargeA: 50,
    maxDischargeA: 100,
    maxParallel: 63,
    comms: ['can', 'rs485', 'rs232'],
    canBaud: 500_000,
    rs485Baud: 9600,
    chargeMinC: 0,
    chargeMaxC: 45,
    dischargeMinC: -20,
    dischargeMaxC: 60,
    sourceUrl: SUNGOLD_SG48100P_MANUAL,
  },
]
