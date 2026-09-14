import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ROUND_TRIP, roundTripMidpoint, formatRoundTrip, CUTOFF_PROFILES, type ChemistryId,
} from '../battery-chemistry'
import { DEFAULTS } from '../system-efficiency'

const ALL: ChemistryId[] = ['lifepo4', 'agm', 'gel', 'flooded']

test('the calculator sits at the midpoint, not the best case of the range', () => {
  // The drift this file exists to prevent: the calculator had settled on the
  // top of every published range, which biases the array small — the direction
  // that leaves someone short in December.
  for (const c of ALL) {
    const { min, max } = ROUND_TRIP[c]
    const mid = roundTripMidpoint(c)
    assert.ok(Math.abs(mid - (min + max) / 2) < 1e-9, `${c} is not the midpoint`)
    assert.ok(mid > min && mid < max, `${c} midpoint must sit strictly inside its range`)
  }
})

test('the published ranges are the ones the guide taught', () => {
  assert.deepEqual(ROUND_TRIP.lifepo4, { min: 0.95, max: 0.98 })
  assert.deepEqual(ROUND_TRIP.agm, { min: 0.80, max: 0.85 })
  assert.deepEqual(ROUND_TRIP.gel, { min: 0.80, max: 0.85 })
  assert.deepEqual(ROUND_TRIP.flooded, { min: 0.70, max: 0.80 })
})

test('every range is sane and lithium beats lead-acid', () => {
  for (const c of ALL) {
    const { min, max } = ROUND_TRIP[c]
    assert.ok(min > 0 && max <= 1, `${c} out of bounds`)
    assert.ok(min < max, `${c} range is inverted`)
  }
  for (const lead of ['agm', 'gel', 'flooded'] as const) {
    assert.ok(roundTripMidpoint('lifepo4') > roundTripMidpoint(lead),
      `lithium should be more efficient than ${lead}`)
  }
  assert.ok(roundTripMidpoint('flooded') < roundTripMidpoint('agm'),
    'flooded is the least efficient lead-acid')
})

test('the guide renders the range, not the midpoint', () => {
  // A reader is shown the honest spread; the tool picks one number from it.
  assert.equal(formatRoundTrip('lifepo4'), '95–98%')
  assert.equal(formatRoundTrip('flooded'), '70–80%')
  for (const c of ALL) assert.match(formatRoundTrip(c), /^\d+–\d+%$/)
})

test('the unknown-chemistry default is a real published midpoint', () => {
  // Used when no battery summary exists. It must not be more optimistic than
  // any chemistry a user could actually pick.
  assert.equal(DEFAULTS.batteryRoundTrip, roundTripMidpoint('agm'))
  assert.ok(DEFAULTS.batteryRoundTrip <= roundTripMidpoint('lifepo4'))
})

test('every chemistry has a cutoff profile as well as an efficiency', () => {
  for (const c of ALL) {
    assert.ok(CUTOFF_PROFILES[c], `${c} has no cutoff profile`)
    assert.ok(ROUND_TRIP[c], `${c} has no efficiency range`)
  }
})
