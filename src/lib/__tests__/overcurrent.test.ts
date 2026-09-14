import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  STANDARD_RATINGS, sizingFactor, sizeOvercurrent, thinnestProtectableAwg,
} from '../overcurrent'
import { AWG_SPECS, usableAmpacity } from '../awg'

test('standard ratings match NEC 240.6(A)', () => {
  assert.equal(STANDARD_RATINGS[0], 15)
  assert.equal(STANDARD_RATINGS[1], 20)
  assert.equal(STANDARD_RATINGS[2], 25)
  assert.equal(STANDARD_RATINGS[STANDARD_RATINGS.length - 1], 800)
  // Non-existent sizes must never appear — a device you cannot buy is not an answer.
  for (const bogus of [10, 18, 22, 55, 65, 75, 130, 160]) {
    assert.ok(!(STANDARD_RATINGS as readonly number[]).includes(bogus), `${bogus}A is not a standard rating`)
  }
  // Strictly ascending.
  for (let i = 1; i < STANDARD_RATINGS.length; i++) {
    assert.ok(STANDARD_RATINGS[i] > STANDARD_RATINGS[i - 1])
  }
})

test('the continuous-duty factors are the code ones', () => {
  assert.equal(sizingFactor('general', true).factor, 1.25)
  assert.equal(sizingFactor('general', false).factor, 1)
  // 1.25 x 1.25 — irradiance above nameplate, then continuous duty.
  assert.equal(sizingFactor('pv-source', true).factor, 1.56)
  assert.equal(sizingFactor('pv-source', false).factor, 1.56, 'PV is continuous by definition')
})

test('THE rule: the device never exceeds what the conductor can carry', () => {
  // The whole reason this module exists. A correctly sized cable behind an
  // oversized breaker is still a fire.
  for (const spec of AWG_SPECS) {
    for (const column of [60, 75, 90] as const) {
      const r = sizeOvercurrent({ amps: 5, continuous: true, kind: 'general', awg: spec.awg, column })
      assert.ok(r)
      for (const rating of r.allowed) {
        assert.ok(rating <= usableAmpacity(spec, column),
          `AWG ${r.conductorLabel} @ ${column}C offers ${rating}A above its ${usableAmpacity(spec, column)}A ampacity`)
      }
    }
  }
})

test('and never below 125% of a continuous load', () => {
  const r = sizeOvercurrent({ amps: 30, continuous: true, kind: 'general', awg: 8, column: 75 })
  assert.ok(r)
  assert.equal(r.minimumAmps, 37.5)
  for (const rating of r.allowed) assert.ok(rating >= 37.5)
  assert.equal(r.allowed[0], 40, 'the first standard size at or above 37.5A is 40A')
  assert.equal(r.maximumAmps, 50, '8 AWG at 75C')
})

test('240.4(D) sets the ceiling on small conductors, not the ampacity table', () => {
  // 10 AWG at 90C is a 40A conductor by ampacity and a 30A one in practice.
  const r = sizeOvercurrent({ amps: 20, continuous: true, kind: 'general', awg: 10, column: 90 })
  assert.ok(r)
  assert.equal(r.maximumAmps, 30)
  assert.equal(r.ceilingIsSmallConductorRule, true)
  assert.ok(!r.allowed.includes(35), 'must not offer a device above the small-conductor cap')
  assert.deepEqual(r.allowed, [25, 30])
})

test('a PV string wants a bigger device than its bare current suggests', () => {
  // 10A Isc: 15A would be the naive answer and is wrong — 690.8 makes it 15.6A,
  // so the smallest legal standard device is 20A.
  const r = sizeOvercurrent({ amps: 10, continuous: true, kind: 'pv-source', awg: 10, column: 75 })
  assert.ok(r)
  assert.ok(Math.abs(r.minimumAmps - 15.6) < 1e-9)
  assert.equal(r.allowed[0], 20, '15A is below the 690.8 minimum')
  assert.ok(!r.allowed.includes(15))
})

test('the same current is treated differently as PV and as a general load', () => {
  const common = { amps: 10, continuous: true, awg: 10, column: 75 as const }
  const general = sizeOvercurrent({ ...common, kind: 'general' })
  const pv = sizeOvercurrent({ ...common, kind: 'pv-source' })
  assert.ok(general && pv)
  assert.equal(general.allowed[0], 15)
  assert.equal(pv.allowed[0], 20)
})

test('an unprotectable conductor is reported, not papered over', () => {
  // 30A continuous needs a 37.5A device; 10 AWG is capped at 30A by 240.4(D).
  // There is no legal answer — the conductor is too small.
  const r = sizeOvercurrent({ amps: 30, continuous: true, kind: 'general', awg: 10, column: 90 })
  assert.ok(r)
  assert.equal(r.impossible, true)
  assert.deepEqual(r.allowed, [])
  assert.ok(r.minimumAmps > r.maximumAmps, 'the bounds must actually cross')
})

test('the fix for an unprotectable conductor is thicker cable', () => {
  const input = { amps: 30, continuous: true, kind: 'general' as const, column: 90 as const }
  const better = thinnestProtectableAwg(input)
  assert.ok(better)
  assert.ok(better.awg < 10, 'must move to a thicker conductor than the failing one')
  assert.equal(better.awg, 8)
  assert.equal(better.rating, 40)

  // And that suggestion must itself be valid.
  const check = sizeOvercurrent({ ...input, awg: better.awg })
  assert.ok(check && !check.impossible)
  assert.ok(check.allowed.includes(better.rating))
})

test('a load no conductor can protect returns nothing rather than guessing', () => {
  assert.equal(
    thinnestProtectableAwg({ amps: 5000, continuous: true, kind: 'general', column: 90 }),
    undefined,
  )
})

test('degenerate input never produces a device rating', () => {
  for (const bad of [Number.NaN, -50, Number.POSITIVE_INFINITY]) {
    const r = sizeOvercurrent({ amps: bad, continuous: true, kind: 'general', awg: 8, column: 75 })
    assert.ok(r)
    assert.ok(Number.isFinite(r.minimumAmps), `minimum not finite for ${bad}`)
    assert.ok(r.minimumAmps >= 0)
  }
  assert.equal(sizeOvercurrent({ amps: 10, continuous: true, kind: 'general', awg: 99, column: 75 }), null)
})

test('every allowed rating is a real purchasable size', () => {
  for (const awg of [14, 12, 10, 8, 6, 4, 2, 0, -3]) {
    const r = sizeOvercurrent({ amps: 8, continuous: true, kind: 'general', awg, column: 75 })
    assert.ok(r)
    for (const rating of r.allowed) {
      assert.ok((STANDARD_RATINGS as readonly number[]).includes(rating),
        `${rating}A is not in NEC 240.6(A)`)
    }
  }
})
