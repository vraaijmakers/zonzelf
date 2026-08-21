import { describe, expect, it } from 'vitest'
import { chargeLoop } from './charge-loop'
import { sizePanelArray } from './panels'
import { sizeBatteryBank } from './battery'

describe('chargeLoop', () => {
  it('warns when a "correct" array cannot replace the daily draw', () => {
    const battery = sizeBatteryBank({ dailyKwh: 5, days: 2, voltage: 24, dod: 0.8 })
    // 2 days autonomy looks fine (10 kWh usable) but the array only harvests 3 kWh/day.
    const panels = sizePanelArray({ dailyKwh: 3, peakSun: 3, panelWatt: 400 })
    const loop = chargeLoop({
      dailyNeedKwh: 5,
      estimatedDailyKwh: panels.estimatedDailyKwh,
    })
    expect(battery.usableKwh).toBe(10)
    expect(loop.coversDaily).toBe(false)
    expect(loop.shortfallKwh).toBeGreaterThan(0)
  })

  it('passes when harvest covers the daily need with margin', () => {
    const panels = sizePanelArray({ dailyKwh: 5, peakSun: 4, panelWatt: 400 })
    const loop = chargeLoop({
      dailyNeedKwh: 5,
      estimatedDailyKwh: panels.estimatedDailyKwh,
    })
    expect(loop.coversDaily).toBe(true)
    expect(loop.coversWithMargin).toBe(true)
  })

  it('does not divide by zero when need is 0', () => {
    const loop = chargeLoop({ dailyNeedKwh: 0, estimatedDailyKwh: 4 })
    expect(loop.ratio).toBeNull()
    expect(loop.coversDaily).toBe(false)
  })
})
