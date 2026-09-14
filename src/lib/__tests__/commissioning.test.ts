import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  commissioningPairing, commissioningMap, parallelCountFor, SPH_L16, SPH_WORK_MODES,
  type CommissioningStep, type SettingRow,
} from '../commissioning'
import { findBatteryPreset } from '../battery-preset'
import { assertProtectionView } from '../calc-register'
import type { ArraySummary } from '../calc-storage'

const SPH10 = 'sungold-sph10048p'
const SPH8 = 'sungold-sph8048p'
const PACK = 'sungold-sg48100p'
const EG4 = 'eg4-6000xp'

const mapFor = (inv = SPH10, input = {}) =>
  commissioningMap(commissioningPairing(inv, PACK)!, input)

const stepOf = (id: string, inv = SPH10, input = {}): CommissioningStep => {
  const m = mapFor(inv, input)
  const found = [...m.steps, m.fallback].find(s => s.id === id)
  assert.ok(found, `no step ${id}`)
  return found
}

const settingFor = (item: string, input = {}): SettingRow => {
  const row = stepOf('settings', SPH10, input).settings!.find(r => r.item === item)
  assert.ok(row, `no setting item ${item}`)
  return row
}

test('the procedure is gated on the admitted SPH + SG48100P pairing', () => {
  assert.equal(commissioningPairing(undefined, PACK), null)
  assert.equal(commissioningPairing(SPH10, undefined), null)
  assert.equal(commissioningPairing(EG4, PACK), null, 'EG4 + Sun Gold pack is not a map')
  assert.equal(commissioningPairing(SPH10, 'nope'), null)
  assert.ok(commissioningPairing(SPH10, PACK))
  assert.ok(commissioningPairing(SPH8, PACK))
})

test('an inverter summary saved before ids existed still pairs by brand and model', () => {
  const pair = commissioningPairing({ brand: 'Sun Gold Power', model: 'SPH10048P' }, PACK)
  assert.ok(pair)
  assert.equal(pair.inverter.id, SPH10)
  assert.equal(
    commissioningPairing({ brand: 'Sun Gold Power', model: 'SPH10048P' }, undefined),
    null,
    'brand/model is not enough without the pack',
  )
})

test('the steps are an ordered procedure, comms before the settings that need it', () => {
  const m = mapFor()
  assert.deepEqual(m.steps.map(s => s.id), ['order', 'comms', 'settings', 'array', 'verify'])
  assert.equal(m.fallback.id, 'fallback')
  assert.equal(m.inverterModel, 'SPH10048P')
  assert.equal(m.batteryModel, 'SG48100P')
})

test('every protection view in the procedure is still a protection output', () => {
  const m = mapFor(SPH10, { parallelCount: 2 })
  const views = [...m.steps, m.fallback].flatMap(s => s.views ?? [])
  assert.ok(views.length > 0)
  for (const view of views) {
    assertProtectionView(view)
    assert.ok(!/\brecommended\b/i.test(`${view.title} ${view.options.join(' ')}`))
  }
})

test('the standby-only items are flagged, because they cannot be set while running', () => {
  // The manual marks 31, 38 and 68 "turn off the rocker switch can be set".
  assert.equal(settingFor('38').standbyOnly, true)
  assert.equal(settingFor('68').standbyOnly, true)
  assert.ok(stepOf('order').actions!.some(a => /rocker switch/i.test(a)))
})

test('item 08 is L16, and the gel factory default is the reason it is first', () => {
  const row = settingFor('08')
  assert.equal(row.value, 'L16')
  assert.ok(/GEL/.test(row.why))
  assert.ok(/16 × 3\.2/.test(row.why))
})

test('item 39 is LCBMS — the setting that lets the pack govern', () => {
  const row = settingFor('39')
  assert.match(row.value, /LCBMS/)
  assert.match(row.why, /BMS/)
})

test('item 07 is set from the standard charge current, not the pack maximum', () => {
  const pack = findBatteryPreset(PACK)!
  assert.equal(pack.standardChargeA, 50)
  assert.equal(pack.maxChargeA, 100)
  // Two packs in parallel: 2 × 50 A standard = 100 A, under the 10 kW's 200 A.
  assert.equal(settingFor('07', { parallelCount: 2 }).value, '100 A')
  // One pack: 50 A, and item 28 cannot exceed it.
  assert.equal(settingFor('07', { parallelCount: 1 }).value, '50 A')
  assert.equal(settingFor('28', { parallelCount: 1 }).value, '50 A')
})

test('item 07 never exceeds what the machine allows', () => {
  // 63 packs × 50 A standard is far past the inverter; the ceiling clamps it.
  const row = settingFor('07', { parallelCount: 63 })
  assert.equal(row.value, '200 A', 'SPH10048P item 07 tops out at 200 A')
  const m8 = commissioningMap(commissioningPairing(SPH8, PACK)!, { parallelCount: 63 })
  const r8 = m8.steps.find(s => s.id === 'settings')!.settings!.find(r => r.item === '07')!
  assert.equal(r8.value, '180 A', 'SPH8048P item 07 tops out at 180 A')
})

test('item 60 is a ceiling, not a reserve — the wording bug this replaces', () => {
  const row = settingFor('60')
  assert.equal(row.value, '95%')
  assert.ok(/ABOVE|ceiling/.test(row.why), 'charge stops above the set value')
  assert.ok(!/remaining/i.test(row.why), '60 is not percent remaining')
})

test('the SOC items the manual defines are all present', () => {
  for (const item of ['58', '59', '60', '61', '62']) settingFor(item)
  assert.equal(settingFor('59').value, '20%')
  assert.equal(settingFor('61').value, '20%')
  assert.ok(/BMS communication/i.test(stepOf('settings').note!))
})

test('equalize is DIS, as a setting rather than a card of its own', () => {
  assert.equal(settingFor('16').value, 'DIS')
})

test('work mode is offered as a choice and never set', () => {
  assert.match(settingFor('01').value, /choice/i)
  assert.equal(SPH_WORK_MODES.length, 4)
  assert.deepEqual(SPH_WORK_MODES.map(m => m.id), ['UTI', 'SBU', 'SOL', 'SUB'])
})

test('the comms step prints both pin tables so they can be compared', () => {
  const step = stepOf('comms')
  assert.equal(step.pinouts!.length, 3)
  const inv = step.pinouts!.find(p => /Inverter/.test(p.title))!
  const bat = step.pinouts!.find(p => /RS485 socket/.test(p.title))!
  // The whole point: identical pins at both ends, so a patch cable is correct.
  assert.equal(inv.rows.find(r => r.signal === 'RS485-A')!.pins, '2, 7')
  assert.equal(bat.rows.find(r => r.signal === 'RS485-A')!.pins, '2, 7')
  assert.equal(inv.rows.find(r => r.signal === 'RS485-B')!.pins, '1, 8')
  assert.equal(bat.rows.find(r => r.signal === 'RS485-B')!.pins, '1, 8')
  assert.ok(step.actions!.some(a => /DIP switch to address 1|#1 ON/.test(a)))
})

test('the charge-voltage disagreement lives in the fallback, not the main path', () => {
  const m = mapFor()
  const mainViews = m.steps.flatMap(s => s.views ?? []).map(v => v.id)
  assert.ok(!mainViews.includes('charge-voltage'),
    'with LCBMS nobody types the disputed voltage')
  const view = m.fallback.views!.find(v => v.id === 'charge-voltage')!
  const pack = findBatteryPreset(PACK)!
  assert.equal(pack.recommendedChargeV, 54.5)
  assert.equal(SPH_L16.boostV, 56.8)
  assert.ok(view.options.some(o => o.startsWith('54.5 V')))
  assert.ok(view.options.some(o => o.startsWith('56.8 V')))
  // All four figures have to appear in the derivation, including the two the
  // options list does not carry: §8.1's 54 V and the 56 V full-charge judgment.
  const body = view.steps.map(s => s.body).join(' ')
  assert.ok(/54 V/.test(body))
  assert.ok(/56 V/.test(body))
  assert.ok(/item 39|LCBMS/i.test(body), 'says why it only matters open-loop')
})

test('the fallback insists on the ascending voltage ladder', () => {
  const step = stepOf('fallback')
  assert.ok(step.actions!.some(a => /15 < 12 < 14 < 35 < 09/.test(a)))
  assert.ok(step.actions!.some(a => /USER/.test(a)))
  const ladder = step.views!.find(v => v.id === 'cutoff-ladder')!
  assert.ok(ladder.options.some(o => /43\.2 V/.test(o)), "the pack's own cut-off")
})

test('charge current lists ceilings and does not invent a generator amp', () => {
  const view = stepOf('settings', SPH10, { parallelCount: 2 })
    .views!.find(v => v.id === 'charge-current')!
  assert.ok(view.options.some(o => /200 A/.test(o)), 'item 07 on the 10 kW is 200 A')
  assert.ok(view.options.some(o => /120 A/.test(o)), 'item 28 on the 10 kW is 120 A')
  assert.ok(view.options.some(o => /200 A \(2 × 100 A\)/.test(o)))
  assert.ok(view.options.some(o => /Generator: not given/.test(o)))
  assert.ok(view.options.every(o => !/^Generator: \d+ A$/.test(o)))
})

test('a generator kW becomes an amp ceiling, labelled as house-off', () => {
  const view = stepOf('settings', SPH8, { parallelCount: 1, generatorKw: 3 })
    .views!.find(v => v.id === 'charge-current')!
  assert.ok(view.options.some(o => /180 A/.test(o)), 'item 07 on the 8 kW is 180 A')
  assert.ok(view.options.some(o => /100 A/.test(o) && /28/.test(o)))
  const gen = view.options.find(o => o.startsWith('Generator:'))!
  assert.match(gen, /3 kW/)
  assert.match(gen, /house is off/)
  // 3000 / 51.2 ≈ 59 A, not the inverter's 100 A AC-in cap.
  assert.match(gen, /59 A/)
})

test('the verify step names the two fault codes by their manual meaning', () => {
  const step = stepOf('verify')
  const f58 = step.faults!.find(f => f.code === '58')!
  const f03 = step.faults!.find(f => f.code === '03')!
  assert.equal(f58.name, 'BMSComErr')
  assert.equal(f03.name, 'BatOpen')
  assert.ok(/comms|cable|protocol/i.test(f58.here))
  assert.ok(/breaker|power path|DC/i.test(f03.here))
  assert.ok(step.checks!.some(c => /SOC/.test(c)))
})

test('the array step carries step 5 over and never re-derives it', () => {
  const undone = stepOf('array')
  assert.equal(undone.actions, undefined)
  assert.ok(/has not been done/.test(undone.note!))

  const array: ArraySummary = {
    series: 8, parallel: 2, panels: 16, arrayWatts: 8800,
    vocColdV: 430, vmpHotV: 328, designIscA: 17, panelIscA: 13.45,
    stringsPerTracker: 1, designLowC: -4, designHighC: 35, stringFuseRequired: false,
  }
  const done = stepOf('array', SPH10, { array })
  assert.ok(done.actions!.some(a => /8 panels in series/.test(a)))
  assert.ok(done.actions!.some(a => /430 V/.test(a) && /500 V/.test(a)))
  assert.ok(done.actions!.some(a => /Never parallel PV1 and PV2/.test(a)))
})

test('parallel count is whole packs, capped, and omitted when the bank is unknown', () => {
  const pack = findBatteryPreset(PACK)!
  assert.equal(parallelCountFor(undefined, pack), undefined)
  assert.equal(parallelCountFor(5.12, pack), 1)
  assert.equal(parallelCountFor(10.3, pack), 3)
  assert.equal(parallelCountFor(5.12 * 80, pack), pack.maxParallel)
})

test('the L16 table numbers are the ones in the SPH manual, not the pack sheet', () => {
  assert.equal(SPH_L16.boostV, 56.8)
  assert.equal(SPH_L16.floatV, 56.8)
  assert.equal(SPH_L16.undervoltageDisconnectV, 48.8)
  assert.equal(SPH_L16.factoryBatteryType, 'GEL')
  const pack = findBatteryPreset(PACK)!
  assert.notEqual(pack.recommendedChargeV, SPH_L16.boostV)
})
