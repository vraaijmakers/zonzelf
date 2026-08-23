/**
 * Battery bank sizing as a band of scenarios rather than a single number.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The battery calculator printed one figure — "40.0 kWh" — for whatever
 * autonomy was selected. Two problems with that.
 *
 * First, invented precision: the inputs behind it are duty-cycle estimates and
 * an efficiency assumption, so a single decimal implies a confidence nobody
 * has. Second, and worse, "1 day of autonomy" reads like "survive the night"
 * and does not mean it. One day of autonomy is a full 24 hours with ZERO solar
 * input. A normal sunny night needs far less, because the panels start
 * refilling at sunrise. The tool answered only the pessimistic question while
 * labelling it ambiguously.
 *
 * The gap is not academic. At ~32 kWh/day the honest band runs from roughly
 * 16 kWh (an ordinary night) to 120 kWh (three sunless days) — a 6x swing in
 * what someone would buy. Presenting the middle of that as the answer hides
 * the decision the user is actually trying to make.
 *
 * THE OVERNIGHT ASSUMPTION
 * ------------------------
 * Overnight energy cannot be derived from what the load calculator records: it
 * knows hours per day per appliance, never what time of day they run. So the
 * share is an explicit, user-adjustable input rather than something inferred.
 * The default is proportional to the dark hours — what you would get if
 * consumption were spread evenly around the clock — and the UI says plainly
 * that it is an assumption. Households that cook and watch television after
 * dark will be above it; households whose big loads are daytime tools or
 * air-conditioning will be below.
 *
 * Dark hours vary by latitude and season far more than people expect: in the
 * Netherlands it is roughly 8 hours in June and 16 in December. Sizing a bank
 * on a summer night and then meeting December is a common way to be
 * disappointed.
 */

export type ScenarioId = 'overnight' | 'oneDay' | 'extended'

export interface Scenario {
  id: ScenarioId
  label: string
  /** What this scenario actually assumes, in plain terms. */
  meaning: string
  /** Energy the bank must deliver, kWh. */
  energyKwh: number
  /** Bank capacity once depth of discharge is accounted for, kWh. */
  bankKwh: number
  /** The same capacity in amp-hours at the system voltage. */
  bankAh: number
}

export interface ScenarioInputs {
  /** What the bank must deliver over a full day, after inverter losses. */
  dailyDeliveredKwh: number
  /** Fraction of daily consumption that happens after dark (0-1). */
  overnightShare: number
  /** Days of autonomy for the extended scenario. */
  autonomyDays: number
  /** Usable fraction of nameplate capacity for the chemistry. */
  depthOfDischarge: number
  /** Nominal system voltage, for the amp-hour figure. */
  systemVoltage: number
}

const clamp = (v: number, lo: number, hi: number) =>
  Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo

/**
 * Default overnight share for a given number of dark hours: the proportion you
 * would get if consumption were spread evenly around the clock. A starting
 * point to adjust, not a measurement.
 */
export function defaultOvernightShare(darkHours: number): number {
  return clamp(darkHours, 0, 24) / 24
}

export function buildScenarios(inputs: ScenarioInputs): Scenario[] {
  const daily = Math.max(0, Number.isFinite(inputs.dailyDeliveredKwh) ? inputs.dailyDeliveredKwh : 0)
  const share = clamp(inputs.overnightShare, 0, 1)
  const days = Math.max(1, Number.isFinite(inputs.autonomyDays) ? inputs.autonomyDays : 1)
  const dod = clamp(inputs.depthOfDischarge, 0.1, 1)
  const volts = inputs.systemVoltage > 0 ? inputs.systemVoltage : 48

  const make = (id: ScenarioId, label: string, meaning: string, energyKwh: number): Scenario => {
    const bankKwh = energyKwh / dod
    return { id, label, meaning, energyKwh, bankKwh, bankAh: (bankKwh * 1000) / volts }
  }

  return [
    make('overnight', 'Through the night',
      'An ordinary night with sun tomorrow. The bank covers only what you use after dark; the panels refill it in the morning.',
      daily * share),
    make('oneDay', 'One sunless day',
      'A full 24 hours with effectively no solar input — heavy overcast, or snow sitting on the array.',
      daily),
    make('extended', `${days} sunless day${days === 1 ? '' : 's'}`,
      `A run of ${days} day${days === 1 ? '' : 's'} with no meaningful generation. This is usually what sets the bank you actually buy.`,
      daily * days),
  ]
}

/** The band as a smallest/largest pair. */
export function scenarioRange(scenarios: Scenario[]): { min: number; max: number } {
  const banks = scenarios.map(s => s.bankKwh)
  return { min: Math.min(...banks), max: Math.max(...banks) }
}

/**
 * Round to a precision the inputs justify. A bank derived from duty-cycle
 * estimates and an efficiency assumption does not deserve two decimal places.
 */
export function roundBank(kwh: number): number {
  if (!(kwh > 0)) return 0
  if (kwh < 10) return Math.round(kwh * 2) / 2
  if (kwh < 100) return Math.round(kwh)
  return Math.round(kwh / 5) * 5
}
