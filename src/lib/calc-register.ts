/**
 * The capacity / protection split.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Risk is not uniform across the sizing chain. Getting daily kWh wrong means
 * an undersized system and a disappointing December. Getting conductor gauge
 * or a fuse rating wrong starts a fire. Treating all four calculators as one
 * undifferentiated liability problem made the derivation rule look like a
 * rewrite of everything; it is not. Protection is a handful of outputs.
 *
 * This module is the classification. Every calculator output is named here
 * and tagged as CAPACITY or PROTECTION. Capacity stays confident (it is the
 * product). Protection is rendered through ProtectionOutput, which cannot
 * take a single verdict as its headline: it takes the set of options that
 * pass, the arithmetic, and the cited source.
 *
 * Showing the derivation of a WRONG number documents the error rather than
 * excusing it, so the phase-0 correctness items are prerequisites, not
 * alternatives. This file does not compute anything; it names the surface.
 */

export type Register = 'capacity' | 'protection'

export type OutputId =
  | 'daily-kwh'
  | 'bank-kwh'
  | 'panel-count'
  | 'inverter-va'
  | 'conductor-gauge'
  | 'ocpd-rating'
  | 'cutoff-voltage'
  | 'string-voc'
  | 'string-current'
  | 'string-fuse'
  | 'mppt-window'
  | 'array-dc-power'
  | 'battery-type-menu'
  | 'bms-comms'
  | 'charge-voltage'
  | 'soc-stop'
  | 'equalize'
  | 'charge-current'
  | 'cutoff-ladder'

export interface OutputDef {
  id: OutputId
  register: Register
  label: string
  page:
    | '/calculators/load'
    | '/calculators/battery'
    | '/calculators/inverter'
    | '/calculators/panels'
    | '/calculators/strings'
    | '/calculators/awg'
    | '/calculators/system'
  shipped: boolean
  /** What being wrong actually costs. */
  risk: string
}

export const CALCULATOR_OUTPUTS: OutputDef[] = [
  {
    id: 'daily-kwh',
    register: 'capacity',
    label: 'Daily consumption',
    page: '/calculators/load',
    shipped: true,
    risk: 'Undersized system, not an injury.',
  },
  {
    id: 'bank-kwh',
    register: 'capacity',
    label: 'Battery bank size',
    page: '/calculators/battery',
    shipped: true,
    risk: 'Undersized system, not an injury.',
  },
  {
    id: 'panel-count',
    register: 'capacity',
    label: 'Panel array size',
    page: '/calculators/panels',
    shipped: true,
    risk: 'Undersized system, not an injury.',
  },
  {
    id: 'inverter-va',
    register: 'capacity',
    label: 'Inverter continuous / surge rating',
    page: '/calculators/inverter',
    shipped: true,
    risk: 'Inverter shuts down on motor start. Capacity, not fire.',
  },
  {
    id: 'conductor-gauge',
    register: 'protection',
    label: 'Conductor gauge',
    page: '/calculators/awg',
    shipped: true,
    risk: 'Undersized cable is how DIY solar starts fires.',
  },
  {
    id: 'ocpd-rating',
    register: 'protection',
    label: 'Fuse or breaker rating',
    page: '/calculators/awg',
    shipped: true,
    risk: 'A correctly sized cable behind an oversized breaker is still a fire.',
  },
  {
    id: 'cutoff-voltage',
    register: 'protection',
    label: 'Battery cutoff',
    page: '/calculators/battery',
    shipped: true,
    risk: 'A wrong cutoff flattens the bank or, on lithium, is not a voltage at all.',
  },
  {
    id: 'string-voc',
    register: 'protection',
    label: 'String voltage vs the maximum PV input',
    page: '/calculators/strings',
    shipped: true,
    risk: 'A string sized in July can exceed the controller maximum in January.',
  },
  {
    id: 'string-current',
    register: 'protection',
    label: 'Array current vs the tracker input rating',
    page: '/calculators/strings',
    shipped: true,
    risk: 'Too many strings in parallel pushes current past what the input can take.',
  },
  {
    id: 'string-fuse',
    register: 'protection',
    label: 'Parallel string fusing',
    page: '/calculators/strings',
    shipped: true,
    risk: 'Three or more strings back-feed a fault past what a module can survive.',
  },
  {
    // Capacity, not protection, and the distinction is the teaching point: a
    // string below the tracking window harvests nothing, but nothing is
    // damaged. Too much voltage destroys the unit; too little wastes sunshine.
    id: 'mppt-window',
    register: 'capacity',
    label: 'String voltage inside the MPPT window',
    page: '/calculators/strings',
    shipped: true,
    risk: 'A string that sags below the window stops harvesting on hot afternoons.',
  },
  {
    id: 'array-dc-power',
    register: 'capacity',
    label: 'Array watts vs the inverter PV input',
    page: '/calculators/strings',
    shipped: true,
    risk: 'Past the PV input rating the extra array is clipped, not harvested.',
  },
  {
    id: 'battery-type-menu',
    register: 'protection',
    label: 'Inverter battery-type setting',
    page: '/calculators/system',
    shipped: true,
    risk: 'The SPH ships as gel. Leave that on a lithium pack and you charge it on a lead-acid profile.',
  },
  {
    id: 'bms-comms',
    register: 'protection',
    label: 'BMS communication',
    page: '/calculators/system',
    shipped: true,
    risk: 'Without a live BMS the percent-remaining cutoffs do nothing, and voltage on lithium is already near empty.',
  },
  {
    id: 'charge-voltage',
    register: 'protection',
    label: 'Charge voltage',
    page: '/calculators/system',
    shipped: true,
    risk: 'Too high trips the BMS or cooks the pack; flattening two disagreeing sheets into one number is how that happens.',
  },
  {
    id: 'soc-stop',
    register: 'protection',
    label: 'Percent-remaining stop',
    page: '/calculators/system',
    shipped: true,
    risk: 'A voltage cutoff on LiFePO4 is not 20% left. Percent remaining only works after the BMS is talking.',
  },
  {
    id: 'equalize',
    register: 'protection',
    label: 'Equalizing charge',
    page: '/calculators/system',
    shipped: true,
    risk: 'Equalize is a high-voltage stage for flooded lead-acid. On lithium it is abuse.',
  },
  {
    id: 'charge-current',
    register: 'protection',
    label: 'Charge current ceilings',
    page: '/calculators/system',
    shipped: true,
    risk: 'A 3 kW generator cannot feed a 100 A charge setting and the house. The ceiling is the lowest of four limits, not the inverter maximum.',
  },
  {
    id: 'cutoff-ladder',
    register: 'protection',
    label: 'Open-loop voltage ladder',
    page: '/calculators/system',
    shipped: true,
    risk: 'Items 15/12/14/35/09 out of ascending order are accepted by the LCD and behave undocumented.',
  },
]

export function outputDef(id: OutputId): OutputDef {
  const found = CALCULATOR_OUTPUTS.find(o => o.id === id)
  if (!found) throw new Error(`unknown calculator output: ${id}`)
  return found
}

export function shippedProtection(): OutputDef[] {
  return CALCULATOR_OUTPUTS.filter(o => o.register === 'protection' && o.shipped)
}

export function shippedCapacity(): OutputDef[] {
  return CALCULATOR_OUTPUTS.filter(o => o.register === 'capacity' && o.shipped)
}

/**
 * What a protection output is allowed to look like. A set of options that
 * pass, the arithmetic that produced them, and the cited source. Never a
 * single "recommended" field.
 */
export interface ProtectionView {
  id: Extract<
    OutputId,
    | 'conductor-gauge' | 'ocpd-rating' | 'cutoff-voltage'
    | 'string-voc' | 'string-current' | 'string-fuse'
    | 'battery-type-menu' | 'bms-comms' | 'charge-voltage'
    | 'soc-stop' | 'equalize' | 'charge-current' | 'cutoff-ladder'
  >
  title: string
  /** The options that pass. A set of one is still a set, not a verdict. */
  options: string[]
  /** When nothing passes. Null if options is non-empty. */
  empty: string | null
  steps: { title: string; body: string }[]
  sources: string[]
}

/** Guards the contract tests lock. Throws if a view would be a bare verdict. */
export function assertProtectionView(view: ProtectionView): void {
  if (view.options.length > 0 && view.empty !== null) {
    throw new Error(`${view.id}: a passing set cannot also carry an empty message`)
  }
  if (view.options.length === 0 && !view.empty) {
    throw new Error(`${view.id}: when nothing passes, say so`)
  }
  if (view.sources.length === 0) {
    throw new Error(`${view.id}: a protection output must cite its source`)
  }
  if (view.options.length > 0 && view.steps.length === 0) {
    throw new Error(`${view.id}: show the arithmetic for the options that pass`)
  }
  const joined = `${view.title} ${view.options.join(' ')}`.toLowerCase()
  if (/\brecommended\b/.test(joined)) {
    throw new Error(`${view.id}: "recommended" is the chart, not the book`)
  }
}
