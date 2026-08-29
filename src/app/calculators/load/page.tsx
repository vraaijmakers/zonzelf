'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Zap, Info, Wind, Camera, Loader2, Lock, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePersistentState, publishLoadSummary, round2 } from '@/lib/calc-storage'
import CalculatorChrome, { AnswerAnchor } from '@/components/calculators/CalculatorChrome'
import { RegisterBadge } from '@/components/ProtectionOutput'
import {
  PRESET_GROUPS, rowDailyWh, totalDailyKwh, normalizeDuty, suggestedDuty, DUTY_CYCLE_SOURCE,
  breakdownByProfile, LOAD_PROFILES, DEFAULT_PROFILE, suggestedProfile,
  coolingShare, heatingShare,
  type Preset, type LoadProfile,
} from '@/lib/appliance-load'
import { energyChain, DEFAULTS as EFF } from '@/lib/system-efficiency'
import {
  weatherAdjustedDailyKwh, roundKwh,
  DEFAULT_OVERCAST_FACTOR, DEFAULT_COLD_FACTOR,
} from '@/lib/battery-scenarios'

interface Appliance {
  id: number
  name: string
  /** Draw while actually running, not the daily average. */
  watts: number
  /** Hours per day the appliance is in service. */
  hours: number
  qty: number
  /** Fraction of those hours it actually draws power. Absent means 100%. */
  duty?: number
  /** When it runs — drives the battery scenarios. Absent means all day. */
  profile?: LoadProfile
}

const DEFAULT_APPLIANCES: Appliance[] = [
  { id: 1, name: 'LED light bulb', watts: 10, hours: 5, qty: 4, profile: 'evening' },
  { id: 2, name: 'Ceiling fan',    watts: 60, hours: 8, qty: 1 },
  { id: 3, name: 'Laptop',         watts: 65, hours: 6, qty: 1 },
  { id: 4, name: 'Mini fridge',    watts: 80, hours: 24, qty: 1, duty: 0.30 },
]

// Ids only have to be unique within the current list, which may have been
// restored from a previous session.
const nextIdFor = (rows: Appliance[]) =>
  rows.reduce((max, row) => Math.max(max, row.id), 0) + 1

export default function LoadCalculatorPage() {
  const [appliances, setAppliances, , clearAppliances] =
    usePersistentState<Appliance[]>('zonzelf:load:appliances', DEFAULT_APPLIANCES)
  const [efficiency, setEfficiency, , clearEfficiency] =
    usePersistentState<number>('zonzelf:load:efficiency', EFF.inverter)
  const [scanningId, setScanningId] = useState<number | null>(null)
  const [showProPrompt, setShowProPrompt] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scanTargetId = useRef<number | null>(null)

  // Will be replaced with real session check once Supabase auth is wired up
  const isPro = false

  const handleScanClick = (id: number) => {
    if (!isPro) { setShowProPrompt(true); return }
    scanTargetId.current = id
    fileInputRef.current?.click()
  }

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const id = scanTargetId.current
    if (!file || !id) return
    e.target.value = ''

    setScanningId(id)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('/api/scan-label', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('scan failed')
      const data = await res.json()
      if (data.name)  update(id, 'name',  data.name)
      if (data.watts) update(id, 'watts', data.watts)
      if (data.hours) update(id, 'hours', data.hours)
    } catch {
      alert('Could not read label. Try a clearer photo of the nameplate.')
    } finally {
      setScanningId(null)
    }
  }

  const addRow = () => {
    const id = nextIdFor(appliances)
    setAppliances(a => [...a, { id, name: '', watts: 0, hours: 0, qty: 1 }])
    return id
  }

  const addPreset = (preset: Preset) =>
    setAppliances(a => [...a, {
      id: nextIdFor(a),
      name: preset.name,
      watts: preset.watts,
      hours: preset.hours,
      duty: preset.duty,
      profile: preset.profile,
      qty: 1,
    }])

  const resetAll = () => {
    clearAppliances()
    clearEfficiency()
  }

  const update = (id: number, field: keyof Appliance, value: string | number) =>
    setAppliances(a => a.map(row => row.id === id ? { ...row, [field]: value } : row))

  const remove = (id: number) =>
    setAppliances(a => a.filter(row => row.id !== id))

  const totalKwh = totalDailyKwh(appliances)
  // One shared model — see src/lib/system-efficiency.ts. This page owns the
  // inverter stage only; battery round-trip and array losses belong to the
  // pages that actually pay them.
  const breakdown = breakdownByProfile(appliances)
  const cooling = coolingShare(breakdown)
  const heating = heatingShare(breakdown)
  const greyKwh = weatherAdjustedDailyKwh({
    typicalKwh: totalKwh,
    coolingShare: cooling,
    heatingShare: heating,
    overcastFactor: DEFAULT_OVERCAST_FACTOR,
    coldFactor: DEFAULT_COLD_FACTOR,
  })
  const chain = energyChain({ rawKwh: totalKwh, inverter: efficiency })
  const greyChain = energyChain({ rawKwh: greyKwh, inverter: efficiency })
  const adjustedKwh = chain.fromBatteryKwh
  const loadMin = Math.min(totalKwh, greyKwh)
  const loadMax = Math.max(totalKwh, greyKwh)
  const deliverMin = Math.min(chain.fromBatteryKwh, greyChain.fromBatteryKwh)
  const deliverMax = Math.max(chain.fromBatteryKwh, greyChain.fromBatteryKwh)
  const loadSpreads = Math.abs(greyKwh - totalKwh) > 0.05 * Math.max(totalKwh, 0.01)

  // Publish the result so the battery and panel calculators can pick it up.
  useEffect(() => {
    publishLoadSummary({
      rawKwh: round2(totalKwh),
      efficiency,
      adjustedKwh: round2(adjustedKwh),
      breakdown: {
        always: round2(breakdown.always),
        daytime: round2(breakdown.daytime),
        evening: round2(breakdown.evening),
        cooling: round2(breakdown.cooling),
        heating: round2(breakdown.heating),
        total: round2(breakdown.total),
      },
    })
    // breakdown is derived from `appliances`, which totalKwh already tracks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalKwh, efficiency, adjustedKwh])

  // Drives the sticky readout once the consumption card scrolls away. Two rows
  // because this step produces two numbers people confuse: what the appliances
  // draw, and what the bank has to deliver after inverter losses.
  const answerSummary = {
    headline: loadSpreads
      ? `${roundKwh(loadMin)}–${roundKwh(loadMax)} kWh`
      : `${roundKwh(totalKwh)} kWh`,
    detail: loadSpreads ? 'a day, typical to grey' : 'a typical day',
    rows: [
      {
        id: 'appliances',
        label: 'What the appliances draw',
        value: `${roundKwh(totalKwh)} kWh`,
        sub: 'at the socket, before any losses',
      },
      {
        id: 'battery',
        label: 'What the bank must deliver',
        value: loadSpreads
          ? `${roundKwh(deliverMin)}–${roundKwh(deliverMax)} kWh`
          : `${roundKwh(adjustedKwh)} kWh`,
        sub: 'after inverter and wiring losses',
      },
    ],
  }

  return (
    <CalculatorChrome
      step="load"
      title="Load Calculator"
      lede="Add every appliance you want to run. Daily kWh is the foundation for sizing your battery bank and solar panels — shown as a band when weather moves the load, not as a number more precise than the inputs."
      answer={answerSummary}
      actionSummary={
        <p className="flex items-baseline gap-2 text-sm text-zon-muted">
          Daily load
          <span className="font-bold tabular-nums text-zon-gold-deep">{answerSummary.headline}</span>
          <span>{answerSummary.detail}</span>
        </p>
      }
    >
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Results — first on a phone, right-hand rail on a desktop */}
        <div className="order-first min-w-0 space-y-4 lg:order-last lg:col-span-2">
          <AnswerAnchor>
            <div className="lg:sticky lg:top-32 space-y-4">
            <Card className="border-zon-gold-light bg-zon-gold-tint">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-zon-gold-deep" />
                    Daily consumption
                  </span>
                  <RegisterBadge register="capacity" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-zon-muted uppercase tracking-wide mb-1">
                    {loadSpreads ? 'Daily load (band)' : 'Typical day'}
                  </p>
                  <p className="text-2xl font-bold text-zon-gold-deep">
                    {loadSpreads
                      ? `${roundKwh(loadMin)}–${roundKwh(loadMax)} kWh`
                      : `${roundKwh(totalKwh)} kWh`}
                  </p>
                  <p className="text-xs text-zon-muted">
                    {loadSpreads
                      ? `Typical ${roundKwh(totalKwh)} kWh · grey/cold day ${roundKwh(greyKwh)} kWh`
                      : `${Math.round(totalKwh * 1000)} Wh · duty-cycle estimate, not a measurement`}
                  </p>
                </div>
                {loadSpreads && (
                  <p className="text-xs text-zon-muted">
                    {heating > cooling
                      ? 'Heating runs harder on a cold grey day, so the top of the band is the day you actually care about.'
                      : 'Cooling runs less on an overcast day, so the bottom of the band is a grey day and the top is a typical one.'}
                  </p>
                )}

                <div className="border-t pt-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-zon-muted uppercase tracking-wide">Inverter &amp; wiring</p>
                    <span className="text-sm font-medium">{Math.round(efficiency * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.6" max="0.95" step="0.05"
                    value={efficiency}
                    onChange={e => setEfficiency(parseFloat(e.target.value))}
                    aria-label="Inverter and wiring efficiency"
                    className="w-full accent-zon-gold"
                  />
                  <p className="text-xs text-zon-muted mt-1">
                    DC to AC conversion and cable loss. Battery and panel losses are applied on their own pages, so they are not counted twice here.
                  </p>
                </div>

                <div className="border-t pt-3 bg-white rounded-lg p-3">
                  <p className="text-xs text-zon-muted uppercase tracking-wide mb-1">Battery must deliver</p>
                  <p className="text-3xl font-bold text-zon-ink">
                    {loadSpreads
                      ? `${roundKwh(deliverMin)}–${roundKwh(deliverMax)} kWh`
                      : `${roundKwh(adjustedKwh)} kWh`}
                  </p>
                  <p className="text-xs text-zon-muted">
                    What the bank has to supply each day, after inverter losses. Your panels
                    need more than this — they also pay battery round-trip and array losses,
                    which the panel calculator applies.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex gap-2 text-xs text-zon-muted">
                  <Info className="w-4 h-4 shrink-0 text-zon-blue mt-0.5" />
                  <p>
                    <strong className="text-zon-body">Motor surge:</strong> Fridges, pumps, and A/C
                    compressors draw 2–3× their running watts at startup. Your inverter must handle
                    this peak — a 1,100W mini-split may surge to 3,000W+ for a few seconds.
                  </p>
                </div>
                <div className="flex gap-2 text-xs text-zon-muted border-t pt-3">
                  <Wind className="w-4 h-4 shrink-0 text-zon-blue mt-0.5" />
                  <p>
                    <strong className="text-zon-body">A/C in hot climates (Florida, Texas, SW US):</strong> Air
                    conditioning is typically 40–60% of total daily energy use in summer. A single
                    mini-split running 10 hrs/day adds 8–16 kWh — plan your battery and panel
                    array around this first, then add everything else.
                  </p>
                </div>
              </CardContent>
            </Card>
            </div>
          </AnswerAnchor>
        </div>

        {/* The appliance table. min-w-0 is what makes its overflow-x-auto
            wrapper actually work: without it the grid column stretches to the
            table's min-content and scrolls the whole page sideways instead. */}
        <div className="min-w-0 space-y-4 lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-zon-rule-soft">
                      <th className="text-left px-3 py-3 font-medium text-zon-body">Appliance</th>
                      <th className="text-right px-2 py-3 font-medium text-zon-body whitespace-nowrap">Watts</th>
                      <th className="text-right px-2 py-3 font-medium text-zon-body whitespace-nowrap">Hrs</th>
                      <th className="text-left px-2 py-3 font-medium text-zon-body whitespace-nowrap">Runs</th>
                      <th className="text-right px-2 py-3 font-medium text-zon-body whitespace-nowrap">Duty</th>
                      <th className="text-right px-2 py-3 font-medium text-zon-body">Qty</th>
                      <th className="text-right px-3 py-3 font-medium text-zon-body whitespace-nowrap">Wh/day</th>
                      <th className="px-2 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {appliances.map((a, i) => {
                      const wh = rowDailyWh(a)
                      // A row saved before duty cycles existed, or left at 100%, when the
                      // preset of that name is a cycling load. Offered, never imposed.
                      const suggested = suggestedDuty(a.name)
                      // Same staleness as duty cycles: a row saved before cooling and
                      // heating were split keeps its old class, so its A/C is never
                      // suppressed on an overcast day.
                      const betterProfile = suggestedProfile(a.name, a.profile)
                      const stale = suggested !== undefined && normalizeDuty(a.duty) === 1
                        ? suggested
                        : undefined
                      return (
                        <tr key={a.id} className={`border-b ${i % 2 === 0 ? '' : 'bg-zon-rule-soft/50'}`}>
                          <td className="px-3 py-2 min-w-[8rem]">
                            <input
                              type="text"
                              value={a.name}
                              onChange={e => update(a.id, 'name', e.target.value)}
                              placeholder="Appliance name"
                              className="w-full text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-zon-gold-light rounded px-1"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={a.watts || ''}
                              onChange={e => update(a.id, 'watts', Math.max(0, parseFloat(e.target.value) || 0))}
                              aria-label={a.name ? `Watts for ${a.name}` : 'Watts'}
                              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-12 text-right text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-zon-gold-light rounded px-1"
                              min="0"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={a.hours || ''}
                              onChange={e => update(a.id, 'hours', Math.min(24, Math.max(0, parseFloat(e.target.value) || 0)))}
                              aria-label={a.name ? `Hours per day for ${a.name}` : 'Hours per day'}
                              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-12 text-right text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-zon-gold-light rounded px-1"
                              min="0" max="24" step="0.5"
                            />
                          </td>
                          <td className="px-2 py-2">
                            {betterProfile !== undefined && (
                              <button
                                onClick={() => update(a.id, 'profile', betterProfile)}
                                title={LOAD_PROFILES[betterProfile].hint}
                                className="block text-xs text-zon-gold-deep underline decoration-dotted hover:no-underline"
                              >
                                use {LOAD_PROFILES[betterProfile].label}
                              </button>
                            )}
                            <select
                              value={a.profile ?? DEFAULT_PROFILE}
                              onChange={e => update(a.id, 'profile', e.target.value)}
                              aria-label={a.name ? `When ${a.name} runs` : 'When this runs'}
                              title={LOAD_PROFILES[a.profile ?? DEFAULT_PROFILE].hint}
                              className="text-xs bg-transparent border-0 outline-none focus:ring-1 focus:ring-zon-gold-light rounded px-0 -ml-1 max-w-[4.75rem]"
                            >
                              {(Object.keys(LOAD_PROFILES) as LoadProfile[]).map(k => (
                                <option key={k} value={k}>{LOAD_PROFILES[k].label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            {stale !== undefined && (
                              <button
                                onClick={() => update(a.id, 'duty', stale)}
                                title={`${a.name} cycles on and off — use ${Math.round(stale * 100)}% instead of 100%`}
                                className="block w-full text-right text-xs text-zon-gold-deep underline decoration-dotted hover:no-underline"
                              >
                                use {Math.round(stale * 100)}%
                              </button>
                            )}
                            <input
                              type="number"
                              value={Math.round(normalizeDuty(a.duty) * 100)}
                              onChange={e => update(a.id, 'duty', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) / 100)}
                              aria-label={a.name ? `Duty cycle percent for ${a.name}` : 'Duty cycle percent'}
                              title="Percentage of its in-service hours this appliance actually draws power"
                              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-11 text-right text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-zon-gold-light rounded px-1"
                              min="0" max="100" step="5"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={a.qty || ''}
                              onChange={e => update(a.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                              onFocus={e => e.target.select()}
                              aria-label={a.name ? `Quantity of ${a.name}` : 'Quantity'}
                              className="w-14 text-right text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-zon-gold-light rounded px-1"
                              min="1"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-zon-body whitespace-nowrap">
                            {wh >= 1000
                              ? `${(wh / 1000).toFixed(2)} kWh`
                              : `${Math.round(wh)} Wh`}
                          </td>
                          <td className="px-1 py-2">
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleScanClick(a.id)}
                                title={isPro ? 'Scan appliance label' : 'Pro feature — scan label'}
                                aria-label={isPro ? 'Scan appliance label' : 'Pro feature — scan label'}
                                className={`transition-colors ${
                                  isPro
                                    ? 'text-zon-rule hover:text-zon-blue'
                                    : 'text-zon-rule hover:text-zon-gold'
                                }`}
                                disabled={scanningId === a.id}
                              >
                                {scanningId === a.id
                                  ? <Loader2 className="w-4 h-4 animate-spin text-zon-blue" />
                                  : isPro
                                  ? <Camera className="w-4 h-4" />
                                  : <Lock className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => remove(a.id)}
                                aria-label={a.name ? `Remove ${a.name}` : 'Remove row'}
                                className="text-zon-rule hover:text-zon-red transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-zon-gold-tint">
                      <td colSpan={6} className="px-4 py-3 font-semibold text-zon-body">
                        Total daily consumption
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-zon-gold-deep whitespace-nowrap">
                        {loadSpreads
                          ? `${roundKwh(loadMin)}–${roundKwh(loadMax)} kWh`
                          : `${roundKwh(totalKwh)} kWh`}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="px-4 py-3 border-t text-xs text-zon-body space-y-1">
                <p>
                  <strong className="text-zon-body">Duty %</strong> — how much of its
                  in-service hours an appliance actually draws power. A light bulb is 100%:
                  switched on, it draws its full watts. A fridge is not — its compressor
                  cycles against a thermostat and runs roughly a third of the time, so a
                  fridge plugged in for 24 hours is not drawing for 24 hours.
                </p>
                <p>
                  Watts stays the <em>running</em> figure, because that is what your inverter
                  has to supply. Duty % is what turns it into energy over a day.
                </p>
                <p className="text-zon-muted">{DUTY_CYCLE_SOURCE}</p>
              </div>
            </CardContent>
          </Card>

          {/* Hidden file input for label scanning */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleScanFile}
          />

          <div className="flex gap-2 items-center">
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-zon-rule-soft transition-colors"
            >
              <Plus className="w-4 h-4" /> Add row
            </button>

            <button
              onClick={resetAll}
              title="Clear your list and start from the default appliances"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-zon-muted border rounded-lg hover:bg-zon-rule-soft hover:text-zon-body transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>

            {isPro ? (
              <button
                onClick={() => handleScanClick(addRow())}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg border-zon-blue-tint text-zon-blue hover:bg-zon-blue-tint transition-colors"
              >
                <Camera className="w-4 h-4" /> Scan label
              </button>
            ) : (
              <button
                onClick={() => setShowProPrompt(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg border-zon-gold-light text-zon-gold-deep hover:bg-zon-gold-tint transition-colors"
              >
                <Camera className="w-4 h-4" />
                Scan label
                <span className="text-xs bg-zon-gold text-zon-ink px-1.5 py-0.5 rounded-full font-medium">Pro</span>
              </button>
            )}
          </div>

          {/* Pro upsell modal */}
          {showProPrompt && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowProPrompt(false)}>
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="w-12 h-12 bg-zon-gold-tint rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-6 h-6 text-zon-gold-deep" />
                </div>
                <h3 className="text-lg font-bold text-center mb-2">Label Scan — not available yet</h3>
                <p className="text-sm text-zon-body text-center mb-4">
                  The plan is to let you photograph each appliance nameplate and have ZonZelf read
                  the wattage off it. It is not finished, and accounts are not open, so there is
                  nothing to sign up for yet.
                </p>
                <p className="text-sm text-zon-body text-center mb-5">
                  Enter the wattage by hand for now — the presets below cover most appliances, and
                  the calculator does not need an account.
                </p>
                <button
                  onClick={() => setShowProPrompt(false)}
                  className="block w-full text-center bg-zon-gold hover:bg-zon-gold-deep text-zon-ink font-medium py-2.5 rounded-lg transition-colors"
                >
                  Continue without scanning
                </button>
              </div>
            </div>
          )}

          {/* Presets grouped */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zon-body">Quick add common appliances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {PRESET_GROUPS.map(group => (
                <div key={group.label}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5
                    ${group.icon === 'ac' ? 'text-zon-blue' : 'text-zon-muted'}`}>
                    {group.icon === 'ac' && <Wind className="w-3 h-3" />}
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map(p => (
                      <button
                        key={p.name}
                        onClick={() => addPreset(p)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                          ${group.icon === 'ac'
                            ? 'border-zon-blue-tint hover:border-zon-blue hover:bg-zon-blue-tint'
                            : 'border-zon-rule hover:border-zon-gold-light hover:bg-zon-gold-tint'}`}
                      >
                        {p.name} <span className="text-zon-muted">{p.watts >= 1000 ? `${(p.watts/1000).toFixed(1)}kW` : `${p.watts}W`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </CalculatorChrome>
  )
}
