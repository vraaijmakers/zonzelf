import Link from 'next/link'
import { AlertTriangle, Info } from 'lucide-react'
import { chargeLoop } from '@/lib/calculators/charge-loop'

export default function ChargeLoopNotice({
  dailyNeedKwh,
  estimatedDailyKwh,
}: {
  dailyNeedKwh: number
  /** Null when the panel calculator has never been used. */
  estimatedDailyKwh: number | null
}) {
  if (dailyNeedKwh <= 0) return null

  if (estimatedDailyKwh == null) {
    return (
      <div className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 border rounded-lg px-4 py-3">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <span>
          Size your{' '}
          <Link href="/calculators/panels" className="underline hover:no-underline">
            panel array
          </Link>{' '}
          next — a bank that looks right can still empty if the array cannot replace
          today&apos;s draw in the available sun.
        </span>
      </div>
    )
  }

  const loop = chargeLoop({ dailyNeedKwh, estimatedDailyKwh })

  if (loop.coversWithMargin) return null

  if (loop.coversDaily) {
    return (
      <div className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <span>
          The array harvests about {loop.estimatedDailyKwh.toFixed(1)} kWh/day against a{' '}
          {loop.dailyNeedKwh.toFixed(1)} kWh daily need — it covers a sunny day with
          little spare. Off-grid builds usually add 20–30% extra panel so cloudy
          stretches do not drain the bank.
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 text-sm text-red-900 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
      <span>
        Charge-loop warning: the array harvests about {loop.estimatedDailyKwh.toFixed(1)} kWh/day
        but the bank is sized for {loop.dailyNeedKwh.toFixed(1)} kWh/day
        ({loop.shortfallKwh.toFixed(1)} kWh short). Days of autonomy only delay the
        empty — the bank will still trend down. Add panels or cut loads.{' '}
        <Link href="/calculators/panels" className="underline hover:no-underline">
          Open panel sizing
        </Link>
        .
      </span>
    </div>
  )
}
