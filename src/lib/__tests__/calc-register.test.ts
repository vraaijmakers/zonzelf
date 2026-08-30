import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CALCULATOR_OUTPUTS, shippedProtection, shippedCapacity, outputDef,
  assertProtectionView, type OutputId,
} from '../calc-register'
import { conductorProtectionView } from '../awg'
import { sizeOvercurrent, ocpdProtectionView } from '../overcurrent'
import { cutoffProtectionView } from '../battery-chemistry'
import { CALC_STEPS } from '../calc-steps'

test('every output is classified exactly once, as capacity or protection', () => {
  const ids = CALCULATOR_OUTPUTS.map(o => o.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids')
  for (const o of CALCULATOR_OUTPUTS) {
    assert.ok(o.register === 'capacity' || o.register === 'protection', o.id)
    assert.ok(o.label.length > 0)
    assert.ok(o.risk.length > 20, `${o.id} must say what being wrong costs`)
  }
})

test('the five protection outputs the design named are all in the catalog', () => {
  // CLAUDE.md: conductor gauge, OCPD, cutoff, string Voc. Inverter VA is
  // capacity (an undersized inverter shuts down; it does not start a fire).
  for (const id of ['conductor-gauge', 'ocpd-rating', 'cutoff-voltage', 'string-voc'] as OutputId[]) {
    assert.equal(outputDef(id).register, 'protection', id)
  }
  assert.equal(outputDef('inverter-va').register, 'capacity')
})

test('shipped protection is every output the calculators actually emit', () => {
  const ids = shippedProtection().map(o => o.id).sort()
  assert.deepEqual(ids, [
    'conductor-gauge', 'cutoff-voltage', 'ocpd-rating',
    'string-current', 'string-fuse', 'string-voc',
  ])
})

test('shipped capacity is every sizing output the calculators emit', () => {
  const ids = shippedCapacity().map(o => o.id).sort()
  assert.deepEqual(ids, [
    'array-dc-power', 'bank-kwh', 'daily-kwh', 'inverter-va', 'mppt-window', 'panel-count',
  ])
})

test('the inverter step is where its rating is emitted, ahead of panels', () => {
  // The whole reason the chain was reordered: the array is designed against
  // this unit's tracker, so the unit has to be chosen before the panel step.
  assert.equal(outputDef('inverter-va').page, '/calculators/inverter')
  const steps = CALC_STEPS.map(s => s.id)
  assert.ok(steps.indexOf('inverter') < steps.indexOf('panels'))
  assert.ok(steps.indexOf('panels') < steps.indexOf('array'))
})

test('the string outputs split across both registers, and the split is the lesson', () => {
  // Too much voltage or current destroys hardware; too little voltage only
  // wastes sunshine. Same page, same physics, different register — and the
  // page has to render them differently because of it.
  assert.equal(outputDef('string-voc').register, 'protection')
  assert.equal(outputDef('string-current').register, 'protection')
  assert.equal(outputDef('string-fuse').register, 'protection')
  assert.equal(outputDef('mppt-window').register, 'capacity')
  assert.equal(outputDef('array-dc-power').register, 'capacity')
})

test('every output ships from the page that owns it', () => {
  // Nothing may claim a page that does not exist, and nothing may sit
  // unclassified — an unshipped output is fine, an unregistered one is not.
  const built = new Set(CALC_STEPS.filter(s => s.href).map(s => s.href))
  for (const o of CALCULATOR_OUTPUTS) {
    if (!o.shipped) continue
    assert.ok(built.has(o.page), `${o.id} ships from ${o.page}, which has no step`)
  }
})

const awgInput = {
  amps: 30, oneWayFeet: 10, volts: 24, maxDropPercent: 3, column: 75 as const,
  kind: 'general' as const, continuous: true,
}

test('conductor view is a passing set, never a recommended gauge', () => {
  const view = conductorProtectionView(awgInput)
  assertProtectionView(view)
  assert.ok(view.options.length >= 2, 'a 30A 10ft 24V run must have more than one passing size')
  assert.ok(view.options.every(o => /AWG$/.test(o)))
  assert.ok(view.sources.some(s => /310\.16/.test(s)))
  assert.equal(view.empty, null)
})

test('conductor view says so when nothing passes', () => {
  const view = conductorProtectionView({ ...awgInput, amps: 400, maxDropPercent: 1, volts: 12 })
  assertProtectionView(view)
  assert.equal(view.options.length, 0)
  assert.ok(view.empty && view.empty.length > 40)
})

test('OCPD view is the set of standard ratings that fit, not one device', () => {
  const ocpd = sizeOvercurrent({ amps: 20, continuous: true, kind: 'general', awg: 10, column: 75 })
  assert.ok(ocpd && !ocpd.impossible)
  const view = ocpdProtectionView(ocpd)
  assertProtectionView(view)
  assert.ok(view.options.length >= 1)
  assert.ok(view.options.every(o => /^\d+ A$/.test(o)))
  assert.ok(view.sources.some(s => /240\.6/.test(s)))
})

test('OCPD view refuses to invent a device when the conductor cannot be protected', () => {
  const ocpd = sizeOvercurrent({ amps: 40, continuous: true, kind: 'general', awg: 14, column: 75 })
  assert.ok(ocpd && ocpd.impossible)
  const view = ocpdProtectionView(ocpd)
  assertProtectionView(view)
  assert.equal(view.options.length, 0)
  assert.match(view.empty ?? '', /thicker cable/i)
})

test('lithium cutoff options are the BMS, not a voltage', () => {
  const view = cutoffProtectionView('lifepo4', 12)
  assertProtectionView(view)
  assert.deepEqual(view.options, ['Use the BMS or percent remaining'])
  assert.ok(view.options.every(o => !/\d/.test(o) || !/V/.test(o)))
  // The resting floor lives in the derivation, labelled as already-near-empty.
  assert.ok(view.steps.some(s => /12\.8/.test(s.body)))
  assert.ok(view.sources.some(s => /depth-of-discharge/.test(s)))
})

test('lead-acid cutoff options are a resting band, not a live setpoint', () => {
  const view = cutoffProtectionView('agm', 24)
  assertProtectionView(view)
  assert.equal(view.options.length, 1)
  assert.match(view.options[0], /24\.2–24\.4V at rest/)
  assert.ok(view.steps.some(s => /sags/i.test(s.body)))
  assert.ok(!/\brecommended\b/i.test(view.options.join(' ')))
})

test('assertProtectionView rejects a "recommended" headline', () => {
  assert.throws(() => assertProtectionView({
    id: 'conductor-gauge',
    title: 'Recommended gauge',
    options: ['10 AWG'],
    empty: null,
    steps: [{ title: 'x', body: 'y' }],
    sources: ['NEC'],
  }), /recommended/i)
})
