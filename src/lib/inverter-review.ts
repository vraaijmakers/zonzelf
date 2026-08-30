/**
 * Sanity checks for an inverter spec before it is admitted to INVERTER_PRESETS.
 *
 * Same job as battery-review.ts, but the failure mode is worse. A wrong
 * capacity_kwh on a battery row misleads a purchase; a wrong pvMaxInputV here
 * is read straight into a protection-register output and can put a string over
 * an inverter's damage ceiling with the site's authority behind it.
 *
 * These catch TRANSCRIPTION errors — the wrong row copied out of a spec table,
 * two numbers swapped, a per-tracker figure entered as a total. They do not
 * verify the datasheet is real or current, and they are not a substitute for
 * opening sourceUrl and reading it.
 *
 * The checks are physics-shaped rather than statistical, because the
 * relationships between these numbers are fixed: the tracking window always
 * sits inside the absolute maximum, the window's floor is always below its
 * ceiling, and surge is never below continuous.
 */

import type { InverterSpec } from './inverter-sizing'
import type { ReviewFlag } from './battery-review'

export type { ReviewFlag }

/** Nominal DC pack voltages an off-grid unit is actually built for. */
const DC_FAMILIES = [12, 24, 48]

export function reviewInverterSpec(spec: InverterSpec): ReviewFlag[] {
  const flags: ReviewFlag[] = []
  const name = `${spec.brand} ${spec.model}`

  // The single most important invariant on the page. A tracking window that
  // reaches above the damage ceiling is not a spec, it is a swapped pair.
  if (spec.mpptMaxV > spec.pvMaxInputV) {
    flags.push({
      code: 'window-above-ceiling',
      severity: 'fail',
      message: `${name}: the MPPT window top (${spec.mpptMaxV}V) is above the maximum PV input (${spec.pvMaxInputV}V). No datasheet says this — check the two have not been swapped.`,
    })
  }

  if (spec.mpptMinV >= spec.mpptMaxV) {
    flags.push({
      code: 'window-inverted',
      severity: 'fail',
      message: `${name}: the MPPT window reads ${spec.mpptMinV}V–${spec.mpptMaxV}V, which is not a range. The two halves of "MPPT Operating Voltage Range" are probably reversed.`,
    })
  }

  if (spec.mpptStartV !== undefined && spec.mpptStartV > spec.mpptMaxV) {
    flags.push({
      code: 'start-above-window',
      severity: 'fail',
      message: `${name}: a start-up voltage of ${spec.mpptStartV}V is above the window it has to start into.`,
    })
  }

  if (spec.acSurgeW !== undefined && spec.acSurgeW < spec.acContinuousW) {
    flags.push({
      code: 'surge-below-continuous',
      severity: 'fail',
      message: `${name}: surge (${spec.acSurgeW}W) is below continuous (${spec.acContinuousW}W). Surge is typically about twice continuous — check the rows have not been read across.`,
    })
  }

  if (!DC_FAMILIES.includes(spec.dcSystemVoltage)) {
    flags.push({
      code: 'dc-family',
      severity: 'warn',
      message: `${name}: ${spec.dcSystemVoltage}V is not a standard 12/24/48V pack voltage — check this is the NOMINAL battery voltage and not one end of the operating range.`,
    })
  }

  // A per-tracker current entered as a total is the "22/22 A" mistake, and it
  // is silent: it just permits twice as many strings in parallel as it should.
  if (spec.pvMaxCurrentA > 60) {
    flags.push({
      code: 'pv-current-range',
      severity: 'warn',
      message: `${name}: ${spec.pvMaxCurrentA}A per tracker is unusually high — check this is the PER-TRACKER figure and not the sum across ${spec.mpptCount} trackers.`,
    })
  }

  // Almost every hybrid accepts more PV than it puts out; a unit that accepts
  // markedly less suggests the AC and PV rows were confused.
  if (spec.pvMaxPowerW < spec.acContinuousW * 0.8) {
    flags.push({
      code: 'pv-power-low',
      severity: 'warn',
      message: `${name}: a ${spec.pvMaxPowerW}W PV input on a ${spec.acContinuousW}W inverter is low — most units accept at least as much PV as they output.`,
    })
  }

  // The array cannot deliver more current than the trackers accept, so a PV
  // power rating far beyond what the window and current allow is suspicious.
  const ceilingW = spec.mpptMaxV * spec.pvMaxCurrentA * spec.mpptCount
  if (ceilingW > 0 && spec.pvMaxPowerW > ceilingW * 1.6) {
    flags.push({
      code: 'pv-power-unreachable',
      severity: 'warn',
      message: `${name}: ${spec.pvMaxPowerW}W of PV cannot be reached through ${spec.mpptCount} tracker(s) at ${spec.mpptMaxV}V and ${spec.pvMaxCurrentA}A (about ${Math.round(ceilingW)}W). One of those three is probably misread.`,
    })
  }

  if (spec.mpptCount < 1 || spec.mpptCount > 6) {
    flags.push({
      code: 'mppt-count',
      severity: 'warn',
      message: `${name}: ${spec.mpptCount} MPPT trackers is outside the usual 1–6.`,
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

  return flags
}
