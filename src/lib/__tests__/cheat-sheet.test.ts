import { test } from 'node:test'
import assert from 'node:assert/strict'
import { commissioningMap, commissioningPairing } from '../commissioning'
import { cheatSheet } from '../cheat-sheet'

const pair = commissioningPairing('sungold-sph10048p', 'sungold-sg48100p')!
const sheetFor = (n?: number) =>
  cheatSheet(pair, commissioningMap(pair, { parallelCount: n }), n)

test('five packs: the sheet an owner carried to the cabin', () => {
  const s = sheetFor(5)
  assert.equal(s.title, '5 × SG48100P → SPH10048P')
  assert.equal(s.bank.length, 5)
  assert.equal(s.upstreamSocket, 'RS485A')
  assert.deepEqual(s.bank.map(r => r.address), [1, 2, 3, 4, 5])
  // Four links for five packs, and the headline says B → C like the panel.
  assert.ok(s.rules.some(r => r.title === 'Packs chain B → C' && /4 short cables/.test(r.body)))
  assert.ok(s.cables.some(c => /^4 × short patch/.test(c)))
  assert.ok(s.cables.some(c => /NOT a crossover/.test(c)))
})

test('every value on paper is the value on the screen', () => {
  const map = commissioningMap(pair, { parallelCount: 5 })
  const s = cheatSheet(pair, map, 5)
  const screen = map.steps.find(st => st.id === 'settings')!.settings!
  assert.deepEqual(s.settings, screen)
  assert.equal(s.settings.find(r => r.item === '32')!.value, '485 (or CAN)')
})

test('the inverter port list names the right port and warns off the two look-alikes', () => {
  const s = sheetFor(5)
  assert.deepEqual(s.inverterPorts.filter(p => p.use === 'this').map(p => p.name), ['RS485/CAN'])
  assert.deepEqual(s.inverterPorts.filter(p => p.use === 'not').map(p => p.name), ['WIFI', 'Parallel'])
})

test('plan B carries the pin-7 caveat instead of claiming CAN matches', () => {
  const s = sheetFor(5)
  assert.match(s.planB!, /pin 7/)
  assert.ok(!s.pins.some(t => /CAN socket/.test(t.title)), 'paper prints the lead bus only')
})

test('one pack has no chain, and an unknown bank invents no table', () => {
  const one = sheetFor(1)
  assert.equal(one.bank.length, 1)
  assert.ok(!one.order.some(o => /Link cables/.test(o)))
  assert.ok(!one.cables.some(c => /pack-to-pack/.test(c)))

  const unknown = sheetFor(undefined)
  assert.equal(unknown.bank.length, 0)
  assert.equal(unknown.packCount, undefined)
  assert.equal(unknown.title, 'SG48100P bank → SPH10048P')
})

test('the WiFi guide never claims the inverter manual names the app', () => {
  const m = sheetFor(5).monitoring!
  assert.equal(m.port, 'WIFI')
  assert.ok(m.apps.some(a => /Anything else/.test(a.label)), 'other dongles are acknowledged')
  assert.ok(m.trouble.some(t => /10\.10\.100\.254/.test(t.fix)))
  assert.ok(m.rules.some(r => /item 32/i.test(r.title + r.body)))
})
