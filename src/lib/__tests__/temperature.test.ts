import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  cToF, fToC, deltaCToF, deltaFToC, toDisplay, fromDisplay,
  deltaToDisplay, deltaFromDisplay, formatTemp, formatDelta, formatBoth,
  unitLabel, DEFAULT_TEMP_UNIT, COEFFICIENT_UNIT_NOTE, TERMINAL_RATING_NOTE,
} from '../temperature'

test('the default is Fahrenheit, for a US-first audience', () => {
  assert.equal(DEFAULT_TEMP_UNIT, 'F')
})

test('absolute conversion carries the offset', () => {
  assert.equal(cToF(0), 32)
  assert.equal(cToF(100), 212)
  assert.equal(cToF(-40), -40)
  assert.ok(Math.abs(fToC(32)) < 1e-9)
  assert.ok(Math.abs(fToC(-40) + 40) < 1e-9)
})

test('THE TRAP: a difference does NOT carry the offset', () => {
  // "Cells run 30 degrees hotter than the air" is a delta. Converting it as an
  // absolute gives 86, which is silently plausible and wrong — it is 54.
  assert.equal(deltaCToF(30), 54)
  assert.notEqual(deltaCToF(30), cToF(30))
  assert.equal(cToF(30), 86, 'the wrong answer, asserted so the distinction is visible')
  assert.equal(deltaCToF(25), 45)
  // A zero difference stays zero; a zero temperature does not.
  assert.equal(deltaCToF(0), 0)
  assert.equal(cToF(0), 32)
})

test('delta round-trips without drifting', () => {
  for (const c of [5, 25, 30, 40]) {
    assert.ok(Math.abs(deltaFToC(deltaCToF(c)) - c) < 1e-9, `${c} drifted`)
  }
})

test('absolute round-trips through the display boundary', () => {
  // Fahrenheit display rounds to a whole degree, so allow that much back.
  for (const c of [-25.9, -12, 0, 32, 45]) {
    const back = fromDisplay(toDisplay(c, 'F'), 'F')
    assert.ok(Math.abs(back - c) < 0.6, `${c} came back as ${back}`)
  }
  for (const c of [-25.9, 0, 45]) {
    assert.equal(fromDisplay(toDisplay(c, 'C'), 'C'), Math.round(c * 10) / 10)
  }
})

test('the display helpers keep absolutes and deltas apart', () => {
  assert.equal(toDisplay(30, 'F'), 86)
  assert.equal(deltaToDisplay(30, 'F'), 54)
  assert.equal(formatTemp(30, 'F'), '86°F')
  assert.equal(formatDelta(30, 'F'), '54°F')
  assert.equal(formatTemp(30, 'C'), '30°C')
  assert.equal(formatDelta(30, 'C'), '30°C')
  assert.equal(deltaFromDisplay(54, 'F'), 30)
})

test('a real site figure reads correctly in both units', () => {
  // Denver's design low.
  assert.equal(formatTemp(-25.9, 'F'), '-15°F')
  assert.equal(formatTemp(-25.9, 'C'), '-25.9°C')
})

test('formatBoth shows Celsius alongside, because the coefficient is per degC', () => {
  assert.equal(formatBoth(-25.9, 'C'), '-25.9°C')
  assert.match(formatBoth(-25.9, 'F'), /-15°F/)
  assert.match(formatBoth(-25.9, 'F'), /-25\.9°C/)
})

test('the notes explain the two things that deliberately stay Celsius', () => {
  assert.match(COEFFICIENT_UNIT_NOTE, /IEC 61215|CELSIUS/i)
  assert.match(TERMINAL_RATING_NOTE, /310\.16/)
  assert.match(TERMINAL_RATING_NOTE, /not a measurement to convert/i)
})

test('unit labels are the ones people expect', () => {
  assert.equal(unitLabel('F'), '°F')
  assert.equal(unitLabel('C'), '°C')
})
