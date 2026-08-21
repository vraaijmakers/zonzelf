import { describe, expect, it } from 'vitest'
import { loadTotals, PRESETS, clampEfficiency } from './load'

describe('loadTotals', () => {
  it('applies system efficiency once: adjusted = raw / efficiency', () => {
    const totals = loadTotals([{ watts: 100, hours: 10, qty: 1 }], 0.8)
    expect(totals.rawKwh).toBe(1)
    expect(totals.adjustedKwh).toBe(1.25)
  })

  it('does not count a cycling fridge as nameplate × 24h', () => {
    const fridge = PRESETS.find(p => p.name === 'Full-size fridge')
    expect(fridge).toBeDefined()
    expect(fridge!.cycling).toBe(true)
    const dailyKwh = (fridge!.watts * fridge!.hours) / 1000
    expect(dailyKwh).toBe(1.2)
    expect(dailyKwh).toBeLessThan(2)
  })

  it('treats mini-fridge hours as duty-cycle equivalent', () => {
    const mini = PRESETS.find(p => p.name === 'Mini fridge')
    expect(mini!.cycling).toBe(true)
    expect((mini!.watts * mini!.hours) / 1000).toBe(0.64)
  })

  it('clamps hours to 0–24 and ignores negative watts', () => {
    const totals = loadTotals([{ watts: -10, hours: 40, qty: 1 }], 0.8)
    expect(totals.rawKwh).toBe(0)
  })

  it('falls back to 80% efficiency on garbage input', () => {
    expect(clampEfficiency(Number.NaN)).toBe(0.8)
    expect(clampEfficiency(0.2)).toBe(0.6)
    expect(clampEfficiency(1.5)).toBe(0.95)
  })
})
