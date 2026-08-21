import { describe, expect, it } from 'vitest'
import { awgLabel, evaluateAwgTable, recommendAwg } from './awg'

describe('AWG ampacity', () => {
  it('does not use chassis ratings for in-wall / conduit runs', () => {
    // 42 A fails AWG 10 on NEC 75°C (35 A) and AWG 12 on chassis (41 A),
    // so conduit steps up to 8 (50 A) and chassis stays on 10 (55 A).
    const conduit = evaluateAwgTable({
      amps: 42, oneWayFt: 5, voltage: 48, maxDropPct: 5, mode: 'conduit',
    })
    const chassis = evaluateAwgTable({
      amps: 42, oneWayFt: 5, voltage: 48, maxDropPct: 5, mode: 'chassis',
    })

    const conduit10 = conduit.find(r => r.awg === 10)!
    const chassis10 = chassis.find(r => r.awg === 10)!
    expect(conduit10.meetsAmpacity).toBe(false)
    expect(chassis10.meetsAmpacity).toBe(true)

    expect(recommendAwg(conduit)?.awg).toBe(8)   // 50 A conduit
    expect(recommendAwg(chassis)?.awg).toBe(10)  // 55 A chassis
  })

  it('does not recommend 16 AWG for conduit (not a building-wire size here)', () => {
    const results = evaluateAwgTable({
      amps: 5, oneWayFt: 3, voltage: 48, maxDropPct: 3, mode: 'conduit',
    })
    const rec = recommendAwg(results)!
    expect(rec.awg).toBeLessThanOrEqual(14)
    expect(rec.conduitAmps).not.toBeNull()
  })

  it('accounts for round-trip length in voltage drop', () => {
    const results = evaluateAwgTable({
      amps: 10, oneWayFt: 100, voltage: 12, maxDropPct: 3, mode: 'conduit',
    })
    const awg4 = results.find(r => r.awg === 4)!
    // 0.0249 Ω/100ft × 200 ft round trip × 10 A = 0.498 V → 4.15%
    expect(awg4.voltDrop).toBeCloseTo(0.498, 2)
    expect(awg4.voltDropPct).toBeCloseTo(4.15, 1)
  })

  it('labels 1/0 through 4/0 correctly', () => {
    expect(awgLabel(0)).toBe('1/0')
    expect(awgLabel(-1)).toBe('2/0')
    expect(awgLabel(-2)).toBe('3/0')
    expect(awgLabel(-3)).toBe('4/0')
    expect(awgLabel(10)).toBe('10')
  })
})
