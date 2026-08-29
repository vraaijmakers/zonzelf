/**
 * Which DC system voltage a bank of a given size should run at.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The battery page carried one static sentence — "48V is recommended for
 * systems above 2 kWh" — directly under a field labelled "Daily energy
 * consumption (kWh)". Two things were wrong with it.
 *
 * It never named which quantity the 2 kWh measured, so it read against the
 * daily consumption immediately above it. And it was advice the page then
 * contradicted: the picker defaulted to a hardcoded 24V whatever the numbers
 * said, so a 27.8 kWh/day load was told to use 48V and handed 24V. Advice a
 * calculator does not follow is worse than no advice, because it teaches the
 * reader that the guidance on the page is decorative.
 *
 * THE MECHANISM
 * -------------
 * Power is volts times amps, so for a given draw, doubling the system voltage
 * halves the current. Current is what sizes conductors, fuses, breakers and
 * busbars, and what sets voltage drop and I²R loss in the DC main run. A large
 * bank at 12V needs cable that is thick, expensive and awkward to terminate —
 * that is why big systems move up, not because 12V stops working.
 *
 * WHAT THIS IS KEYED TO, AND WHAT IT IS NOT
 * -----------------------------------------
 * The quantity that actually decides system voltage is CONTINUOUS POWER, not
 * energy. 27 kWh/day drawn evenly across 24 hours is about 1.2 kW; the same
 * energy drawn across three hours is about 9 kW. Those are different decisions
 * and energy alone cannot tell them apart.
 *
 * This calculator does not know the inverter rating — that is the Inverter
 * step, which is not built yet. So bank size stands in for it, on the basis
 * that a bank and the load it serves are sized together. That is a proxy, and
 * it is labelled as one everywhere it surfaces.
 *
 * These bands are a widely used rule of thumb, NOT a code requirement: no
 * clause of NEC or IEC 60364 sets them. They are in scope for the licensed
 * electrician sign-off, and the Inverter step should replace the proxy with a
 * real continuous-power figure when it lands.
 */

export const SYSTEM_VOLTAGES = [12, 24, 48] as const
export type SystemVoltage = (typeof SYSTEM_VOLTAGES)[number]

/**
 * Bank size, in kWh, at or above which the next voltage up becomes the
 * sensible floor. Named rather than inlined so the thresholds are reviewable
 * in one place when the electrician sign-off reaches them.
 */
export const VOLTAGE_STEP_KWH = { to24: 2, to48: 6 } as const

/**
 * The voltage a bank of this size should run at. Monotonic in bankKwh: a
 * bigger bank never recommends a lower voltage.
 */
export function recommendedSystemVoltage(bankKwh: number): SystemVoltage {
  // `!(x > 0)` rather than `!Number.isFinite(x)`: NaN and non-positive values
  // fall to the 12V floor, but an infinite bank must still flow through to 48V.
  // Excluding Infinity here would recommend the LOWEST voltage for the LARGEST
  // bank, which inverts the whole point of the function.
  if (!(bankKwh > 0)) return 12
  if (bankKwh >= VOLTAGE_STEP_KWH.to48) return 48
  if (bankKwh >= VOLTAGE_STEP_KWH.to24) return 24
  return 12
}

export const SYSTEM_VOLTAGE_SOURCE =
  `Keyed to bank size, not to daily consumption: under ${VOLTAGE_STEP_KWH.to24} kWh a bank ` +
  `is usually 12V, from ${VOLTAGE_STEP_KWH.to24} to ${VOLTAGE_STEP_KWH.to48} kWh 24V, and ` +
  `above ${VOLTAGE_STEP_KWH.to48} kWh 48V. What actually decides this is continuous power, ` +
  'because voltage sets current and current sizes the cable — the same daily energy drawn ' +
  'over three hours instead of twenty-four is several times the current. Bank size stands in ' +
  'for the inverter rating until the Inverter step exists. A rule of thumb, not a code ' +
  'requirement.'

export interface VoltageAdvice {
  /** What the bank size points at. */
  recommended: SystemVoltage
  /** Whether the current selection already matches it. */
  agrees: boolean
  /**
   * Why, in one line, phrased against the bank the user is actually looking at.
   * Present whether or not the selection agrees — the reasoning is the point,
   * not the verdict.
   */
  why: string
}

export function systemVoltageAdvice(bankKwh: number, chosen: number): VoltageAdvice {
  const recommended = recommendedSystemVoltage(bankKwh)
  const rounded = Math.round(bankKwh * 10) / 10
  return {
    recommended,
    agrees: chosen === recommended,
    // "At N kWh" rather than "A/An N kWh bank": the article depends on how the
    // number is spoken (an 8.8, a 9), which is not worth a rule.
    why:
      recommended === 12
        ? `At ${rounded} kWh, the bank is small enough that 12V keeps the current manageable.`
        : `At ${rounded} kWh, the bank draws enough current that ${recommended}V keeps the DC ` +
          'main run to a cable you can actually buy and terminate.',
  }
}
