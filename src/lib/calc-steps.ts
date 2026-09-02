/**
 * The sizing chain, as one ordered list.
 *
 * Before this existed each calculator hand-rolled its own "Next step" block in
 * a sidebar — load and battery had one, panels and awg had none, so the flow
 * silently dead-ended twice and nothing anywhere told you how many steps there
 * were. The order lives here so every page agrees.
 *
 * Steps with `href: null` have no page yet. They are still listed, and the UI
 * says so: a beginner who thinks cable gauge is the finish line will build a
 * system with no inverter sizing and no MPPT string check. Naming the gap is
 * differentiator #1 — the honest version of "you are not done yet". Give a
 * step its href in the same PR that ships its page and it lights up.
 *
 * WHY THE INVERTER COMES BEFORE THE PANELS
 * ----------------------------------------
 * It used to be step 4, after panels. That order cannot work, and the panel
 * calculator was dangerous because of it: it emitted a panel count and had no
 * way to say how to wire them, because how to wire them is decided entirely by
 * the tracker they connect to. Series count is bounded by the unit's maximum
 * PV input voltage; parallel count by its maximum input current; total array
 * watts by its maximum PV power; and the sensible panel WATTAGE falls out of
 * all three. Sizing an array before choosing the unit means designing against
 * limits you have not read yet.
 *
 * So the unit is picked at step 3, and steps 4 and 5 design the array into it.
 * Energy sizing (how many watts of panel the load needs) is genuinely
 * independent and stays at step 4; step 5 is the arrangement.
 */
export type StepId =
  | 'load' | 'battery' | 'inverter' | 'panels' | 'array' | 'protection' | 'system'

export interface CalcStep {
  id: StepId
  /** 1-based position — what "Step 2 of 7" counts. */
  n: number
  /** Full name. The desktop rail and the all-steps sheet have room for it. */
  label: string
  /** Short name, for the action bar where a button holds it at 14px. */
  short: string
  /** null until the step has a page. */
  href: string | null
  /** One line on what the step is for, in the all-steps sheet. */
  blurb: string
}

export const CALC_STEPS: readonly CalcStep[] = [
  {
    id: 'load', n: 1, label: 'Loads', short: 'Loads',
    href: '/calculators/load',
    blurb: 'What you use in a day, appliance by appliance',
  },
  {
    id: 'battery', n: 2, label: 'Battery', short: 'Battery',
    href: '/calculators/battery',
    blurb: 'What stores it through the night and the grey days',
  },
  {
    id: 'inverter', n: 3, label: 'Inverter & surge', short: 'Inverter',
    href: '/calculators/inverter',
    blurb: 'What runs the house — and what starting a motor costs',
  },
  {
    id: 'panels', n: 4, label: 'Panels', short: 'Panels',
    href: '/calculators/panels',
    blurb: 'What refills the bank in the sun you actually get',
  },
  {
    id: 'array', n: 5, label: 'Array wiring', short: 'Wiring',
    href: '/calculators/strings',
    blurb: 'Series, parallel, and the cold morning that decides both',
  },
  {
    id: 'protection', n: 6, label: 'Cable & protection', short: 'Protection',
    href: '/calculators/awg',
    blurb: 'Conductor gauge, and the fuse that protects it',
  },
  {
    id: 'system', n: 7, label: 'Your system', short: 'System',
    href: '/calculators/system',
    blurb: 'Everything you have sized and picked, in one place',
  },
] as const

export const TOTAL_STEPS = CALC_STEPS.length

export function stepById(id: StepId): CalcStep {
  const step = CALC_STEPS.find(s => s.id === id)
  if (!step) throw new Error(`Unknown calculator step: ${id}`)
  return step
}

/** The step before this one, built or not — null at the head of the chain. */
export function previousStep(id: StepId): CalcStep | null {
  const { n } = stepById(id)
  return CALC_STEPS.find(s => s.n === n - 1) ?? null
}

/** The step after this one, built or not — null at the tail. */
export function nextStep(id: StepId): CalcStep | null {
  const { n } = stepById(id)
  return CALC_STEPS.find(s => s.n === n + 1) ?? null
}

/**
 * The next step that actually has a page. Back and Next skip over unbuilt
 * steps rather than dead-ending on them — the rail is what shows the gap.
 */
export function nextBuiltStep(id: StepId): CalcStep | null {
  const { n } = stepById(id)
  return CALC_STEPS.find(s => s.n > n && s.href !== null) ?? null
}

export function previousBuiltStep(id: StepId): CalcStep | null {
  const { n } = stepById(id)
  return [...CALC_STEPS].reverse().find(s => s.n < n && s.href !== null) ?? null
}
