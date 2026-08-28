import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { RechargeResult } from '@/lib/recharge'

/**
 * Cross-stage check: does this array put back what the battery hands the
 * inverter, at the annual figure AND in the worst month?
 *
 * Shown on the panel page (where both numbers live) and on the battery page
 * once a panel sizing has been published. Capacity-register output — a miss
 * means an undersized system, not an injury — so the copy is direct.
 */
export default function RechargeWarning({
  annual,
  worst,
  worstMonthName,
  annualHours,
  worstHours,
}: {
  annual: RechargeResult
  worst: RechargeResult
  worstMonthName: string
  annualHours: number
  worstHours: number
}) {
  const pct = (r: RechargeResult) => `${Math.round(r.ratio * 100)}%`

  if (!annual.closes) {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
        <div className="flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-orange-500 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-orange-900 leading-relaxed">
            <strong>This array does not refill the bank, even on an average day.</strong>{' '}
            At {annualHours}h of sun it generates {annual.generatedKwh.toFixed(1)} kWh
            after array losses, which is {pct(annual)} of the {annual.intoBatteryKwh.toFixed(1)} kWh
            the battery needs back. You will draw the bank down every day the sun is
            typical or worse. Add panels, or cut the load.
          </p>
        </div>
      </div>
    )
  }

  if (!worst.closes) {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
        <div className="flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-orange-500 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-orange-900 leading-relaxed">
            <strong>This array refills the bank on an average day, but not in {worstMonthName}.</strong>{' '}
            At {annualHours}h it covers the daily draw ({pct(annual)}). At {worstHours}h
            in {worstMonthName} it only covers {pct(worst)} — a shortfall of{' '}
            {worst.shortfallKwh.toFixed(1)} kWh/day. The bank will trend empty through
            winter unless you size against the worst month, add a generator, or
            accept running lean.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
      <div className="flex gap-2">
        <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-green-900 leading-relaxed">
          This array refills the bank at the annual average ({annualHours}h) and in{' '}
          {worstMonthName} ({worstHours}h). Daily generation covers daily use; the
          battery is the buffer, not a bucket that has to be filled from empty
          every morning.
        </p>
      </div>
    </div>
  )
}
