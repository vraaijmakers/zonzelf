'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Battery, Info, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePersistentState, useLoadSummary, usePanelSummary, round2 } from '@/lib/calc-storage'
import CalculatorDisclaimer from '@/components/CalculatorDisclaimer'
import ChargeLoopNotice from '@/components/ChargeLoopNotice'
import { createClient } from '@/lib/supabase/client'
import {
  BATTERY_TYPES,
  lvdGuidance,
  sizeBatteryBank,
  voltageFamily,
  type BatteryChemistryId,
} from '@/lib/calculators/battery'

type BatteryModelMatch = {
  id: number
  brand: string
  model: string
  voltage: number
  capacity_ah: number
  capacity_kwh: number
  price_usd: number | null
  source_url: string
}



export default function BatterySizingPage() {
  const [savedKwh, setDailyKwh, kwhMeta] = usePersistentState('zonzelf:battery:dailyKwh', 3.5)
  const [days, setDays] = usePersistentState('zonzelf:battery:days', 2)
  const [voltage, setVoltage] = usePersistentState('zonzelf:battery:voltage', 24)
  const [selectedType, setSelectedType] = usePersistentState<BatteryChemistryId>('zonzelf:battery:type', 'lifepo4')
  const [showTypes, setShowTypes] = useState(false)

  const loadSummary = useLoadSummary()
  const panelSummary = usePanelSummary()
  // The battery bank has to cover losses, so this step uses the adjusted figure.
  // System efficiency is applied once on the load calculator — not again here.
  const fromLoadCalc = loadSummary ? round2(loadSummary.adjustedKwh) : null

  // Until this page has a saved value of its own, follow the load calculator.
  // Once the user edits the field (or clicks the chip below) their value wins,
  // and the chip is what offers them the newer load-calculator number.
  const dailyKwh = !kwhMeta.restored && fromLoadCalc !== null ? fromLoadCalc : savedKwh

  const battery = BATTERY_TYPES.find(b => b.id === selectedType) ?? BATTERY_TYPES[0]
  const family = voltageFamily(voltage)
  const lvd = lvdGuidance(battery.id, family)
  const { usableKwh, totalKwh, totalAh, usableAh } = sizeBatteryBank({
    dailyKwh,
    days,
    voltage,
    dod: battery.dod,
  })

  const [allModels, setAllModels] = useState<BatteryModelMatch[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    supabase
      .from('battery_models')
      .select('id, brand, model, voltage, capacity_ah, capacity_kwh, price_usd, source_url')
      .eq('chemistry', battery.id)
      .order('capacity_kwh', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('Failed to load battery models:', error.message)
        setAllModels(error ? [] : (data ?? []))
        setModelsLoading(false)
      })
    return () => { cancelled = true }
  }, [battery.id])

  const matchingModels = useMemo(
    () => allModels.filter(m => voltageFamily(m.voltage) === voltage),
    [allModels, voltage]
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/calculators" className="hover:underline">Calculators</Link>
          <span>›</span>
          <span>Battery Sizing</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Battery Bank Sizing</h1>
        <p className="text-gray-600">
          How much battery storage do you need? Enter your daily consumption, how many days
          of backup you want, and your battery chemistry.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This sizes storage capacity (kWh) — not the charging current from your panels or the
          cable/controller amp ratings. See{' '}
          <Link href="/guides/how-it-works" className="text-yellow-700 hover:underline">
            how a solar system actually works
          </Link>{' '}
          for how charging and supplying the house fit together.
        </p>
      </div>

      <CalculatorDisclaimer />

      <div className="mb-6">
        <ChargeLoopNotice
          dailyNeedKwh={dailyKwh}
          estimatedDailyKwh={panelSummary ? panelSummary.estimatedDailyKwh : null}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Inputs */}
          <Card>
            <CardContent className="pt-5 space-y-5">
              <div>
                <label htmlFor="battery-daily-kwh" className="block text-sm font-medium mb-1">
                  Daily energy consumption (kWh)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="battery-daily-kwh"
                    type="number"
                    value={dailyKwh}
                    onChange={e => setDailyKwh(parseFloat(e.target.value) || 0)}
                    step="0.1" min="0"
                    className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="text-sm text-gray-500">kWh/day (adjusted)</span>
                  <Link href="/calculators/load" className="text-xs text-yellow-700 hover:underline ml-auto">
                    Calculate from appliances →
                  </Link>
                </div>
                {fromLoadCalc !== null && Math.abs(fromLoadCalc - dailyKwh) > 0.01 && (
                  <button
                    onClick={() => setDailyKwh(fromLoadCalc)}
                    className="mt-2 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1 hover:bg-yellow-100 transition-colors"
                  >
                    Use {fromLoadCalc.toFixed(2)} kWh adjusted from your load calculator →
                  </button>
                )}
              </div>

              <div role="group" aria-labelledby="battery-days-label">
                <span id="battery-days-label" className="block text-sm font-medium mb-1">
                  Days of autonomy
                  <span className="ml-1 font-normal text-gray-400 text-xs">
                    (days to run without sun)
                  </span>
                </span>
                <div className="flex gap-2">
                  {[1, 2, 3, 5, 7].map(d => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      aria-pressed={days === d}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        days === d
                          ? 'bg-yellow-500 text-white border-yellow-500'
                          : 'border-gray-200 hover:border-yellow-300'
                      }`}
                    >
                      {d} {d === 1 ? 'day' : 'days'}
                    </button>
                  ))}
                  <label className="sr-only" htmlFor="battery-days-custom">Custom number of days</label>
                  <input
                    id="battery-days-custom"
                    type="number"
                    value={days}
                    onChange={e => setDays(parseInt(e.target.value) || 1)}
                    min="1" max="14"
                    className="w-16 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>

              <div role="group" aria-labelledby="battery-voltage-label">
                <span id="battery-voltage-label" className="block text-sm font-medium mb-1">System voltage</span>
                <div className="flex gap-2">
                  {[12, 24, 48].map(v => (
                    <button
                      key={v}
                      onClick={() => setVoltage(v)}
                      aria-pressed={voltage === v}
                      className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                        voltage === v
                          ? 'bg-yellow-500 text-white border-yellow-500'
                          : 'border-gray-200 hover:border-yellow-300'
                      }`}
                    >
                      {v}V
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  48V is recommended for systems above 2 kWh — lower current means thinner cables.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Battery type selector */}
          <Card>
            <CardHeader
              className="pb-2 cursor-pointer"
              onClick={() => setShowTypes(!showTypes)}
              role="button"
              tabIndex={0}
              aria-expanded={showTypes}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setShowTypes(!showTypes)
                }
              }}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Battery className="w-4 h-4 text-yellow-600" />
                  Battery chemistry: <span className="text-yellow-700">{battery.name}</span>
                </CardTitle>
                {showTypes ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </CardHeader>
            {showTypes && (
              <CardContent className="space-y-3">
                {BATTERY_TYPES.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setSelectedType(b.id); setShowTypes(false) }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedType === b.id
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{b.name}</span>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="secondary">DoD {Math.round(b.dod * 100)}%</Badge>
                        <Badge variant="secondary">{Math.round(b.roundTripEfficiency * 100)}% RT</Badge>
                        <Badge variant="secondary">{b.cycles} cycles</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">{b.notes}</p>
                  </button>
                ))}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Battery className="w-4 h-4 text-yellow-600" />
                Starting estimate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total capacity needed</p>
                <p className="text-2xl font-bold text-yellow-700">{totalKwh.toFixed(1)} kWh</p>
                <p className="text-sm text-gray-500">{Math.round(totalAh)} Ah at {voltage}V</p>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Usable capacity</p>
                <p className="text-xl font-bold text-gray-800">{usableKwh.toFixed(1)} kWh</p>
                <p className="text-xs text-gray-500">{Math.round(usableAh)} Ah usable ({Math.round(battery.dod * 100)}% DoD)</p>
              </div>

              <div className="border-t pt-3 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Daily use</span>
                  <span className="font-medium text-gray-700">{dailyKwh} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span>Days of autonomy</span>
                  <span className="font-medium text-gray-700">{days}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max depth of discharge</span>
                  <span className="font-medium text-gray-700">{Math.round(battery.dod * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>System voltage</span>
                  <span className="font-medium text-gray-700">{voltage}V</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2 text-xs text-gray-500">
                <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <p>
                  <strong className="text-gray-700">Inverter cutoff (rest voltage):</strong>{' '}
                  {lvd.preferSocMeter ? (
                    <>
                      Do not use a single voltage to enforce {Math.round(battery.dod * 100)}% DoD
                      on LiFePO4 — the curve is too flat. Use the BMS SoC% or a shunt. A rough
                      20% SoC rest floor is{' '}
                      <strong className="text-gray-700">
                        {lvd.restVolts.min.toFixed(1)}–{lvd.restVolts.max.toFixed(1)} V
                      </strong>{' '}
                      on a {family}V pack. 12.0 V on a 12 V LiFePO4 pack is near empty, not 80% DoD.
                    </>
                  ) : (
                    <>
                      Rest voltage at {Math.round(battery.dod * 100)}% DoD is about{' '}
                      <strong className="text-gray-700">
                        {lvd.restVolts.min.toFixed(1)}–{lvd.restVolts.max.toFixed(1)} V
                      </strong>{' '}
                      on a {family}V pack. Measure at rest. 11.8 V under load (12 V bank) is
                      already deeper than 50% DoD.
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Next step</p>
            <Link
              href="/calculators/panels"
              className="flex items-center justify-between p-3 rounded-lg border hover:border-yellow-400 hover:bg-yellow-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">Panel sizing →</p>
                <p className="text-xs text-gray-500">How many solar panels do you need?</p>
              </div>
              <Badge variant="secondary" className="text-xs">Step 3</Badge>
            </Link>
          </div>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Battery className="w-4 h-4 text-yellow-600" />
            Real battery models — {voltage}V {battery.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {modelsLoading ? (
            <p className="text-sm text-gray-400">Loading published battery models…</p>
          ) : matchingModels.length === 0 ? (
            <p className="text-sm text-gray-500">
              No published {voltage}V {battery.name} models yet — this list grows as scraped
              models are reviewed and published.
            </p>
          ) : (
            <div className="space-y-3">
              {matchingModels.map(m => {
                const units = Math.ceil(totalKwh / m.capacity_kwh)
                const totalPrice = m.price_usd != null ? units * m.price_usd : null
                return (
                  <div
                    key={m.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 rounded-lg border border-gray-200"
                  >
                    <div>
                      <a
                        href={m.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline inline-flex items-center gap-1"
                      >
                        {m.brand} {m.model}
                        <ExternalLink className="w-3 h-3 text-gray-400" aria-hidden="true" />
                      </a>
                      <p className="text-xs text-gray-500">
                        {m.voltage}V · {m.capacity_ah}Ah · {m.capacity_kwh} kWh each
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="secondary">You need {units}</Badge>
                      <span className="text-sm text-gray-600">
                        {totalPrice != null ? `~$${totalPrice.toLocaleString()}` : 'Price not published'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
