'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Sun, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  usePersistentState, useLoadSummary, useBatterySummary, publishPanelSummary, round2,
} from '@/lib/calc-storage'
import { energyChain, arrayWatts, panelCount, panelCountBand, surplusPercent, DEFAULTS as EFF } from '@/lib/system-efficiency'
import {
  PEAK_SUN_REGIONS, DEFAULT_ANNUAL, DEFAULT_WORST_MONTH,
  normalizePeakSun, regionForAnnual, regionForHours, seasonalRatio, worstMonthIsSunnier,
} from '@/lib/peak-sun'
import { rechargeCheck } from '@/lib/recharge'
import CalculatorChrome, { AnswerAnchor } from '@/components/calculators/CalculatorChrome'
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

  // Drives the sticky readout once the array card scrolls away. The two rows
  // are the whole point of this calculator — the annual average and the month
  // that actually decides the array — so they stay reachable from anywhere.
  const answerSummary = {
    headline: band && band.min !== band.max ? `${band.min}–${band.max} panels` : `${panelsNeeded} panels`,
    detail: `× ${panelWatt}W · ${sunHours}h peak sun`,
    rows: [
      {
        id: 'annual',
        label: `At the selected ${sunHours}h`,
        value: `${panelsAnnual} panels`,
        sub: `${panelsAnnual * panelWatt} W of array`,
      },
      {
        id: 'worst',
        label: worstMonthName ? `In ${worstMonthName}` : 'In the worst month',
        value: `${panelsWorst} panels`,
        sub: `${panelsWorst * panelWatt} W of array · ${worstHours}h peak sun`,
      },
    ],
  }

  return (
    <CalculatorChrome
      step="panels"
      title="Solar Panel Sizing"
      lede="How many panels do you need? The key variable is peak sun hours — the daily equivalent of full-strength sunlight at your location. Regional figures are annual averages; winter is a lot less."
      note={
        <>
          This sizes daily energy output (kWh) — not the charging current your panels deliver to
          the battery at any given moment. See{' '}
          <Link href="/guides/how-it-works" className="text-zon-gold-deep hover:underline">
            how a solar system actually works
          </Link>{' '}
          to see where that current fits in.
        </>
      }
      answer={answerSummary}
      actionSummary={
        <p className="flex items-baseline gap-2 text-sm text-zon-muted">
          Array
          <span className="font-bold tabular-nums text-zon-gold-deep">{answerSummary.headline}</span>
          <span>at {panelWatt}W each</span>
        </p>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="order-first min-w-0 space-y-4 lg:order-last">
          <AnswerAnchor>
            <div className="lg:sticky lg:top-32">
            <Card className="border-zon-gold-light bg-zon-gold-tint">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-zon-gold-deep" />
                    Array size
                  </span>
                  <RegisterBadge register="capacity" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-zon-muted uppercase tracking-wide mb-1">
                    {band && band.min !== band.max ? 'Panels needed (band)' : 'Panels needed'}
                  </p>
                  <p className="text-4xl font-bold text-zon-gold-deep">
                    {band && band.min !== band.max
                      ? `${band.min}–${band.max}`
                      : panelsNeeded}
                  </p>
                  <p className="text-sm text-zon-muted">
                    × {panelWatt}W panels
                    {ratio !== null && band && band.min !== band.max
                      ? ` · ${ratio.toFixed(1)}× more in ${worstMonthName}`
                      : ''}
                  </p>
                </div>

                <div className="border-t pt-3 text-xs text-zon-muted space-y-1">
                  <div className="flex justify-between">
                    <span>At the selected {sunHours}h</span>
                    <span className="font-medium text-zon-body">{panelsAnnual} × {panelWatt}W</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      {invertedSun
                        ? `At ${worstHours}h (sunnier, not winter)`
                        : `In ${worstMonthName} (${worstHours}h)`}
                    </span>
                    <span className="font-medium text-zon-body">{panelsWorst} × {panelWatt}W</span>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs text-zon-muted uppercase tracking-wide mb-1">
                    Array at the annual figure
                  </p>
                  <p className="text-2xl font-bold text-zon-ink">
                    {(installedWatts / 1000).toFixed(1)} kWp
                  </p>
                  <p className="text-xs text-zon-muted">{installedWatts.toLocaleString()} watts peak</p>
                </div>

                <div className="border-t pt-3">
                  {/* TOKEN GAP: --zon-green is oklch(0.72 …) — a state dot colour,
                      not a text colour; it fails contrast on paper. There is no
                      dark-green text token, and inventing a shade is a design
                      decision rather than a side effect of this change, so these
                      two stay green-700 until one is added. */}
                  <p className="text-xs text-zon-muted uppercase tracking-wide mb-1">Estimated daily output</p>
                  <p className="text-xl font-bold text-green-700">
                    {sunHours > 0 ? `${actualOutput.toFixed(1)} kWh` : '—'}
                  </p>
                  <p className="text-xs text-zon-muted">
                    at {sunHours}h annual · {Math.round(efficiency * 100)}% array ·{' '}
                    {Math.round(chain.batteryRoundTrip * 100)}% battery round trip ·{' '}
                    {Math.round(chain.inverter * 100)}% inverter
                  </p>
                </div>

                <div className="border-t pt-3 text-xs text-zon-muted space-y-1">
                  <div className="flex justify-between">
                    <span>Min array at annual</span>
                    <span className="font-medium text-zon-body">{Math.round(totalWattsNeeded)}W</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min array in {worstMonthName}</span>
                    <span className="font-medium text-zon-body">{Math.round(wattsWorst)}W</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Surplus vs target (annual)</span>
                    <span className={`font-medium ${surplus === null ? 'text-zon-muted' : surplus >= 0 ? 'text-green-700' : 'text-zon-body'}`}>
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
                <div className="flex gap-2 text-xs text-zon-muted">
                  <Info className="w-4 h-4 shrink-0 text-zon-blue mt-0.5" />
                  <p>
                    <strong className="text-zon-body">Oversizing is normal.</strong> Adding 20–30%
                    extra panel capacity is common — it compensates for cloudy days, shading,
                    panel aging, and high charge controller overhead. Sizing against the worst
                    month already does a lot of that work.
                  </p>
                </div>
              </CardContent>
            </Card>
            </div>
          </AnswerAnchor>
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-2">
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
                    className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                  />
                  <span className="text-sm text-zon-muted">kWh/day</span>
                  <Link href="/calculators/load" className="text-xs text-zon-gold-deep hover:underline ml-auto">
                    Calculate from appliances →
                  </Link>
                </div>
                {fromLoadCalc !== null && Math.abs(fromLoadCalc - dailyKwh) > 0.01 && (
                  <button
                    onClick={() => setDailyKwh(fromLoadCalc)}
                    className="mt-2 text-xs text-zon-gold-deep bg-zon-gold-tint border border-zon-gold-light rounded-full px-3 py-1 hover:bg-zon-gold-tint transition-colors"
                  >
                    Use {fromLoadCalc.toFixed(2)} kWh from your load calculator →
                  </button>
                )}
              </div>

              <div>
                <label htmlFor="panels-peak-sun" className="block text-sm font-medium mb-1">
                  Peak sun hours
                  <span className="ml-1 font-normal text-zon-muted text-xs">(annual average)</span>
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    id="panels-peak-sun"
                    type="number"
                    value={peakSun}
                    onChange={e => setPeakSun(normalizePeakSun(parseFloat(e.target.value)))}
                    step="0.1" min="0" max="12"
                    className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                  />
                  <span className="text-sm text-zon-muted">hours/day, annual</span>
                </div>
                <div className="bg-zon-rule-soft rounded-lg p-3">
                  <p className="text-xs font-medium text-zon-muted mb-2">
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
                            ? 'bg-zon-gold-tint text-zon-gold-deep font-medium'
                            : 'hover:bg-zon-rule-soft text-zon-body'
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
                  <span className="ml-1 font-normal text-zon-muted text-xs">
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
                    className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                  />
                  <span className="text-sm text-zon-muted">hours/day</span>
                  {worstHours > 0 && worstHours !== sunHours && (
                    <button
                      onClick={() => setPeakSun(worstHours)}
                      className="ml-auto text-xs text-zon-gold-deep bg-zon-gold-tint border border-zon-gold-light rounded-full px-3 py-1 hover:bg-zon-gold-tint transition-colors"
                    >
                      Size against {worstMonthName} ({worstHours}h) →
                    </button>
                  )}
                </div>
                <p className="text-xs text-zon-muted mt-1">
                  December in the Netherlands is closer to 1 hour, not the 2.5h annual figure.
                  An array sized only on the annual average is a summer array. These worst-month
                  numbers are starting points, not a site assessment.
                </p>
                {invertedSun && (
                  <p className="text-xs text-zon-body bg-zon-amber-tint border border-zon-amber-tint rounded-lg px-3 py-2 mt-2">
                    {worstHours}h is sunnier than the {sunHours}h annual figure, so it sizes a
                    smaller array, not a winter one. A worst month has <em>less</em> sun — for
                    5h annual, December in the US south is around 3–3.5h, not 6h.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="panels-efficiency" className="block text-sm font-medium mb-1">
                  Array losses
                  <span className="ml-1 font-normal text-zon-muted text-xs">{Math.round(efficiency * 100)}%</span>
                </label>
                <input
                  id="panels-efficiency"
                  type="range" min="0.6" max="0.95" step="0.05"
                  value={efficiency}
                  onChange={e => setEfficiency(parseFloat(e.target.value))}
                  className="w-full accent-zon-gold"
                />
                <p className="text-xs text-zon-muted">
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
                          ? 'bg-zon-gold text-zon-ink border-zon-gold'
                          : 'border-zon-rule hover:border-zon-gold-light'
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
                    className="w-20 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CalculatorChrome>
  )
}
