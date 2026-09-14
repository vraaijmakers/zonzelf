/**
 * The one efficiency model, shared by the load, battery and panel calculators.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The three calculators told three different stories about losses:
 *
 *   - The load calculator published `adjustedKwh = raw / 0.8` and told the user
 *     to carry that number into BOTH battery and panel sizing.
 *   - The battery calculator used `adjustedKwh` (reasonable), then divided by
 *     depth of discharge — and silently ignored the per-chemistry
 *     `battery.efficiency` field it had defined right there in the file.
 *   - The panel calculator took the RAW figure and applied its own 0.8, which
 *     avoided double-counting but meant "system efficiency" denoted something
 *     different on that page than on the other two.
 *
 * Because the stages feed each other, a disagreement here does not stay local —
 * it multiplies down the chain. This module is the single definition, and
 * src/lib/__tests__/system-efficiency.test.ts locks it so the three pages
 * cannot drift apart again.
 *
 * THE PHYSICAL CHAIN
 * ------------------
 * Off-grid, energy flows array → battery → inverter → appliance, and something
 * is lost at every hop. One number cannot describe all three, because they
 * apply at different points:
 *
 *   1. INVERTER + WIRING — DC in, AC out. Everything the battery delivers pays
 *      this. Typically 85–92% for a decent pure-sine inverter.
 *   2. BATTERY ROUND TRIP — energy out ÷ energy in. Per chemistry, and it is
 *      the field the battery calculator already defined and never applied:
 *      lithium ~97%, AGM/gel ~85%, flooded ~80%.
 *   3. ARRAY DERATE — real output ÷ (nameplate × peak sun hours). Soiling,
 *      cell temperature, MPPT conversion, cable loss. Typically 75–85%.
 *
 * A battery bank only pays (1). An array pays all three, because the energy it
 * generates has to survive storage before it reaches the load.
 *
 * WHAT THIS CHANGES
 * -----------------
 * The old panel sizing omitted battery round-trip entirely, so it UNDERSIZED
 * the array — for a lithium system by roughly 3%, for flooded lead-acid by
 * roughly 25%. Undersizing generation is the direction that leaves someone
 * short in December, so this correction matters.
 *
 * WHAT THIS DOES NOT MODEL
 * ------------------------
 * Charge-controller type (PWM is markedly worse than MPPT and is folded into
 * the array derate rather than modelled separately), temperature effects on
 * battery capacity, cable losses as a function of the actual run, and
 * generator or grid input. All of these are real; none is modelled here.
 */

export const DEFAULTS = {
  /** Inverter + wiring, DC → AC. */
  inverter: 0.85,
  /** Array derate: soiling, heat, MPPT, cabling. */
  array: 0.8,
  /** Used only when the chemistry is unknown — the AGM/gel midpoint from /guides/batteries. */
  batteryRoundTrip: 0.825,
} as const

export const BOUNDS = {
  inverter: { min: 0.6, max: 0.98 },
  array: { min: 0.5, max: 0.95 },
  batteryRoundTrip: { min: 0.5, max: 1 },
} as const

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export interface EfficiencyInputs {
  /** Appliance consumption at the socket, kWh/day. */
  rawKwh: number
  /** Inverter + wiring. */
  inverter?: number
  /** Battery round trip. Pass the chemistry's own figure when it is known. */
  batteryRoundTrip?: number
  /** Array derate. */
  array?: number
}

export interface EnergyChain {
  rawKwh: number
  inverter: number
  batteryRoundTrip: number
  array: number
  /**
   * What the battery has to DELIVER each day to run the load.
   * Battery bank sizing starts here — the bank does not pay array or
   * round-trip losses, only the inverter between it and the appliance.
   */
  fromBatteryKwh: number
  /**
   * What the array has to GENERATE each day.
   * Pays all three losses, because its energy is stored before it is used.
   */
  fromArrayKwh: number
}

/**
 * Resolve the whole chain once. Every calculator reads its figure from here
 * rather than doing its own arithmetic.
 */
export function energyChain(inputs: EfficiencyInputs): EnergyChain {
  const rawKwh = Math.max(0, Number.isFinite(inputs.rawKwh) ? inputs.rawKwh : 0)
  const inverter = clamp(inputs.inverter ?? DEFAULTS.inverter, BOUNDS.inverter.min, BOUNDS.inverter.max)
  const batteryRoundTrip = clamp(
    inputs.batteryRoundTrip ?? DEFAULTS.batteryRoundTrip,
    BOUNDS.batteryRoundTrip.min, BOUNDS.batteryRoundTrip.max,
  )
  const array = clamp(inputs.array ?? DEFAULTS.array, BOUNDS.array.min, BOUNDS.array.max)

  const fromBatteryKwh = rawKwh / inverter
  const fromArrayKwh = fromBatteryKwh / batteryRoundTrip / array

  return { rawKwh, inverter, batteryRoundTrip, array, fromBatteryKwh, fromArrayKwh }
}

/** Battery bank capacity, in kWh, for a given autonomy and depth of discharge. */
export function bankKwh(fromBatteryKwh: number, days: number, depthOfDischarge: number): number {
  const dod = clamp(depthOfDischarge, 0.1, 1)
  return (Math.max(0, fromBatteryKwh) * Math.max(0, days)) / dod
}

/** Array size, in watts, to generate fromArrayKwh in the available peak sun hours. */
export function arrayWatts(fromArrayKwh: number, peakSunHours: number): number {
  if (!(peakSunHours > 0)) return 0
  return (Math.max(0, fromArrayKwh) * 1000) / peakSunHours
}

/** How many panels of `panelWatt` cover `wattsNeeded`. Zero inputs → zero panels, never NaN. */
export function panelCount(wattsNeeded: number, panelWatt: number): number {
  if (!(panelWatt > 0) || !(wattsNeeded > 0)) return 0
  return Math.ceil(wattsNeeded / panelWatt)
}

/**
 * A band of panel counts, always low–high. The annual figure is not always
 * the small end — a "worst month" that is sunnier than the annual figure
 * sizes fewer panels, and printing "21–18" reads as a countdown.
 */
export function panelCountBand(a: number, b: number): { min: number; max: number } | null {
  const nums = [a, b].filter(n => n > 0)
  if (nums.length === 0) return null
  return { min: Math.min(...nums), max: Math.max(...nums) }
}

/**
 * Surplus of actual output over the target, as a percent. Null when the
 * target is zero or either side is not finite — the panel page used to
 * divide by dailyKwh and print "NaN%".
 */
export function surplusPercent(actual: number, target: number): number | null {
  if (!(target > 0) || !Number.isFinite(actual) || !Number.isFinite(target)) return null
  return ((actual - target) / target) * 100
}

/**
 * Human-readable statement of where the energy goes. Used on each page so the
 * copy cannot say something the maths does not do.
 */
export function describeChain(chain: EnergyChain): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`
  return (
    `Appliances draw ${chain.rawKwh.toFixed(2)} kWh. ` +
    `Through the inverter at ${pct(chain.inverter)}, the battery must deliver ` +
    `${chain.fromBatteryKwh.toFixed(2)} kWh. ` +
    `After battery round-trip at ${pct(chain.batteryRoundTrip)} and array losses at ` +
    `${pct(chain.array)}, the panels must generate ${chain.fromArrayKwh.toFixed(2)} kWh.`
  )
}
