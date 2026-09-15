/**
 * The lecture behind the calculator chain, as copy.
 *
 * /guides/how-it-works is what the boxes do. This is why we visit them in
 * this order — the 40,000-ft map the step rail cannot be. Pictures live in
 * SizingStory.tsx; the words live here so the guide and the calculators
 * index cannot drift, and so a new step is a missing test rather than a
 * missing paragraph.
 *
 * REGISTER. This is teaching, not a calculator. No beat may emit a
 * protection number (a gauge, a fuse rating, a cutoff voltage). The cartoon
 * points at the step; the step shows the arithmetic.
 */

import { CALC_STEPS, type StepId } from './calc-steps'

export const SIZING_STORY_HREF = '/guides/sizing-a-system'

export interface StoryBeat {
  id: StepId
  /** One sentence of what you are doing. */
  what: string
  /** One sentence of why this stop exists. */
  why: string
  /** Accessible name for the picture. */
  scene: string
}

export const SIZING_STORY: readonly StoryBeat[] = [
  {
    id: 'load',
    what: 'Walk the house. Fridge, lights, well pump, laptop — write them down.',
    why: 'Every other number is just “enough to cover this.” Start here or the rest is a guess.',
    scene: 'A stick figure with a clipboard looking at a fridge, a lamp, a laptop and a well pump',
  },
  {
    id: 'battery',
    what: 'The sun leaves. This is what keeps the lights on until it comes back.',
    why: 'You are sizing the night — and the grey days — not the sunny afternoon.',
    scene: 'At night, a stick figure stands by a battery bank while the house windows glow',
  },
  {
    id: 'inverter',
    what: 'A fridge or a well pump does not sip when it starts. It gulps. Pick the box that can take the gulp.',
    why: 'This box also sets the window the roof has to fit. That is why it comes before the panels.',
    scene: 'A stick figure next to a well pump, a surge spike jumping toward an inverter',
  },
  {
    id: 'panels',
    what: 'Now, and only now, how much roof. Not July sun. December sun.',
    why: 'The array has to refill the bank you just sized, in the sun you actually get.',
    scene: 'A stick figure on a snowy roof under a small winter sun, shading their eyes',
  },
  {
    id: 'array',
    what: 'Same panels, two ways to wire them. One of those ways dies on a cold morning.',
    why: 'Series and parallel are a winter voltage problem, not a neatness problem.',
    scene: 'A split picture: panels on a warm afternoon with a healthy inverter, and the same panels on a frosty morning with a dead inverter',
  },
  {
    id: 'protection',
    what: 'The current travels through real copper, with a fuse that opens if something goes wrong.',
    why: 'This stop exists so a fault opens a fuse instead of starting a fire.',
    scene: 'A stick figure holding a coil of cable next to a fuse on a run of wire',
  },
  {
    id: 'system',
    what: 'Step back. Six confident answers can still disagree.',
    why: 'This is the only place the chain can say that a number depends on an assumption you made three stops ago.',
    scene: 'A stick figure at a workbench looking at every piece, with one item circled on a checklist',
  },
] as const

export function beatById(id: StepId): StoryBeat {
  const beat = SIZING_STORY.find(b => b.id === id)
  if (!beat) throw new Error(`Unknown sizing-story beat: ${id}`)
  return beat
}

/** Step chrome for a beat — label, href, number. Fails if the chain drifted. */
export function beatStep(id: StepId) {
  const step = CALC_STEPS.find(s => s.id === id)
  if (!step) throw new Error(`Sizing-story beat ${id} is not a calculator step`)
  return step
}
