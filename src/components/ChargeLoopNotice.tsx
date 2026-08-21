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
          Next,{' '}
          <Link href="/calculators/panels" className="underline hover:no-underline">
            size your solar panels
          </Link>
          . A battery that looks big enough can still run down if the panels cannot
          put back what you use each day.
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
          On a sunny day the panels make about {loop.estimatedDailyKwh.toFixed(1)} kWh,
          and you use {loop.dailyNeedKwh.toFixed(1)} kWh — it covers today with little
          left over. Extra panels (about 20–30%) help on cloudy stretches so the
          battery is not nibbled empty.
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 text-sm text-red-900 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
      <span>
        The panels make about {loop.estimatedDailyKwh.toFixed(1)} kWh a day, but you
        use {loop.dailyNeedKwh.toFixed(1)} kWh
        ({loop.shortfallKwh.toFixed(1)} kWh short). Extra battery days only delay
        the problem — the bank will still empty. Add panels or use less.{' '}
        <Link href="/calculators/panels" className="underline hover:no-underline">
          Open panel sizing
        </Link>
        .
      </span>
    </div>
  )
}
