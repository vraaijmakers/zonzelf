import { describe, expect, it } from 'vitest'
import { sizePanelArray } from './panels'
import { loadTotals } from './load'

describe('sizePanelArray', () => {
  it('does not apply efficiency a second time on top of adjusted kWh', () => {
    const { adjustedKwh } = loadTotals([{ watts: 1000, hours: 4, qty: 1 }], 0.8)
    expect(adjustedKwh).toBe(5)

    const sized = sizePanelArray({ dailyKwh: adjustedKwh, peakSun: 5, panelWatt: 500 })
    // kWp = 5 kWh / 5 h = 1000 W → 2 × 500 W
    expect(sized.totalWattsNeeded).toBe(1000)
    expect(sized.panelsNeeded).toBe(2)
    expect(sized.estimatedDailyKwh).toBe(5)
    expect(sized.surplusPct).toBe(0)
  })

  it('returns null surplus instead of NaN when daily kWh is 0', () => {
    const sized = sizePanelArray({ dailyKwh: 0, peakSun: 3, panelWatt: 400 })
    expect(sized.surplusPct).toBeNull()
    expect(sized.panelsNeeded).toBe(0)
  })

  it('returns zeros instead of Infinity when peak sun is 0', () => {
    const sized = sizePanelArray({ dailyKwh: 3.5, peakSun: 0, panelWatt: 400 })
    expect(sized.totalWattsNeeded).toBe(0)
    expect(sized.panelsNeeded).toBe(0)
    expect(Number.isFinite(sized.estimatedDailyKwh)).toBe(true)
  })
})
