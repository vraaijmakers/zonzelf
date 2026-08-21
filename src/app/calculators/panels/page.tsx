'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Sun, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePersistentState, useLoadSummary, publishPanelSummary, round2 } from '@/lib/calc-storage'
import CalculatorDisclaimer from '@/components/CalculatorDisclaimer'
import ChargeLoopNotice from '@/components/ChargeLoopNotice'
import { PANEL_SIZES, PEAK_SUN_EXAMPLES, sizePanelArray } from '@/lib/calculators/panels'

export default function PanelSizingPage() {
  const [savedKwh, setDailyKwh, kwhMeta] = usePersistentState('zonzelf:panels:dailyKwh', 3.5)
  const [peakSun, setPeakSun]            = usePersistentState('zonzelf:panels:peakSun', 3.0)
  const [useWorstMonth, setUseWorstMonth] = usePersistentState('zonzelf:panels:useWorstMonth', false)
  const [panelWatt, setPanelWatt]        = usePersistentState('zonzelf:panels:panelWatt', 400)

  const loadSummary = useLoadSummary()
  // Efficiency is applied once on the load calculator. This page consumes
  // the adjusted figure and does not apply a second loss factor.
  const fromLoadCalc = loadSummary ? round2(loadSummary.adjustedKwh) : null

  const dailyKwh = !kwhMeta.restored && fromLoadCalc !== null ? fromLoadCalc : savedKwh

  const sized = sizePanelArray({ dailyKwh, peakSun, panelWatt })
  const {
    totalWattsNeeded,
    panelsNeeded,
    arrayWp,
    estimatedDailyKwh: actualOutput,
    surplusPct,
  } = sized

  useEffect(() => {
    if (dailyKwh <= 0 || peakSun <= 0) return
    publishPanelSummary({
      dailyNeedKwh: round2(dailyKwh),
      peakSun,
      estimatedDailyKwh: round2(actualOutput),
      arrayWp,
    })
  }, [dailyKwh, peakSun, actualOutput, arrayWp])

  const matchingRegion = PEAK_SUN_EXAMPLES.find(
    ex => ex.annual === peakSun || ex.worst === peakSun
  )

  function selectRegion(annual: number, worst: number) {
    setPeakSun(useWorstMonth ? worst : annual)
  }

  function toggleWorstMonth() {
    const next = !useWorstMonth
    setUseWorstMonth(next)
    if (matchingRegion) {
      setPeakSun(next ? matchingRegion.worst : matchingRegion.annual)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/calculators" className="hover:underline">Calculators</Link>
          <span>›</span>
          <span>Panel Sizing</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Solar Panel Sizing</h1>
        <p className="text-gray-600">
          How many panels do you need? The key variable is <strong>peak sun hours</strong> —
          the daily equivalent of full-strength sunlight at your location. Regional figures
          below are <strong>annual averages</strong>; off-grid builds should size for the
          darkest month.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This sizes daily energy harvest (kWh) against the adjusted need from the load
          calculator — losses are not applied a second time. See{' '}
          <Link href="/guides/how-it-works" className="text-yellow-700 hover:underline">
            how a solar system actually works
          </Link>.
        </p>
      </div>

      <CalculatorDisclaimer />

      <div className="mb-6">
        <ChargeLoopNotice dailyNeedKwh={dailyKwh} estimatedDailyKwh={actualOutput} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <div>
                <label htmlFor="panels-daily-kwh" className="block text-sm font-medium mb-1">
                  Daily energy the system must deliver (kWh)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="panels-daily-kwh"
                    type="number"
                    value={dailyKwh}
                    onChange={e => setDailyKwh(parseFloat(e.target.value) || 0)}
                    step="0.1" min="0"
                    className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="text-sm text-gray-500">kWh/day</span>
                  <Link href="/calculators/load" className="text-xs text-yellow-700 hover:underline ml-auto">
                    Calculate from appliances →
                  </Link>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Use the load calculator&apos;s adjusted number (losses already included).
                  If you type a number here, it is treated as that generation target.
                </p>
                {fromLoadCalc !== null && Math.abs(fromLoadCalc - dailyKwh) > 0.01 && (
                  <button
                    onClick={() => setDailyKwh(fromLoadCalc)}
                    className="mt-2 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1 hover:bg-yellow-100 transition-colors"
                  >
                    Use {fromLoadCalc.toFixed(2)} kWh adjusted from your load calculator →
                  </button>
                )}
              </div>

              <div>
                <label htmlFor="panels-peak-sun" className="block text-sm font-medium mb-1">
                  Peak sun hours
                  <span className="ml-1 font-normal text-gray-400 text-xs">
                    ({useWorstMonth ? 'worst month' : 'annual average'} — hours of equivalent full sun per day)
                  </span>
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    id="panels-peak-sun"
                    type="number"
                    value={peakSun}
                    onChange={e => setPeakSun(parseFloat(e.target.value) || 0)}
                    step="0.1" min="0.5" max="8"
                    className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="text-sm text-gray-500">hours/day</span>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                  <input
                    type="checkbox"
                    checked={useWorstMonth}
                    onChange={toggleWorstMonth}
                    className="rounded border-gray-300 accent-yellow-500"
                  />
                  Size for the darkest month (safer for off-grid)
                </label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    {useWorstMonth ? 'Worst-month' : 'Annual average'} values by region
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {PEAK_SUN_EXAMPLES.map(ex => {
                      const hours = useWorstMonth ? ex.worst : ex.annual
                      const selected = peakSun === hours && matchingRegion?.region === ex.region
                      return (
                        <button
                          key={ex.region}
                          onClick={() => selectRegion(ex.annual, ex.worst)}
                          className={`text-left text-xs px-2 py-1.5 rounded transition-colors ${
                            selected
                              ? 'bg-yellow-100 text-yellow-800 font-medium'
                              : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          {ex.region}
                          <span className="float-right font-mono">{hours}h</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Annual averages hide winter. Netherlands ~2.5 h year-round is closer to 0.9 h
                    in December. These are typical figures, not a solar-resource dataset for
                    your roof.
                  </p>
                </div>
              </div>

              <div role="group" aria-labelledby="panels-wattage-label">
                <span id="panels-wattage-label" className="block text-sm font-medium mb-2">Panel wattage</span>
                <div className="flex flex-wrap gap-2">
                  {PANEL_SIZES.map(w => (
                    <button
                      key={w}
                      onClick={() => setPanelWatt(w)}
                      aria-pressed={panelWatt === w}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        panelWatt === w
                          ? 'bg-yellow-500 text-white border-yellow-500'
                          : 'border-gray-200 hover:border-yellow-300'
                      }`}
                    >
                      {w}W
                    </button>
                  ))}
                  <label className="sr-only" htmlFor="panels-wattage-custom">Custom panel wattage</label>
                  <input
                    id="panels-wattage-custom"
                    type="number"
                    value={panelWatt}
                    onChange={e => setPanelWatt(parseInt(e.target.value) || 100)}
                    min="10" max="700"
                    className="w-20 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sun className="w-4 h-4 text-yellow-600" />
                Starting estimate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Panels needed</p>
                <p className="text-4xl font-bold text-yellow-700">{panelsNeeded}</p>
                <p className="text-sm text-gray-500">× {panelWatt}W panels</p>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total array size</p>
                <p className="text-2xl font-bold text-gray-800">
                  {(arrayWp / 1000).toFixed(1)} kWp
                </p>
                <p className="text-xs text-gray-500">{arrayWp.toLocaleString()} watts peak</p>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Estimated daily harvest</p>
                <p className="text-xl font-bold text-gray-800">{actualOutput.toFixed(1)} kWh</p>
                <p className="text-xs text-gray-500">
                  at {peakSun}h peak sun · compared against the adjusted daily need
                </p>
              </div>

              <div className="border-t pt-3 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Min array needed</span>
                  <span className="font-medium text-gray-700">{Math.round(totalWattsNeeded)}W</span>
                </div>
                <div className="flex justify-between">
                  <span>Vs daily need</span>
                  <span className="font-medium text-gray-700">
                    {surplusPct == null
                      ? '—'
                      : `${surplusPct >= 0 ? '+' : ''}${surplusPct.toFixed(0)}%`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2 text-xs text-gray-500">
                <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <p>
                  <strong className="text-gray-700">Oversizing is normal.</strong> Adding 20–30%
                  extra panel capacity is common — it compensates for cloudy days, shading,
                  panel aging, and charge-controller overhead. Do not buy from this number
                  until you have checked roof space, inverter limits, and local code.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Also useful</p>
            <Link
              href="/calculators/awg"
              className="flex items-center justify-between p-3 rounded-lg border hover:border-yellow-400 hover:bg-yellow-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">AWG calculator →</p>
                <p className="text-xs text-gray-500">Size your cables correctly</p>
              </div>
              <Badge variant="secondary" className="text-xs">Step 4</Badge>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
