'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Battery, Info, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  usePersistentState, useLoadSummary, publishBatterySummary, round2,
} from '@/lib/calc-storage'
import {
  buildScenarios, scenarioRange, roundBank, defaultOvernightShare, type ScenarioId,
} from '@/lib/battery-scenarios'
import {
  overnightShareFrom, coolingShare, heatingShare, isCorrelatedRisk, normalizeBreakdown,
} from '@/lib/appliance-load'
import { CUTOFF_PROFILES, cutoffBand, formatBand, type ChemistryId } from '@/lib/battery-chemistry'
import CalculatorDisclaimer from '@/components/CalculatorDisclaimer'
import { createClient } from '@/lib/supabase/client'

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

// Real battery packs are 12.8V/25.6V/51.2V nominal, not the rounded 12/24/48
// the system-voltage picker above uses — bucket by family instead of an
// exact match, or every published row would silently never match.
function voltageFamily(v: number): 12 | 24 | 48 {
  if (v < 18) return 12
  if (v < 36) return 24
  return 48
}

interface BatteryType {
  id: ChemistryId
  name: string
  dod: number
  efficiency: number
  cycles: string
  color: string
  notes: string
}

const BATTERY_TYPES: BatteryType[] = [
  {
    id: 'lifepo4',
    name: 'LiFePO4 (Lithium)',
    dod: 0.8,
    efficiency: 0.97,
    cycles: '3,000–6,000',
    color: 'green',
    notes: 'Best choice for most off-grid systems. High DoD, long life, safe chemistry. Higher upfront cost.',
  },
  {
    id: 'agm',
    name: 'AGM (Sealed Lead-Acid)',
    dod: 0.5,
    efficiency: 0.85,
    cycles: '400–800',
    color: 'blue',
    notes: 'Reliable and widely available. Lower DoD means you need more capacity for the same usable energy.',
  },
  {
    id: 'gel',
    name: 'Gel (Sealed Lead-Acid)',
    dod: 0.5,
    efficiency: 0.85,
    cycles: '500–1,000',
    color: 'blue',
    notes: 'Similar to AGM but more tolerant of partial charge. Slightly better cycle life. Slower charge rate.',
  },
  {
    id: 'flooded',
    name: 'Flooded Lead-Acid (FLA)',
    dod: 0.5,
    efficiency: 0.80,
    cycles: '500–1,200',
    color: 'yellow',
    notes: 'Cheapest upfront. Requires regular maintenance (water topping). Must be vented. Often used in large off-grid systems.',
  },
]

export default function BatterySizingPage() {
  const [savedKwh, setDailyKwh, kwhMeta] = usePersistentState('zonzelf:battery:dailyKwh', 3.5)
  const [days, setDays] = usePersistentState('zonzelf:battery:days', 2)
  const [voltage, setVoltage] = usePersistentState('zonzelf:battery:voltage', 24)
  const [selectedType, setSelectedType] = usePersistentState('zonzelf:battery:type', 'lifepo4')
  const [showTypes, setShowTypes] = useState(false)
  // Which scenario the battery-model counts answer. Without this the list
  // silently answered the autonomy-days case only, so "how many do I need to
  // survive just the night" could not be asked.
  const [sizeFor, setSizeFor] = usePersistentState<ScenarioId>('zonzelf:battery:sizeFor', 'extended')
  // Overnight energy cannot be derived from the load calculator — it records
  // hours per day, never what time of day. So this is asked, not inferred.
  const [darkHours, setDarkHours] = usePersistentState<number>('zonzelf:battery:darkHours', 12)
  const [shareOverride, setShareOverride, shareMeta] =
    usePersistentState<number | null>('zonzelf:battery:overnightShare', null)
  // How much of a weather-driven load still runs when it is overcast. Asked,
  // not assumed: it depends on climate and on what the load actually is.
  const [overcastFactor, setOvercastFactor] =
    usePersistentState<number>('zonzelf:battery:overcastFactor', 0.4)
  // The mirror image: heating runs HARDER on a cold sunless day. Asked rather
  // than baked in, for the same reason the cooling factor is.
  const [coldFactor, setColdFactor] =
    usePersistentState<number>('zonzelf:battery:coldFactor', 1.5)

  const loadSummary = useLoadSummary()
  // The battery bank has to cover losses, so this step uses the adjusted figure.
  const fromLoadCalc = loadSummary ? round2(loadSummary.adjustedKwh) : null

  // Until this page has a saved value of its own, follow the load calculator.
  // Once the user edits the field (or clicks the chip below) their value wins,
  // and the chip is what offers them the newer load-calculator number.
  const dailyKwh = !kwhMeta.restored && fromLoadCalc !== null ? fromLoadCalc : savedKwh

  const battery = BATTERY_TYPES.find(b => b.id === selectedType) ?? BATTERY_TYPES[0]

  // The panel calculator needs the real round-trip figure; without this it has
  // to assume a conservative default. This is the field that was defined here
  // and never used.
  useEffect(() => {
    publishBatterySummary({
      chemistry: battery.id,
      roundTrip: battery.efficiency,
      dod: battery.dod,
    })
  }, [battery.id, battery.efficiency, battery.dod])

  // One shared model — src/lib/system-efficiency.ts. dailyKwh already carries
  // the inverter stage (it is what the load calculator publishes), so the chain
  // is entered with it as the battery's own delivery figure. Round-trip
  // efficiency belongs to the array, not the bank: the bank is sized by what it
  // must hand to the inverter.

  // Until the user overrides it, the overnight share follows the dark hours —
  // what you would get if consumption were spread evenly around the clock.
  // Derived from the per-appliance profiles when the load calculator has
  // published a breakdown — a flat share treats a fridge, an air conditioner
  // and a television as if they ran at the same times, which for a
  // cooling-dominated load is wrong in both directions.
  const breakdown = normalizeBreakdown(loadSummary?.breakdown)
  const derivedShare = breakdown
    ? overnightShareFrom(breakdown, darkHours)
    : defaultOvernightShare(darkHours)
  const cooling = breakdown ? coolingShare(breakdown) : 0
  const heating = breakdown ? heatingShare(breakdown) : 0
  const correlatedRisk = breakdown ? isCorrelatedRisk(breakdown) : false

  const overnightShare = shareMeta.restored && shareOverride !== null
    ? shareOverride
    : derivedShare

  const scenarios = buildScenarios({
    dailyDeliveredKwh: dailyKwh,
    overnightShare,
    overcastFactor,
    coolingShare: cooling,
    coldFactor,
    heatingShare: heating,
    autonomyDays: days,
    depthOfDischarge: battery.dod,
    systemVoltage: voltage,
  })
  const band = scenarioRange(scenarios)
  const chosen = scenarios.find(sc => sc.id === sizeFor) ?? scenarios[scenarios.length - 1]

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

              <div className="border-t pt-5 space-y-4">
                <div>
                  <label htmlFor="battery-dark-hours" className="block text-sm font-medium mb-1">
                    Hours of darkness
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="battery-dark-hours"
                      type="number" min="0" max="24" step="1"
                      value={darkHours}
                      onChange={e => setDarkHours(Math.min(24, Math.max(0, parseFloat(e.target.value) || 0)))}
                      className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                    <span className="text-sm text-gray-500">hours</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Sunset to sunrise, for the time of year you care about. This varies far more
                    than people expect — in the Netherlands it is about 8 hours in June and 16 in
                    December. Size on a summer night and December will disappoint you.
                  </p>
                </div>

                <div>
                  <label htmlFor="battery-overnight-share" className="block text-sm font-medium mb-1">
                    Share of daily use after dark:{' '}
                    <span className="text-yellow-700">{Math.round(overnightShare * 100)}%</span>
                  </label>
                  <input
                    id="battery-overnight-share"
                    type="range" min="0" max="100" step="5"
                    value={Math.round(overnightShare * 100)}
                    onChange={e => setShareOverride(parseFloat(e.target.value) / 100)}
                    className="w-full accent-yellow-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {breakdown ? (
                      <>
                        Worked out from what you listed on the load calculator and when each
                        appliance runs — {Math.round(derivedShare * 100)}% for {darkHours}h of dark.
                        Air conditioning barely runs at night; lighting and cooking mostly do.
                        Change it here if you know better.
                      </>
                    ) : (
                      <>
                        An assumption — no appliance list has been published yet, so this defaults
                        to the share you would get if use were spread evenly around the clock
                        ({Math.round(defaultOvernightShare(darkHours) * 100)}% for {darkHours}h of dark).
                        Use the load calculator and this is worked out from your actual appliances.
                      </>
                    )}
                    {shareMeta.restored && shareOverride !== null && (
                      <>
                        {' '}
                        <button
                          onClick={() => setShareOverride(null)}
                          className="underline decoration-dotted hover:no-underline text-yellow-700"
                        >
                          reset to {Math.round(defaultOvernightShare(darkHours) * 100)}%
                        </button>
                      </>
                    )}
                  </p>
                </div>

                {cooling > 0.01 && (
                  <div>
                    <label htmlFor="battery-overcast" className="block text-sm font-medium mb-1">
                      Weather-driven load on an overcast day:{' '}
                      <span className="text-yellow-700">{Math.round(overcastFactor * 100)}%</span>
                    </label>
                    <input
                      id="battery-overcast"
                      type="range" min="0" max="100" step="5"
                      value={Math.round(overcastFactor * 100)}
                      onChange={e => setOvercastFactor(parseFloat(e.target.value) / 100)}
                      className="w-full accent-yellow-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {Math.round(cooling * 100)}% of your daily use is cooling. A sunless day is sunless because it is overcast,
                      which usually means cooler — so that load runs less on exactly the days you
                      have least sun. Sizing a bank as if it ran flat out through three grey days
                      buys battery you will never use. Set this to 100% if your climate does not
                      work that way.
                    </p>
                  </div>
                )}

                {heating > 0.01 && (
                  <div>
                    <label htmlFor="battery-cold" className="block text-sm font-medium mb-1">
                      Heating load on a cold sunless day:{' '}
                      <span className="text-yellow-700">{Math.round(coldFactor * 100)}%</span>
                    </label>
                    <input
                      id="battery-cold"
                      type="range" min="100" max="300" step="10"
                      value={Math.round(coldFactor * 100)}
                      onChange={e => setColdFactor(parseFloat(e.target.value) / 100)}
                      className="w-full accent-yellow-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {Math.round(heating * 100)}% of your daily use is heating, and heating is
                      not cooling in reverse. It runs hardest through the coldest hours — at
                      night, with no sun — and it runs <em>more</em> on a cold grey day, not less.
                      So your demand rises exactly when your generation falls. 100% means the
                      weather makes no difference; 150% means half again as much on a bad day.
                    </p>
                  </div>
                )}
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
                How big a bank?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Depending on what you want it to survive
                </p>
                <p className="text-2xl font-bold text-yellow-700">
                  {roundBank(band.min)}–{roundBank(band.max)} kWh
                </p>
                <p className="text-sm text-gray-500">
                  {Math.round((band.min * 1000) / voltage)}–{Math.round((band.max * 1000) / voltage)} Ah
                  {' '}at {voltage}V · {Math.round(battery.dod * 100)}% DoD
                </p>
              </div>

              <div className="border-t pt-3 space-y-3">
                {scenarios.map(sc => (
                  <button
                    key={sc.id}
                    onClick={() => setSizeFor(sc.id)}
                    aria-pressed={sizeFor === sc.id}
                    className={`w-full text-left rounded-lg p-2 -mx-2 transition-colors ${
                      sizeFor === sc.id ? 'bg-yellow-100/70 ring-1 ring-yellow-300' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-gray-800">{sc.label}</span>
                      <span className="text-base font-bold text-gray-900 whitespace-nowrap tabular-nums">
                        {roundBank(sc.bankKwh)} kWh
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{sc.meaning}</p>
                    <p className="text-xs text-gray-400 tabular-nums">
                      delivers {sc.energyKwh.toFixed(1)} kWh · {Math.round(sc.bankAh)} Ah
                    </p>
                  </button>
                ))}
                <p className="text-xs text-gray-400 pt-1">
                  Pick one — the real battery models below are counted against it.
                </p>
                {correlatedRisk && (
                  <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <p className="text-xs text-orange-900 leading-relaxed">
                      <strong>Your worst weather and your highest demand arrive together.</strong>{' '}
                      A heating-dominated system has no slack in it: a cold, dark, still week is
                      maximum load and minimum generation at the same time. Size against the
                      multi-day figure, not the optimistic one — a cooling-dominated system in a
                      hot climate forgives an undersized bank, because grey days are also cool
                      days. This one does not.
                    </p>
                  </div>
                )}
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
                  <span>Used after dark</span>
                  <span className="font-medium text-gray-700">{Math.round(overnightShare * 100)}% of {darkHours}h</span>
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
                {CUTOFF_PROFILES[battery.id].voltageIsReliableProxy ? (
                  <p>
                    <strong className="text-gray-700">Inverter cutoff:</strong> {battery.name}
                    {' '}voltage sags close to linearly, so a resting reading is a usable clue.
                    At {voltage}V that&apos;s around{' '}
                    <strong className="text-gray-700">{formatBand(cutoffBand(battery.id, voltage as 12 | 24 | 48))}</strong>
                    {' '}<em>at rest</em> — nothing charging, nothing running. Under load the
                    voltage sags further, so copying this resting number straight into a live
                    cutoff will stop the inverter too late. Always confirm against the battery&apos;s
                    datasheet.
                  </p>
                ) : (
                  <p>
                    <strong className="text-gray-700">Inverter cutoff:</strong> {battery.name}
                    {' '}voltage barely moves until the pack is nearly empty — a single voltage
                    number can&apos;t reliably enforce an 80% DoD limit. Use the battery&apos;s
                    built-in manager (BMS) or a monitor that reports <strong className="text-gray-700">
                    percent remaining</strong> instead. If the inverter only has a voltage
                    setting, a rough &ldquo;everything off&rdquo; floor at {voltage}V is about{' '}
                    <strong className="text-gray-700">{formatBand(cutoffBand(battery.id, voltage as 12 | 24 | 48))}</strong>
                    {' '}— that is already close to empty, not 20% left.
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2 pl-6">
                <Link href="/guides/depth-of-discharge" className="hover:underline">
                  How deep can you drain a battery? →
                </Link>
              </p>
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
            <span className="block text-xs font-normal text-gray-500 mt-0.5">
              counted for <strong className="text-gray-700">{chosen.label.toLowerCase()}</strong> · {roundBank(chosen.bankKwh)} kWh
            </span>
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
                const units = Math.ceil(chosen.bankKwh / m.capacity_kwh)
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
