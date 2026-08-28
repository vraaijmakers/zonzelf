'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Sun, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  usePersistentState, useLoadSummary, useBatterySummary, publishPanelSummary, round2,
} from '@/lib/calc-storage'
import { energyChain, arrayWatts, panelCount, panelCountBand, surplusPercent, DEFAULTS as EFF } from '@/lib/system-efficiency'
import {
  PEAK_SUN_REGIONS, DEFAULT_ANNUAL, DEFAULT_WORST_MONTH,
  normalizePeakSun, regionForAnnual, regionForHours, seasonalRatio, worstMonthIsSunnier,
} from '@/lib/peak-sun'
import { rechargeCheck } from '@/lib/recharge'
import CalculatorDisclaimer from '@/components/CalculatorDisclaimer'
import RechargeWarning from '@/components/RechargeWarning'
import { RegisterBadge } from '@/components/ProtectionOutput'

const PANEL_SIZES = [100, 200, 300, 400, 410, 450, 500, 600]

export default function PanelSizingPage() {
  const [savedKwh, setDailyKwh, kwhMeta] = usePersistentState('zonzelf:panels:dailyKwh', 3.5)
  const [peakSun, setPeakSun]            = usePersistentState('zonzelf:panels:peakSun', DEFAULT_ANNUAL)
  const [savedWorst, setWorstMonth, worstMeta] = usePersistentState('zonzelf:panels:worstMonth', DEFAULT_WORST_MONTH)
  const [savedEff, setEfficiency] = usePersistentState<number>('zonzelf:panels:efficiency', EFF.array)
  const [panelWatt, setPanelWatt]        = usePersistentState('zonzelf:panels:panelWatt', 400)

  const loadSummary = useLoadSummary()
  // The chain starts from raw appliance consumption; every loss stage is applied
  // once, here, by energyChain. Feeding it the adjusted figure would double-count
  // the inverter.
  const fromLoadCalc = loadSummary ? round2(loadSummary.rawKwh) : null

  // Until this page has saved values of its own, follow the load calculator, so
  // both steps agree. Editing a field here takes over from then on.
  const dailyKwh = !kwhMeta.restored && fromLoadCalc !== null ? fromLoadCalc : savedKwh
  // Array derate is this page's own stage — it is NOT the load calculator's
  // inverter figure. Inheriting that number was part of the same-word-different-
  // meaning problem the shared model exists to remove.
  const efficiency = savedEff

  // One shared model — src/lib/system-efficiency.ts. The array pays every loss
  // in the chain, because the energy it generates is stored before it is used:
  // inverter, battery round trip, then the array's own derate. The old maths
  // omitted round trip entirely and so undersized the array — by ~3% for
  // lithium, ~25% for flooded lead-acid.
  const batterySummary = useBatterySummary()
  const chain = energyChain({
    rawKwh: dailyKwh,
    inverter: loadSummary?.efficiency,
    batteryRoundTrip: batterySummary?.roundTrip,
    array: efficiency,
  })
  const sunHours = normalizePeakSun(peakSun)
  // Until this page has a saved worst-month of its own, follow the region that
  // uniquely matches the annual figure — so a stored "Texas 5.5h" does not keep
  // Germany's 1h winter sitting next to it. 5.0h is Spain AND Florida, so it
  // does not infer.
  const inferredWorst = regionForAnnual(sunHours)?.worstMonth
  const worstMonth = !worstMeta.restored && inferredWorst !== undefined ? inferredWorst : savedWorst
  const worstHours = normalizePeakSun(worstMonth)
  const wattsAnnual = arrayWatts(chain.fromArrayKwh, sunHours)
  const wattsWorst = arrayWatts(chain.fromArrayKwh, worstHours)
  const panelsAnnual = panelCount(wattsAnnual, panelWatt)
  const panelsWorst = panelCount(wattsWorst, panelWatt)
  const band = panelCountBand(panelsAnnual, panelsWorst)
  // The working figure is whatever they typed or picked — usually annual.
  const totalWattsNeeded = wattsAnnual
  const panelsNeeded = panelsAnnual
  const installedWatts = panelsNeeded * panelWatt
  // Delivered at the socket, so it must unwind the same three losses.
  const actualOutput = installedWatts * sunHours
    * efficiency * chain.batteryRoundTrip * chain.inverter / 1000
  const surplus = surplusPercent(actualOutput, dailyKwh)
  const matchedRegion = regionForHours(sunHours, worstHours)
  const ratio = seasonalRatio(sunHours, worstHours)
  const invertedSun = worstMonthIsSunnier(sunHours, worstHours)
  const worstMonthName = matchedRegion?.worstMonthName
    ?? (invertedSun ? 'the other figure' : 'the lower-sun month')

  const annualRecharge = rechargeCheck({
    arrayWatts: installedWatts,
    peakSunHours: sunHours,
    arrayDerate: efficiency,
    fromBatteryKwh: chain.fromBatteryKwh,
    batteryRoundTrip: chain.batteryRoundTrip,
  })
  const worstRecharge = rechargeCheck({
    arrayWatts: installedWatts,
    peakSunHours: worstHours,
    arrayDerate: efficiency,
    fromBatteryKwh: chain.fromBatteryKwh,
    batteryRoundTrip: chain.batteryRoundTrip,
  })

  useEffect(() => {
    publishPanelSummary({
      peakSunHours: sunHours,
      worstMonthHours: worstHours,
      worstMonthName,
      arrayWatts: installedWatts,
      arrayDerate: efficiency,
      panelWatt,
      panels: panelsNeeded,
    })
  }, [sunHours, worstHours, worstMonthName, installedWatts, efficiency, panelWatt, panelsNeeded])

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
          the daily equivalent of full-strength sunlight at your location. Regional
          figures are <strong>annual averages</strong>; winter is a lot less.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This sizes daily energy output (kWh) — not the charging current your panels deliver to
          the battery at any given moment. See{' '}
          <Link href="/guides/how-it-works" className="text-yellow-700 hover:underline">
            how a solar system actually works
          </Link>{' '}
          to see where that current fits in.
        </p>
      </div>

      <CalculatorDisclaimer />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <div>
                <label htmlFor="panels-daily-kwh" className="block text-sm font-medium mb-1">
                  Daily energy need (kWh)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="panels-daily-kwh"
                    type="number"
                    value={dailyKwh}
                    onChange={e => setDailyKwh(Math.max(0, parseFloat(e.target.value) || 0))}
                    step="0.1" min="0"
                    className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="text-sm text-gray-500">kWh/day</span>
                  <Link href="/calculators/load" className="text-xs text-yellow-700 hover:underline ml-auto">
                    Calculate from appliances →
                  </Link>
                </div>
                {fromLoadCalc !== null && Math.abs(fromLoadCalc - dailyKwh) > 0.01 && (
                  <button
                    onClick={() => setDailyKwh(fromLoadCalc)}
                    className="mt-2 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1 hover:bg-yellow-100 transition-colors"
                  >
                    Use {fromLoadCalc.toFixed(2)} kWh from your load calculator →
                  </button>
                )}
              </div>

              <div>
                <label htmlFor="panels-peak-sun" className="block text-sm font-medium mb-1">
                  Peak sun hours
                  <span className="ml-1 font-normal text-gray-400 text-xs">(annual average)</span>
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    id="panels-peak-sun"
                    type="number"
                    value={peakSun}
                    onChange={e => setPeakSun(normalizePeakSun(parseFloat(e.target.value)))}
                    step="0.1" min="0" max="12"
                    className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="text-sm text-gray-500">hours/day, annual</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Common annual averages by region — not a site measurement, no tilt, no shading
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {PEAK_SUN_REGIONS.map(ex => (
                      <button
                        key={ex.region}
                        onClick={() => {
                          setPeakSun(ex.annual)
                          setWorstMonth(ex.worstMonth)
                        }}
                        className={`text-left text-xs px-2 py-1.5 rounded transition-colors ${
                          peakSun === ex.annual
                            ? 'bg-yellow-100 text-yellow-800 font-medium'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ex.region}
                        <span className="float-right font-mono">{ex.annual}h</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="panels-worst-month" className="block text-sm font-medium mb-1">
                  Worst-month peak sun hours
                  <span className="ml-1 font-normal text-gray-400 text-xs">
                    ({worstMonthName}{matchedRegion ? ` in ${matchedRegion.region}` : ''})
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="panels-worst-month"
                    type="number"
                    value={worstMonth}
                    onChange={e => setWorstMonth(normalizePeakSun(parseFloat(e.target.value)))}
                    step="0.1" min="0" max="12"
                    className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="text-sm text-gray-500">hours/day</span>
                  {worstHours > 0 && worstHours !== sunHours && (
                    <button
                      onClick={() => setPeakSun(worstHours)}
                      className="ml-auto text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1 hover:bg-yellow-100 transition-colors"
                    >
                      Size against {worstMonthName} ({worstHours}h) →
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  December in the Netherlands is closer to 1 hour, not the 2.5h annual figure.
                  An array sized only on the annual average is a summer array. These worst-month
                  numbers are starting points, not a site assessment.
                </p>
                {invertedSun && (
                  <p className="text-xs text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mt-2">
                    {worstHours}h is sunnier than the {sunHours}h annual figure, so it sizes a
                    smaller array, not a winter one. A worst month has <em>less</em> sun — for
                    5h annual, December in the US south is around 3–3.5h, not 6h.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="panels-efficiency" className="block text-sm font-medium mb-1">
                  Array losses
                  <span className="ml-1 font-normal text-gray-400 text-xs">{Math.round(efficiency * 100)}%</span>
                </label>
                <input
                  id="panels-efficiency"
                  type="range" min="0.6" max="0.95" step="0.05"
                  value={efficiency}
                  onChange={e => setEfficiency(parseFloat(e.target.value))}
                  className="w-full accent-yellow-500"
                />
                <p className="text-xs text-gray-400">
                  Soiling, cell temperature, MPPT conversion and array cabling. Inverter and battery losses are separate stages, applied once each — see the breakdown on the right.
                </p>
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
                    onChange={e => setPanelWatt(Math.min(700, Math.max(10, parseInt(e.target.value) || 100)))}
                    min="10" max="700"
                    className="w-20 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-600" />
                  Array size
                </span>
                <RegisterBadge register="capacity" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  {band && band.min !== band.max ? 'Panels needed (band)' : 'Panels needed'}
                </p>
                <p className="text-4xl font-bold text-yellow-700">
                  {band && band.min !== band.max
                    ? `${band.min}–${band.max}`
                    : panelsNeeded}
                </p>
                <p className="text-sm text-gray-500">
                  × {panelWatt}W panels
                  {ratio !== null && band && band.min !== band.max
                    ? ` · ${ratio.toFixed(1)}× more in ${worstMonthName}`
                    : ''}
                </p>
              </div>

              <div className="border-t pt-3 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>At the selected {sunHours}h</span>
                  <span className="font-medium text-gray-700">{panelsAnnual} × {panelWatt}W</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    {invertedSun
                      ? `At ${worstHours}h (sunnier, not winter)`
                      : `In ${worstMonthName} (${worstHours}h)`}
                  </span>
                  <span className="font-medium text-gray-700">{panelsWorst} × {panelWatt}W</span>
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Array at the annual figure
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  {(installedWatts / 1000).toFixed(1)} kWp
                </p>
                <p className="text-xs text-gray-500">{installedWatts.toLocaleString()} watts peak</p>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Estimated daily output</p>
                <p className="text-xl font-bold text-green-700">
                  {sunHours > 0 ? `${actualOutput.toFixed(1)} kWh` : '—'}
                </p>
                <p className="text-xs text-gray-500">
                  at {sunHours}h annual · {Math.round(efficiency * 100)}% array ·{' '}
                  {Math.round(chain.batteryRoundTrip * 100)}% battery round trip ·{' '}
                  {Math.round(chain.inverter * 100)}% inverter
                </p>
              </div>

              <div className="border-t pt-3 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Min array at annual</span>
                  <span className="font-medium text-gray-700">{Math.round(totalWattsNeeded)}W</span>
                </div>
                <div className="flex justify-between">
                  <span>Min array in {worstMonthName}</span>
                  <span className="font-medium text-gray-700">{Math.round(wattsWorst)}W</span>
                </div>
                <div className="flex justify-between">
                  <span>Surplus vs target (annual)</span>
                  <span className={`font-medium ${surplus === null ? 'text-gray-500' : surplus >= 0 ? 'text-green-700' : 'text-orange-700'}`}>
                    {surplus === null ? '—' : `${surplus >= 0 ? '+' : ''}${surplus.toFixed(0)}%`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <RechargeWarning
            annual={annualRecharge}
            worst={worstRecharge}
            worstMonthName={worstMonthName}
            annualHours={sunHours}
            worstHours={worstHours}
          />

          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2 text-xs text-gray-500">
                <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <p>
                  <strong className="text-gray-700">Oversizing is normal.</strong> Adding 20–30%
                  extra panel capacity is common — it compensates for cloudy days, shading,
                  panel aging, and high charge controller overhead. Sizing against the worst
                  month already does a lot of that work.
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
