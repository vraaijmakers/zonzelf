import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CALC_STEPS } from '../calc-steps'
import {
  SIZING_STORY, SIZING_STORY_HREF, beatById, beatStep,
} from '../sizing-story'

test('every calculator step has a story beat, in the same order', () => {
  assert.equal(SIZING_STORY.length, CALC_STEPS.length)
  assert.deepEqual(
    SIZING_STORY.map(b => b.id),
    CALC_STEPS.map(s => s.id),
  )
})

test('every beat has a what, a why, and a picture name', () => {
  for (const beat of SIZING_STORY) {
    assert.ok(beat.what.length > 20, `${beat.id} what`)
    assert.ok(beat.why.length > 20, `${beat.id} why`)
    assert.ok(beat.scene.length > 20, `${beat.id} scene`)
    const step = beatStep(beat.id)
    assert.equal(step.id, beat.id)
    assert.equal(beatById(beat.id).id, beat.id)
  }
})

test('the cartoon does not emit a protection number', () => {
  // Guides teach; calculators show the derivation. A gauge or a fuse rating
  // in a speech bubble is the Jeppesen chart. Point at the step instead.
  const copy = SIZING_STORY.map(b => `${b.what} ${b.why}`).join(' ')
  assert.equal(/\bAWG\b/i.test(copy), false)
  assert.equal(/\b\d+\s*A\b/.test(copy), false)
  assert.equal(/\b\d+\s*V\b/.test(copy), false)
})

test('the story lives at a real guide path', () => {
  assert.equal(SIZING_STORY_HREF, '/guides/sizing-a-system')
})
