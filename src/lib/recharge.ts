/**
 * Can the array refill the bank in the available sun?
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The battery calculator sizes storage (kWh) and the panel calculator sizes
 * generation (kWh/day) independently. A user can take both "correct" answers
 * and still under-charge every day: the array never puts back what the load
 * took out. That is the first cross-stage check in the sizing chain, pulled
 * forward from phase 2 by the 2026-08-21 production audit.
 *
 * This is a daily energy balance, not a charge-current question. A three-day
 * bank is meant to be drawn down over three sunless days and refilled over
 * subsequent days that do have sun. Daily generation should cover daily use;
 * the bank is the buffer, not a bucket the array has to fill from empty
 * every morning.
 *
 * THE COMPARISON
 * --------------
 *   generated  = installedWatts × peakSunHours × arrayDerate / 1000
 *                (DC kWh/day after soiling, heat, MPPT, cabling)
 *   intoBattery = fromBatteryKwh / roundTrip
 *                (energy that must go INTO the bank to replace what it
 *                handed the inverter)
 *
 * The loop closes when generated >= intoBattery. Equivalent: after round
 * trip, the array can hand the inverter at least fromBatteryKwh.
 *
 * WHAT THIS DOES NOT MODEL
 * ------------------------
 * Charge-controller current limits, temperature derate on the battery's
 * ability to accept charge, and the hours-of-daylight vs peak-sun-hours
 * distinction (peak sun hours already compresses the day). All of those
 * make recharge HARDER, so a pass here is necessary, not sufficient.
 */

import { BOUNDS, DEFAULTS } from './system-efficiency'

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export interface RechargeInputs {
  /** Installed array nameplate watts. */
  arrayWatts: number
  peakSunHours: number
  arrayDerate: number
  /** Energy the battery must deliver per day (after inverter). */
  fromBatteryKwh: number
  batteryRoundTrip: number
}

export interface RechargeResult {
  /** DC energy after array derate, kWh/day. */
  generatedKwh: number
  /** Energy that must go into the battery to replace the day's draw. */
  intoBatteryKwh: number
  /** generated × roundTrip — what the bank can actually hand back. */
  deliveredKwh: number
  /** True when generated covers intoBattery (within a tiny float epsilon). */
  closes: boolean
  /** How many kWh/day the array is short of closing the loop. Zero if it closes. */
  shortfallKwh: number
  /** generated / intoBattery. 1 means exact; below 1 is a shortfall. */
  ratio: number
}

export function rechargeCheck(inputs: RechargeInputs): RechargeResult {
  const watts = Math.max(0, Number.isFinite(inputs.arrayWatts) ? inputs.arrayWatts : 0)
  const psh = Math.max(0, Number.isFinite(inputs.peakSunHours) ? inputs.peakSunHours : 0)
  const derate = clamp(inputs.arrayDerate, BOUNDS.array.min, BOUNDS.array.max)
  const fromBattery = Math.max(0, Number.isFinite(inputs.fromBatteryKwh) ? inputs.fromBatteryKwh : 0)
  const roundTrip = clamp(
    inputs.batteryRoundTrip,
    BOUNDS.batteryRoundTrip.min,
    BOUNDS.batteryRoundTrip.max,
  )

  const generatedKwh = (watts * psh * derate) / 1000
  const intoBatteryKwh = fromBattery / roundTrip
  const deliveredKwh = generatedKwh * roundTrip
  // Vacuous: no load to refill. A zero-sun or zero-array case with a real
  // load does NOT close — that is the whole point of the check.
  const closes = intoBatteryKwh === 0
    ? true
    : generatedKwh + 1e-9 >= intoBatteryKwh
  const shortfallKwh = Math.max(0, intoBatteryKwh - generatedKwh)
  const ratio = intoBatteryKwh > 0
    ? generatedKwh / intoBatteryKwh
    : 1

  return { generatedKwh, intoBatteryKwh, deliveredKwh, closes, shortfallKwh, ratio }
}

export const RECHARGE_DEFAULTS = {
  arrayDerate: DEFAULTS.array,
  batteryRoundTrip: DEFAULTS.batteryRoundTrip,
} as const
