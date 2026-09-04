/**
 * Sanity checks for a BatteryPreset before it is admitted to BATTERY_PRESETS.
 *
 * Same job as inverter-review.ts. A wrong seriesCount here would pick L15
 * on a 16-cell pack; a wrong recommendedChargeV would flatten the 54.5 vs
 * 56.8 disagreement the commissioning map exists to surface. These catch
 * TRANSCRIPTION errors — the wrong row, a 15S/16S slip, a charge voltage
 * copied off the inverter preset. They do not verify the datasheet is real
 * or current, and they are not a substitute for opening sourceUrl.
 *
 * The checks are physics-shaped. A LiFePO4 cell is ~3.2 V nominal; charge
 * sits near 3.4–3.45 V/cell; the damage ceiling is under ~3.65–3.70 V/cell.
 * Discharge cut-off is already near empty. Those relationships are fixed
 * even when the sheet never prints "16S".
 */

import type { BatteryPreset } from './battery-preset'
import type { ReviewFlag } from './battery-review'

export type { ReviewFlag }

/** Nominal volts per LiFePO4 cell. */
const LFP_NOMINAL_V = 3.2

export function reviewBatteryPreset(spec: BatteryPreset): ReviewFlag[] {
  const flags: ReviewFlag[] = []
  const name = `${spec.brand} ${spec.model}`

  const expectedKwh = (spec.voltage * spec.capacityAh) / 1000
  if (expectedKwh > 0) {
    const err = Math.abs(spec.capacityKwh - expectedKwh) / expectedKwh
    if (err > 0.05) {
      flags.push({
        code: 'capacity-math',
        severity: 'fail',
        message:
          `${name}: capacityKwh (${spec.capacityKwh}) does not match voltage × Ah ` +
          `(expected ≈${expectedKwh.toFixed(2)} kWh) — a row was probably read across.`,
      })
    }
  }

  if (spec.chemistry === 'lifepo4') {
    const implied = spec.seriesCount * LFP_NOMINAL_V
    const err = spec.voltage > 0 ? Math.abs(spec.voltage - implied) / spec.voltage : 1
    if (err > 0.05) {
      flags.push({
        code: 'series-count',
        severity: 'fail',
        message:
          `${name}: ${spec.seriesCount}S × 3.2 V is ${implied.toFixed(1)} V, not the labelled ` +
          `${spec.voltage} V. L15 on a 16-cell pack (or the reverse) is the slip this check exists for.`,
      })
    }
  }

  if (!(spec.recommendedChargeV < spec.chargeLimitV)) {
    flags.push({
      code: 'charge-order',
      severity: 'fail',
      message:
        `${name}: recommended charge (${spec.recommendedChargeV} V) is not below the ` +
        `charge limit (${spec.chargeLimitV} V). Those look swapped.`,
    })
  }

  if (!(spec.recommendedChargeV > spec.voltage)) {
    flags.push({
      code: 'charge-below-nominal',
      severity: 'fail',
      message:
        `${name}: recommended charge (${spec.recommendedChargeV} V) is not above the ` +
        `${spec.voltage} V nominal. A charge voltage at or below the label will not fill the pack.`,
    })
  }

  if (!(spec.dischargeCutoffV < spec.voltage)) {
    flags.push({
      code: 'discharge-above-nominal',
      severity: 'fail',
      message:
        `${name}: discharge cut-off (${spec.dischargeCutoffV} V) is not below the ` +
        `${spec.voltage} V nominal.`,
    })
  }

  if (spec.fullChargeV !== undefined) {
    if (!(spec.fullChargeV > spec.recommendedChargeV - 0.01 && spec.fullChargeV < spec.chargeLimitV)) {
      flags.push({
        code: 'full-charge-window',
        severity: 'warn',
        message:
          `${name}: full-charge judgment (${spec.fullChargeV} V) should sit between ` +
          `recommended charge and the charge limit.`,
      })
    }
  }

  if (!(spec.socMinPct < spec.socMaxPct)) {
    flags.push({
      code: 'soc-inverted',
      severity: 'fail',
      message: `${name}: SOC window ${spec.socMinPct}–${spec.socMaxPct}% is not a range.`,
    })
  }

  if (spec.chemistry === 'lifepo4' && (spec.socMinPct < 10 || spec.socMinPct > 30)) {
    flags.push({
      code: 'soc-floor',
      severity: 'warn',
      message:
        `${name}: a ${spec.socMinPct}% remaining floor is unusual for LiFePO4 ` +
        `(sheets typically say leave 10–30% in the tank).`,
    })
  }

  if (spec.chemistry === 'lifepo4' && (spec.cycleDodPct < 70 || spec.cycleDodPct > 100)) {
    flags.push({
      code: 'cycle-dod',
      severity: 'warn',
      message:
        `${name}: cycle-life DoD of ${spec.cycleDodPct}% is unusual for LiFePO4 ` +
        `(typically 70–100%).`,
    })
  }

  if (!(spec.standardChargeA <= spec.maxChargeA)) {
    flags.push({
      code: 'charge-current-order',
      severity: 'fail',
      message:
        `${name}: standard charge (${spec.standardChargeA} A) is above max charge ` +
        `(${spec.maxChargeA} A).`,
    })
  }

  if (!(spec.standardDischargeA <= spec.maxDischargeA)) {
    flags.push({
      code: 'discharge-current-order',
      severity: 'fail',
      message:
        `${name}: standard discharge (${spec.standardDischargeA} A) is above max ` +
        `(${spec.maxDischargeA} A).`,
    })
  }

  if (spec.chemistry === 'lifepo4' && spec.seriesCount > 0) {
    const recPerCell = spec.recommendedChargeV / spec.seriesCount
    if (recPerCell < 3.30 || recPerCell > 3.50) {
      flags.push({
        code: 'charge-per-cell',
        severity: 'fail',
        message:
          `${name}: ${spec.recommendedChargeV} V over ${spec.seriesCount}S is ` +
          `${recPerCell.toFixed(3)} V/cell. LiFePO4 recommended charge sits near 3.40–3.45 V/cell ` +
          `(54.5 V on 16S). 3.55 V/cell is the SPH L16 boost of 56.8 V, not this pack's sheet.`,
      })
    }

    const limitPerCell = spec.chargeLimitV / spec.seriesCount
    if (limitPerCell > 3.75) {
      flags.push({
        code: 'limit-per-cell',
        severity: 'fail',
        message:
          `${name}: charge limit ${spec.chargeLimitV} V is ${limitPerCell.toFixed(3)} V/cell, ` +
          `above ~3.65–3.70 V where an LFP cell is already in trouble.`,
      })
    }

    const cutPerCell = spec.dischargeCutoffV / spec.seriesCount
    if (cutPerCell > 3.0 || cutPerCell < 2.4) {
      flags.push({
        code: 'cutoff-per-cell',
        severity: 'warn',
        message:
          `${name}: discharge cut-off ${spec.dischargeCutoffV} V is ${cutPerCell.toFixed(3)} V/cell, ` +
          `outside the 2.5–2.8 V neighbourhood a LiFePO4 sheet usually prints.`,
      })
    }
  }

  if (spec.maxParallel < 1 || spec.maxParallel > 64) {
    flags.push({
      code: 'parallel-range',
      severity: 'warn',
      message: `${name}: maxParallel ${spec.maxParallel} is outside the usual 1–63.`,
    })
  }

  if (spec.chemistry === 'lifepo4' && spec.chargeMinC < -5) {
    flags.push({
      code: 'charge-frozen',
      severity: 'fail',
      message:
        `${name}: charge allowed down to ${spec.chargeMinC} °C. LiFePO4 must not be ` +
        `charged frozen — this looks like the discharge floor copied into the charge row.`,
    })
  }

  try {
    const url = new URL(spec.sourceUrl)
    if (url.protocol !== 'https:') {
      flags.push({
        code: 'source-insecure',
        severity: 'warn',
        message: `${name}: sourceUrl is not https.`,
      })
    }
  } catch {
    flags.push({
      code: 'source-url-invalid',
      severity: 'fail',
      message: `${name}: sourceUrl is not a valid URL.`,
    })
  }

  if (spec.comms.length === 0) {
    flags.push({
      code: 'comms-empty',
      severity: 'warn',
      message: `${name}: no comms ports recorded. The SOC items on a hybrid only work with a live BMS.`,
    })
  }

  return flags
}
