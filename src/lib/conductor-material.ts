/**
 * Why this calculator is copper, and what goes wrong when a cable is not.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Every ampacity and resistance figure in awg.ts is copper, from NEC Table
 * 310.16's copper column. That was documented in the code and said nowhere the
 * user could see it. Somebody sizing a run and then buying the cheapest
 * "battery cable" on a marketplace gets numbers that are simply wrong for the
 * wire in their hand — and the direction of the error is undersizing.
 *
 * THE TWO TEMPERATURE PROPERTIES, AND WHICH ONE ACTUALLY BURNS THINGS
 * -------------------------------------------------------------------
 * These get conflated, including by people who are otherwise right to be
 * worried. They are different properties with different consequences:
 *
 * 1. TEMPERATURE COEFFICIENT OF RESISTANCE — how much resistance rises as the
 *    metal warms. Copper 0.00393/degC, aluminium 0.00403/degC. Within about
 *    3% of each other. This is NOT the difference that matters: both metals
 *    get worse in heat at nearly the same rate, and the ampacity tables
 *    already account for it.
 *
 * 2. COEFFICIENT OF THERMAL EXPANSION — how much the metal grows as it warms.
 *    Copper 16.6, aluminium 23.1 micrometres per metre per kelvin. Aluminium
 *    expands about 40% more. THIS is the one that starts fires, and it does it
 *    at the JOINT rather than along the cable:
 *
 *        load rises -> conductor warms -> aluminium grows more than the steel
 *        or brass terminal holding it -> it is squeezed and deforms slightly
 *        (cold flow, or creep) -> load drops, everything cools, the conductor
 *        shrinks back thinner than the clamp -> the joint is now looser ->
 *        higher contact resistance -> more heat at that spot next cycle
 *
 *    That loop is self-reinforcing, takes months or years, and ends at a
 *    terminal hot enough to char. It is the mechanism behind the aluminium
 *    branch-circuit fires in 1960s-70s US housing, and it is why aluminium
 *    requires terminals listed for it (CO/ALR, AL-CU) and an antioxidant
 *    compound, rather than being a drop-in for copper.
 *
 * TWO MORE PROBLEMS THAT ARE NOT ABOUT TEMPERATURE
 * ------------------------------------------------
 * - CONDUCTIVITY. Aluminium is about 61% as conductive as copper by volume,
 *   so the same gauge carries materially less current and drops more voltage.
 *   Every number this calculator produces is wrong for it.
 * - OXIDE. Aluminium oxide forms in seconds on a fresh cut and is an
 *   insulator. Copper oxide is a poor conductor but not an insulating one. An
 *   aluminium joint made without cleaning and compound starts out compromised.
 *   Where aluminium touches copper with any moisture, galvanic corrosion adds
 *   to it.
 *
 * COPPER-CLAD ALUMINIUM IS THE ONE TO WATCH FOR
 * ---------------------------------------------
 * CCA is an aluminium core with a thin copper skin, sold cheaply as "battery
 * cable" or "welding cable" and often marked with a gauge it does not earn. It
 * carries every aluminium problem above, plus one of its own: the cut end
 * looks like copper, so it cannot be identified by eye, and a crimp bites
 * through the skin into aluminium anyway. It is generally not listed for the
 * wiring applications the NEC covers, which makes it not merely worse but not
 * permitted.
 *
 * WHAT THIS MODULE DOES NOT DO
 * ----------------------------
 * It does not offer an aluminium ampacity table. NEC 310.16 has one and
 * aluminium is used legitimately in large feeders by people who terminate it
 * properly. Publishing that column here would imply this site has something to
 * say about aluminium terminations, listings and torque specs, and it does
 * not. The honest position is: these figures are copper, here is how to tell
 * what you have, and aluminium is an electrician's conversation.
 */

export interface MetalProperty {
  label: string
  copper: string
  aluminium: string
  /** What the difference actually means for a solar install. */
  soWhat: string
  /** True when this is the property that causes the failure people fear. */
  decisive: boolean
}

export const METAL_PROPERTIES: MetalProperty[] = [
  {
    label: 'Conductivity',
    copper: '100% IACS',
    aluminium: 'about 61%',
    soWhat:
      'The same gauge carries markedly less current and drops more voltage. Every figure on ' +
      'this page is a copper figure and does not describe an aluminium cable.',
    decisive: false,
  },
  {
    label: 'Temperature coefficient of resistance',
    copper: '0.00393 /°C',
    aluminium: '0.00403 /°C',
    soWhat:
      'Within about 3%. Both metals lose ground as they heat, at nearly the same rate — so ' +
      'this is NOT the difference to worry about, even though it is the one usually named.',
    decisive: false,
  },
  {
    label: 'Thermal expansion',
    copper: '16.6 µm/m·K',
    aluminium: '23.1 µm/m·K',
    soWhat:
      'Aluminium grows about 40% more when it warms. At a terminal that means it is squeezed, ' +
      'deforms slightly, and comes back looser as it cools — every load cycle. This is the ' +
      'property that ends in a charred connection.',
    decisive: true,
  },
  {
    label: 'Surface oxide',
    copper: 'poorly conducting',
    aluminium: 'insulating',
    soWhat:
      'Aluminium oxide forms in seconds on a fresh cut and does not conduct. A joint made ' +
      'without cleaning and antioxidant compound is compromised from the day it is built.',
    decisive: false,
  },
]

/**
 * The failure loop, in one place so the guide and the calculator tell it the
 * same way. Written as steps because it is a cycle, and the cycle is the point
 * — no single step is dramatic, which is why it takes years and then fails.
 */
export const CREEP_CYCLE: string[] = [
  'Current flows and the conductor warms.',
  'Aluminium expands about 40% more than the terminal gripping it.',
  'Squeezed against the clamp, it deforms very slightly — cold flow.',
  'Load drops, everything cools, and the conductor shrinks back thinner than before.',
  'The joint is now a little looser, so contact resistance is a little higher.',
  'Higher resistance means more heat at that spot on the next cycle. Repeat.',
]

export const COPPER_ONLY_HEADLINE =
  'These figures are for copper conductors, and only for copper.'

export const CCA_WARNING =
  'Copper-clad aluminium — CCA — is an aluminium core with a thin copper skin, sold cheaply ' +
  'as "battery cable" or "welding cable" and frequently marked with a gauge it does not earn. ' +
  'The cut end looks like copper, so you cannot identify it by eye. It carries every aluminium ' +
  'problem and is generally not listed for the wiring the NEC covers, which makes it not ' +
  'merely a worse choice but an impermissible one.'

/** How to tell what you actually bought, without a lab. */
export const IDENTIFY_CCA: string[] = [
  'Weigh it. Copper is about 3.3 times denser than aluminium, so a CCA cable feels obviously ' +
  'light for its size. This is the quickest honest test.',
  'Scrape a strand with a knife. CCA shows silvery aluminium under the copper skin; solid ' +
  'copper stays copper all the way through.',
  'Read the jacket. Real copper cable is marked with its gauge and a listing. "CCA", ' +
  '"copper-clad", or no listing at all are all answers.',
  'Distrust the price. Copper is a traded commodity, so a cable at half the going rate is ' +
  'telling you what it is made of.',
]

export const MATERIAL_SOURCES = {
  ampacity: 'NEC Table 310.16 — the copper column is what this calculator uses',
  terminals: 'NEC 110.14 — conductors of dissimilar metals must not be joined in a device unless it is listed for it',
} as const
