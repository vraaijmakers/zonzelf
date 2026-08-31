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
 * The Inverter step now exists, so there are two paths and the good one is
 * used whenever it is available:
 *
 *   - recommendedSystemVoltageForPower — the real answer. Continuous watts and
 *     a system voltage give a DC current directly, and the recommendation is
 *     simply the lowest standard voltage that keeps that current under a
 *     ceiling you can still buy cable and busbars for.
 *   - recommendedSystemVoltage — the fallback, kept because the battery step
 *     comes BEFORE the inverter step and has to say something sensible on its
 *     own. Bank size stands in for the inverter rating, on the basis that a
 *     bank and the load it serves are sized together. It is a proxy, and it is
 *     labelled as one everywhere it surfaces.
 *
 * The bands were previously asserted as bare kWh thresholds. They are now
 * DERIVED from the current ceiling, which is what they were always standing in
 * for: 1.5 kW at 12V, 3 kW at 24V and 6 kW at 48V are all roughly the same
 * DC current. Showing that is the difference between a rule and a magic number.
 *
 * Still a widely used rule of thumb, NOT a code requirement: no clause of NEC
 * or IEC 60364 sets the ceiling. In scope for the licensed electrician
 * sign-off.
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
 * DC amps the battery side carries to sustain a given continuous AC output.
 *
 * Power is volts times amps on both sides of an inverter, but the DC side runs
 * at a small fraction of the AC voltage, so it carries a large multiple of the
 * AC current. This is the whole reason system voltage is a decision at all.
 */
export function dcCurrentFor(
  continuousW: number,
  systemVoltage: number,
  inverterEfficiency = 0.85,
): number {
  const eff = Math.min(1, Math.max(0.1, inverterEfficiency))
  if (!(continuousW > 0) || !(systemVoltage > 0)) return 0
  return continuousW / (eff * systemVoltage)
}

/**
 * DC amps above which the main run stops being a cable you can comfortably
 * buy, bend and terminate. Not a code limit — 4/0 copper is rated well above
 * this — but the point where lug sizes, busbar cost and bend radius start
 * driving the design.
 */
export const DC_CURRENT_CEILING_A = 125

/**
 * The voltage to run at for a given continuous load. The real answer, used
 * whenever the inverter step has been completed.
 *
 * Derived rather than tabulated: the lowest standard voltage whose DC current
 * stays under the ceiling. That makes the recommendation explainable in one
 * sentence, and it moves correctly if the ceiling is ever revised.
 */
export function recommendedSystemVoltageForPower(
  continuousW: number,
  inverterEfficiency = 0.85,
): SystemVoltage {
  if (!(continuousW > 0)) return 12
  for (const v of SYSTEM_VOLTAGES) {
    if (dcCurrentFor(continuousW, v, inverterEfficiency) <= DC_CURRENT_CEILING_A) return v
  }
  return 48
}

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
  'for the inverter rating when the inverter step has not been done yet. A rule of thumb, ' +
  'not a code requirement.'

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

export function systemVoltageAdvice(
  bankKwh: number,
  chosen: number,
  /** Continuous AC watts from the inverter step. When present it wins. */
  continuousW?: number,
): VoltageAdvice {
  // The real figure whenever it exists — the proxy only ever stood in for it.
  if (continuousW !== undefined && continuousW > 0) {
    const recommended = recommendedSystemVoltageForPower(continuousW)
    const ampsAtChosen = Math.round(dcCurrentFor(continuousW, chosen))
    const ampsAtRec = Math.round(dcCurrentFor(continuousW, recommended))
    return {
      recommended,
      agrees: chosen === recommended,
      why:
        `${Math.round(continuousW)}W continuous draws about ${ampsAtChosen}A from a ` +
        `${chosen}V bank` +
        (chosen === recommended
          ? `, under the ${DC_CURRENT_CEILING_A}A the DC main run is kept below.`
          : ` and about ${ampsAtRec}A from a ${recommended}V one. Halving the current is ` +
            'what halves the cable.'),
    }
  }

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
