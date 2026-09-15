/**
 * What the sizing chain assumes, and who it therefore does not serve.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Every calculator step is written in the same confident voice, and none of
 * them ever said what they assume: a BUILDING. Fixed roof, fixed tilt, an
 * earth electrode beside it, conductors sized from NEC Table 310.16 for a
 * raceway at 30 degC ambient. A visitor building for a camper van or a boat
 * had no way to find that out, because nothing on the page looked any less
 * sure when they were outside its scope.
 *
 * The honest fix is expensive and the awareness fix is cheap, so the awareness
 * fix ships first and alone: a scope notice on every step, and a guide at
 * /guides/boats-and-rvs that says what transfers and what does not.
 *
 * WHY THE VERDICTS LIVE HERE AND NOT IN THE PAGE
 * ----------------------------------------------
 * The guide prints this table, the scope notice names the two "No" steps, and
 * CALC_STEPS decides what a step is called. Three copies of the same judgement
 * is how the calculator index came to advertise four calculators while the
 * flow had seven. One list, keyed to StepId, checked by the compiler.
 *
 * WHAT A VERDICT MEANS
 * --------------------
 *   Mostly  - the arithmetic is indifferent to the structure. Sanity-check it.
 *   Partly  - the quantity transfers, the recommendation around it does not.
 *   Poorly  - the step answers a question that is framed wrong for a vehicle.
 *   No      - the output is a direct reading of a code table for a fixed
 *             building. Do not carry the number across. This is the protection
 *             register, and it is the reason the notice exists at all.
 *
 * Only `protection` is 'No' today. If a second step ever reads a code table
 * directly, it belongs at 'No' too, and the notice picks that up on its own.
 */

import { stepById, type StepId } from './calc-steps'

export const BOAT_RV_GUIDE_HREF = '/guides/boats-and-rvs'

export type TransferVerdict = 'Mostly' | 'Partly' | 'Poorly' | 'No'

export interface StepTransfer {
  id: StepId
  /** "1 Loads" — the position and label, from CALC_STEPS. Never hand-typed. */
  step: string
  /** Just the label, lowercased, for running prose. "cable & protection". */
  label: string
  verdict: TransferVerdict
  why: string
}

const VERDICTS: { id: StepId; verdict: TransferVerdict; why: string }[] = [
  {
    id: 'load',
    verdict: 'Mostly',
    why: 'Watts times hours is watts times hours. The preset list is a house one — no bilge pump, no DC compressor fridge, no chartplotter.',
  },
  {
    id: 'battery',
    verdict: 'Partly',
    why: 'The kWh arithmetic holds. The case size, the mounting, the ventilation and the models we list are all built for a plant room.',
  },
  {
    id: 'inverter',
    verdict: 'Partly',
    why: 'Continuous and surge transfer. The system-voltage recommendation does not — a vehicle already has a 12 V system you cannot orphan.',
  },
  {
    id: 'panels',
    verdict: 'Poorly',
    why: 'We size the array from the energy you need. Aboard, you size it from the roof you have, then find out what that supports.',
  },
  {
    id: 'array',
    verdict: 'Poorly',
    why: 'We arrange strings to suit the MPPT window. A mast or a roof unit throws a moving shadow, which pushes the opposite way.',
  },
  {
    id: 'protection',
    verdict: 'No',
    why: 'Read straight out of NEC tables for a fixed building. Your boat answers to ABYC E-11, your RV to NFPA 1192. Different tables.',
  },
  {
    id: 'system',
    verdict: 'Partly',
    why: 'It assumes solar is the only thing charging the bank. Aboard it is one of three, and the engine is usually the biggest.',
  },
]

export const STEP_TRANSFER: readonly StepTransfer[] = VERDICTS.map(({ id, verdict, why }) => {
  const { n, label } = stepById(id)
  return { id, step: `${n} ${label}`, label: label.toLowerCase(), verdict, why }
})

/** The steps whose numbers must not be carried onto a boat or an RV at all. */
export const DOES_NOT_TRANSFER: readonly StepTransfer[] =
  STEP_TRANSFER.filter(s => s.verdict === 'No')

/**
 * Does this step carry a code-derived output that is wrong outside a building?
 * Drives the stronger wording on the scope notice.
 */
export function isCodeDerived(id: StepId): boolean {
  return DOES_NOT_TRANSFER.some(s => s.id === id)
}
