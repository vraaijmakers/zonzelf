import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bankFit } from '../battery-bank-fit'

// The three rows carrying a retailer link on 2026-09-16 — the shelf this
// module was written against. Keeping the real numbers means a test failure
// after a price re-scrape is informative rather than noise.
const DISCOVER = { kwh: 5.12, price: 1683.4 }
const EG4_280 = { kwh: 14.34, price: 3124.99 }
const EG4_314 = { kwh: 16.08, price: 3749.99 }

test('the count is the same minimal count the page already showed', () => {
  assert.equal(bankFit(15, DISCOVER.kwh)!.units, 3)
  assert.equal(bankFit(15, EG4_280.kwh)!.units, 2)
  assert.equal(bankFit(15, EG4_314.kwh)!.units, 1)
})

// THE MISREADING THIS MODULE EXISTS TO FIX. At a 15 kWh target the cheaper
// battery shows the dearer total, purely because ceil rounded it up a pack.
test('the cheapest total is not the cheapest battery', () => {
  const a = bankFit(15, EG4_280.kwh, EG4_280.price)!
  const b = bankFit(15, EG4_314.kwh, EG4_314.price)!

  // What the card showed before: the 280Ah looks $2,500 worse.
  assert.equal(a.totalPrice, 6249.98)
  assert.equal(b.totalPrice, 3749.99)
  assert.ok(a.totalPrice! > b.totalPrice!)

  // What it now also shows: the 280Ah is the cheaper hardware, and the total
  // is dear because it delivers nearly twice the storage.
  assert.ok(a.costPerKwh! < b.costPerKwh!)
  assert.equal(a.deliveredKwh, 28.68)
  assert.equal(b.deliveredKwh, 16.08)
  assert.equal(a.overshootPct, 91)
  assert.equal(b.overshootPct, 7)
})

// Same two rows, target moved. Nothing about either battery changed, so any
// ordering that flips here was never a fact about the hardware.
test('the total ordering inverts with the target; cost per kWh does not', () => {
  const at15 = [bankFit(15, EG4_280.kwh, EG4_280.price)!, bankFit(15, EG4_314.kwh, EG4_314.price)!]
  const at20 = [bankFit(20, EG4_280.kwh, EG4_280.price)!, bankFit(20, EG4_314.kwh, EG4_314.price)!]

  assert.ok(at15[0].totalPrice! > at15[1].totalPrice!)
  assert.ok(at20[0].totalPrice! < at20[1].totalPrice!)

  // The stable figure: identical at both targets, because it never reads one.
  assert.equal(at15[0].costPerKwh, at20[0].costPerKwh)
  assert.equal(at15[1].costPerKwh, at20[1].costPerKwh)
})

test('cost per kWh is the unit price over unit capacity, not the bank total', () => {
  // $1,683.40 / 5.12 kWh = $328.79 — a property of the row, so the 3-unit and
  // 1-unit cases must agree.
  assert.equal(bankFit(15, DISCOVER.kwh, DISCOVER.price)!.costPerKwh, 329)
  assert.equal(bankFit(4, DISCOVER.kwh, DISCOVER.price)!.costPerKwh, 329)
})

test('a target that divides exactly overshoots by nothing', () => {
  const f = bankFit(10.24, DISCOVER.kwh, DISCOVER.price)!
  assert.equal(f.units, 2)
  assert.equal(f.deliveredKwh, 10.24)
  assert.equal(f.overshootKwh, 0)
  assert.equal(f.overshootPct, 0)
})

// 3 x 5.12 is 15.360000000000001 in IEEE 754. The card must not print that.
test('float noise never reaches the card', () => {
  assert.equal(bankFit(15, 5.12)!.deliveredKwh, 15.36)
  assert.equal(bankFit(15, 5.12)!.overshootKwh, 0.36)
})

// A pack larger than the whole bank is one unit and a large overshoot, not an
// error — someone sizing a 5 kWh bank off a 16 kWh shelf should see why the
// only option on it looks expensive.
test('one oversized pack reads as a big overshoot, not a failure', () => {
  const f = bankFit(5, EG4_314.kwh, EG4_314.price)!
  assert.equal(f.units, 1)
  assert.equal(f.overshootPct, 222)
  assert.equal(f.totalPrice, 3749.99)
})

test('no target means nothing to fit', () => {
  // The visitor has not entered a load yet. The card still renders.
  assert.equal(bankFit(0, DISCOVER.kwh, DISCOVER.price), null)
  assert.equal(bankFit(-1, DISCOVER.kwh), null)
  assert.equal(bankFit(Number.NaN, DISCOVER.kwh), null)
})

test('a non-positive capacity is a bad row, not a battery', () => {
  assert.equal(bankFit(15, 0, 100), null)
  assert.equal(bankFit(15, -5), null)
  assert.equal(bankFit(15, Number.NaN), null)
})

// priceDisplay() already decides whether a price may be repeated; this module
// must stay silent about money when it is handed nothing, and must not treat a
// parse failure wearing a number as a free battery.
test('an absent or nonsense price leaves the money figures null, not zero', () => {
  for (const p of [null, 0, -5, Number.NaN]) {
    const f = bankFit(15, DISCOVER.kwh, p)!
    assert.equal(f.totalPrice, null)
    assert.equal(f.costPerKwh, null)
    // The capacity figures are unaffected — they never needed a price.
    assert.equal(f.units, 3)
    assert.equal(f.deliveredKwh, 15.36)
  }
})
