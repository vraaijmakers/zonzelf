/**
 * Daily energy for an appliance, accounting for duty cycle.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The load calculator multiplied nameplate watts by hours in service, so a
 * full-size fridge came out at 150 W × 24 h = 3.6 kWh/day and a mini fridge at
 * 80 W × 24 h = 1.92 kWh/day. Both are roughly double reality, because a
 * fridge's compressor is not running most of the time — it cycles against a
 * thermostat.
 *
 * That error does not stay local. Daily kWh feeds battery sizing, which feeds
 * array sizing, which feeds the current the conductors are sized for, so one
 * bad row inflates the whole build. It was the "×2 fridge error" identified in
 * the sizing-chain design.
 *
 * THE MODEL
 * ---------
 *   daily Wh = runningWatts × hoursInService × dutyCycle × quantity
 *
 * - `runningWatts` is draw while actually operating. Kept separate from the
 *   average because inverter sizing needs the running figure, not the average.
 * - `hoursInService` is how long per day the appliance is available to run —
 *   24 for a fridge that is always plugged in.
 * - `dutyCycle` is the fraction of those hours it actually draws power. 1 for
 *   anything that runs continuously while on (a light, a laptop).
 *
 * SOURCES FOR THE REFRIGERATION FIGURES
 * -------------------------------------
 * Two independent sources agree that a typical kitchen refrigerator in a ~70 °F
 * room runs its compressor roughly a third of the time (33–40%, i.e. 8–10 hours
 * in 24), giving 1–2 kWh/day for a modern full-size unit — consistent with
 * ENERGY STAR certified models averaging ~1.35 kWh/day (493 kWh/year).
 *
 * Duty cycle is NOT a constant: the same fridge in a garage above 90 °F can run
 * 50–70% of the time, and a chest freezer or an ageing unit differs again. The
 * presets describe a temperate indoor kitchen, and the UI says so.
 *
 * WHAT IS DELIBERATELY LEFT AT 100%
 * ---------------------------------
 * Air conditioning is also thermostatic and also cycles, but no two-source
 * figure for its duty cycle was established, and inventing one would repeat the
 * mistake this file exists to fix. A/C presets stay at 100% — an overestimate,
 * which oversizes rather than undersizes — and are flagged as cycling loads so
 * the user can set a figure they trust.
 */

/** Fraction of the in-service hours during which the appliance actually draws power. */
export type DutyCycle = number

/**
 * When an appliance runs, and whether bad weather suppresses it.
 *
 * The battery scenarios previously applied one flat "share used after dark" to
 * the whole load, which treats a fridge, an air conditioner and a television as
 * if they ran at the same times. For a cooling-dominated system that is badly
 * wrong in two directions at once, and both were spotted in use:
 *
 *   - Air conditioning barely runs overnight, so a flat share overstates the
 *     bank needed to get through a night.
 *   - A sunless day is a sunless day BECAUSE it is overcast, which means it is
 *     cooler, which means the cooling load collapses. The shortage and the load
 *     are anti-correlated. Multiplying a full summer day by three sunless days
 *     can overstate the bank by more than a factor of two.
 *
 * One field per appliance fixes both.
 */
export type LoadProfile = 'always' | 'daytime' | 'evening'

export const LOAD_PROFILES: Record<LoadProfile, {
  label: string
  hint: string
  /**
   * Share of this appliance's daily energy that falls in the dark hours.
   * `always` is proportional to the length of the night and is computed;
   * the other two are definitional rather than measured — an "evening" load is
   * one that happens in the evening.
   */
  overnightShare: number | 'proportional'
  /** Whether an overcast day suppresses it. Only daytime loads are weather-driven. */
  weatherDriven: boolean
}> = {
  always: {
    label: 'All day',
    hint: 'Runs around the clock regardless of weather — fridge, freezer, router.',
    overnightShare: 'proportional',
    weatherDriven: false,
  },
  daytime: {
    label: 'Daytime',
    hint: 'Driven by daylight or heat — air conditioning, power tools. Barely runs at night, and much less when it is overcast.',
    overnightShare: 0.05,
    weatherDriven: true,
  },
  evening: {
    label: 'Evening',
    hint: 'Concentrated after dark — lighting, television, cooking. Rain does not change it.',
    overnightShare: 0.9,
    weatherDriven: false,
  },
}

/** Rows saved before profiles existed have none; treat them as running all day. */
export const DEFAULT_PROFILE: LoadProfile = 'always'

export interface ApplianceRow {
  watts: number
  hours: number
  qty: number
  /** Optional: rows saved before duty cycles existed have no value and mean 100%. */
  duty?: DutyCycle
  /** Optional: rows saved before profiles existed have none and count as 'always'. */
  profile?: LoadProfile
}

/** Clamp to a sane fraction. Absent means 100% — never silently reduce a saved row. */
export function normalizeDuty(duty: number | undefined): DutyCycle {
  if (duty === undefined || Number.isNaN(duty)) return 1
  return Math.min(1, Math.max(0, duty))
}

/** Watt-hours per day for one row, duty cycle applied. */
export function rowDailyWh(row: ApplianceRow): number {
  const watts = Math.max(0, row.watts || 0)
  const hours = Math.min(24, Math.max(0, row.hours || 0))
  const qty = Math.max(0, row.qty || 0)
  return watts * hours * normalizeDuty(row.duty) * qty
}

/** Average draw across the in-service hours — what the row contributes continuously. */
export function averageWatts(row: ApplianceRow): number {
  return Math.max(0, row.watts || 0) * normalizeDuty(row.duty)
}

export function totalDailyKwh(rows: ApplianceRow[]): number {
  return rows.reduce((sum, row) => sum + rowDailyWh(row), 0) / 1000
}

export interface Preset {
  name: string
  /** When it runs. Absent means 'always'. */
  profile?: LoadProfile
  /** Draw while running, not the daily average. */
  watts: number
  hours: number
  duty?: DutyCycle
  /** Thermostatic or otherwise intermittent — the UI explains the duty figure. */
  cycles?: boolean
  /** Shown when the preset carries a duty cycle the user did not choose. */
  note?: string
}

const FRIDGE_NOTE =
  'Compressor cycles against a thermostat — it runs roughly a third of the time in a ' +
  'temperate kitchen. In a garage or an unheated room above 30 °C, expect 50–70% instead.'

export const PRESET_GROUPS: { label: string; icon?: string; items: Preset[] }[] = [
  {
    label: 'Lighting & fans',
    items: [
      { name: 'LED light bulb', profile: 'evening',   watts: 10, hours: 5 },
      { name: 'LED tube light', profile: 'evening',   watts: 20, hours: 6 },
      { name: 'Ceiling fan',      watts: 60, hours: 8 },
      { name: 'Bathroom exhaust', watts: 30, hours: 2 },
    ],
  },
  {
    label: 'Cooling (A/C)',
    icon: 'ac',
    items: [
      // Left at 100% deliberately — see the file header. Overestimates.
      { name: 'Window AC (5,000 BTU)', profile: 'daytime',    watts: 450,  hours: 8,  cycles: true },
      { name: 'Window AC (8,000 BTU)', profile: 'daytime',    watts: 700,  hours: 8,  cycles: true },
      { name: 'Window AC (12,000 BTU)', profile: 'daytime',   watts: 1100, hours: 8,  cycles: true },
      { name: 'Portable AC (10,000 BTU)', profile: 'daytime', watts: 1000, hours: 8,  cycles: true },
      { name: 'Mini-split (9,000 BTU)', profile: 'daytime',   watts: 860,  hours: 10, cycles: true },
      { name: 'Mini-split (12,000 BTU)', profile: 'daytime',  watts: 1100, hours: 10, cycles: true },
      { name: 'Mini-split (18,000 BTU)', profile: 'daytime',  watts: 1600, hours: 10, cycles: true },
      { name: 'Mini-split (24,000 BTU)', profile: 'daytime',  watts: 2100, hours: 10, cycles: true },
      { name: 'Central AC (2 ton)', profile: 'daytime',       watts: 2500, hours: 8,  cycles: true },
      { name: 'Central AC (3 ton)', profile: 'daytime',       watts: 3500, hours: 8,  cycles: true },
      { name: 'Central AC (4 ton)', profile: 'daytime',       watts: 4700, hours: 8,  cycles: true },
      { name: 'Central AC (5 ton)', profile: 'daytime',       watts: 6000, hours: 8,  cycles: true },
      { name: 'Central AC (6 ton)', profile: 'daytime',       watts: 7200, hours: 8,  cycles: true },
      { name: 'Central AC (7.5 ton)', profile: 'daytime',     watts: 9000, hours: 8,  cycles: true },
    ],
  },
  {
    label: 'Kitchen',
    items: [
      { name: 'Mini fridge',       watts: 80,   hours: 24,   duty: 0.30, cycles: true, note: FRIDGE_NOTE },
      { name: 'Full-size fridge',  watts: 150,  hours: 24,   duty: 0.35, cycles: true, note: FRIDGE_NOTE },
      { name: 'Chest freezer',     watts: 120,  hours: 24,   duty: 0.35, cycles: true, note: FRIDGE_NOTE },
      { name: 'Microwave', profile: 'evening',         watts: 1000, hours: 0.5 },
      { name: 'Coffee maker', profile: 'evening',      watts: 900,  hours: 0.25 },
      { name: 'Toaster', profile: 'evening',           watts: 850,  hours: 0.1 },
      { name: 'Induction cooktop', profile: 'evening', watts: 1800, hours: 1 },
    ],
  },
  {
    label: 'Entertainment & office',
    items: [
      { name: 'TV (32")', profile: 'evening',      watts: 40,  hours: 4 },
      { name: 'TV (55")', profile: 'evening',      watts: 100, hours: 4 },
      { name: 'Laptop',        watts: 65,  hours: 6 },
      { name: 'Desktop PC',    watts: 200, hours: 4 },
      { name: 'Phone charger', watts: 10,  hours: 2 },
      { name: 'Router / modem', watts: 15, hours: 24 },
    ],
  },
  {
    label: 'Water & utility',
    items: [
      { name: 'Water pump (small)', profile: 'daytime',  watts: 300,  hours: 1 },
      { name: 'Water pump (1 HP)', profile: 'daytime',   watts: 750,  hours: 2 },
      { name: 'Washing machine', profile: 'evening',     watts: 500,  hours: 1 },
      { name: 'Clothes dryer', profile: 'evening',       watts: 5000, hours: 0.75 },
      { name: 'Dishwasher', profile: 'evening',          watts: 1200, hours: 1 },
      { name: 'Water heater (elec)', watts: 4000, hours: 1 },
    ],
  },
  {
    label: 'Other',
    items: [
      { name: 'CPAP machine',       watts: 30,   hours: 8 },
      { name: 'Power tool (drill)', profile: 'daytime', watts: 600,  hours: 0.5 },
      { name: 'EV charger (L1)',    watts: 1400, hours: 6 },
      { name: 'EV charger (L2)',    watts: 7200, hours: 2 },
    ],
  },
]

export const ALL_PRESETS: Preset[] = PRESET_GROUPS.flatMap(g => g.items)

export const DUTY_CYCLE_SOURCE =
  'Refrigeration duty cycles describe a temperate indoor kitchen (~21 °C): compressor running ' +
  'roughly a third of the time, giving 1–2 kWh/day for a modern full-size unit. Warmer rooms ' +
  'run longer. Air-conditioning presets assume continuous running, which overestimates.'

/**
 * The duty cycle a preset of this name carries, if it is a cycling load.
 *
 * Rows saved before duty cycles existed have no value and are treated as 100%,
 * so nobody's stored numbers move underneath them. That is the right default,
 * but on its own it means the correction never reaches anyone who had already
 * used the calculator — their fridge stays at the nameplate figure forever.
 * The UI uses this to offer the corrected value rather than impose it.
 */
export function suggestedDuty(name: string): number | undefined {
  const preset = ALL_PRESETS.find(p => p.name.toLowerCase() === name.trim().toLowerCase())
  if (!preset || preset.duty === undefined || preset.duty >= 1) return undefined
  return preset.duty
}


export interface LoadBreakdown {
  /** kWh/day per profile. */
  always: number
  daytime: number
  evening: number
  total: number
}

/** Daily energy split by when it is used, so the scenarios can vary the load. */
export function breakdownByProfile(rows: ApplianceRow[]): LoadBreakdown {
  const out: LoadBreakdown = { always: 0, daytime: 0, evening: 0, total: 0 }
  for (const row of rows) {
    const kwh = rowDailyWh(row) / 1000
    out[row.profile ?? DEFAULT_PROFILE] += kwh
    out.total += kwh
  }
  return out
}

/**
 * Share of the day's energy that falls after dark, derived from the profiles
 * rather than assumed. `always` loads are split in proportion to the length of
 * the night; evening and daytime loads use their definitional shares.
 */
export function overnightShareFrom(breakdown: LoadBreakdown, darkHours: number): number {
  if (breakdown.total <= 0) return 0
  const nightFraction = Math.min(24, Math.max(0, darkHours)) / 24
  const overnightKwh =
    breakdown.always * nightFraction +
    breakdown.evening * (LOAD_PROFILES.evening.overnightShare as number) +
    breakdown.daytime * (LOAD_PROFILES.daytime.overnightShare as number)
  return Math.min(1, Math.max(0, overnightKwh / breakdown.total))
}

/** Fraction of the daily load that an overcast day suppresses. */
export function weatherDrivenShare(breakdown: LoadBreakdown): number {
  if (breakdown.total <= 0) return 0
  return breakdown.daytime / breakdown.total
}
