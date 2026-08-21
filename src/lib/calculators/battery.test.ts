import { describe, expect, it } from 'vitest'
import { lvdGuidance, sizeBatteryBank, voltageFamily } from './battery'

describe('sizeBatteryBank', () => {
  it('sizes from adjusted kWh and DoD only — no second efficiency factor', () => {
    // 5 kWh/day adjusted, 2 days, 80% DoD, 24 V
    const sized = sizeBatteryBank({ dailyKwh: 5, days: 2, voltage: 24, dod: 0.8 })
    expect(sized.usableKwh).toBe(10)
    expect(sized.totalKwh).toBe(12.5)
    expect(sized.totalAh).toBeCloseTo(520.833, 2)
  })

  it('does not produce NaN at zero daily use', () => {
    const sized = sizeBatteryBank({ dailyKwh: 0, days: 2, voltage: 24, dod: 0.8 })
    expect(sized.totalKwh).toBe(0)
    expect(Number.isFinite(sized.totalAh)).toBe(true)
  })
})

describe('lvdGuidance', () => {
  it('does not treat 12.0 V as the LiFePO4 80% DoD setpoint', () => {
    const g = lvdGuidance('lifepo4', 12)
    expect(g.preferSocMeter).toBe(true)
    expect(g.restVolts.min).toBeGreaterThanOrEqual(12.8)
    expect(g.restVolts.min).toBeLessThan(13.2)
    expect(g.restVolts.max).toBeLessThanOrEqual(13.2)
  })

  it('scales LiFePO4 rest range with voltage family', () => {
    const v24 = lvdGuidance('lifepo4', 24)
    expect(v24.restVolts.min).toBe(25.6)
    const v48 = lvdGuidance('lifepo4', 48)
    expect(v48.restVolts.min).toBe(51.2)
  })

  it('gives lead-acid 50% DoD rest around 12.1–12.2 V, not 11.8 V', () => {
    const g = lvdGuidance('agm', 12)
    expect(g.preferSocMeter).toBe(false)
    expect(g.restVolts.min).toBe(12.1)
    expect(g.restVolts.max).toBe(12.2)
  })
})

describe('voltageFamily', () => {
  it('buckets real pack voltages (12.8 / 25.6 / 51.2) into 12/24/48', () => {
    expect(voltageFamily(12.8)).toBe(12)
    expect(voltageFamily(25.6)).toBe(24)
    expect(voltageFamily(51.2)).toBe(48)
  })
})
