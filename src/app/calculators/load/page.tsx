'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Zap, Info, Wind, Camera, Loader2, Lock, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePersistentState, publishLoadSummary, round2 } from '@/lib/calc-storage'
import CalculatorDisclaimer from '@/components/CalculatorDisclaimer'
import {
  PRESET_GROUPS, rowDailyWh, totalDailyKwh, normalizeDuty, suggestedDuty, DUTY_CYCLE_SOURCE,
  breakdownByProfile, LOAD_PROFILES, DEFAULT_PROFILE, suggestedProfile,
  type Preset, type LoadProfile,
} from '@/lib/appliance-load'
import { energyChain, DEFAULTS as EFF } from '@/lib/system-efficiency'

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
  const chain = energyChain({ rawKwh: totalKwh, inverter: efficiency })
  const adjustedKwh = chain.fromBatteryKwh

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

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/calculators" className="hover:underline">Calculators</Link>
          <span>›</span>
          <span>Load Calculator</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Load Calculator</h1>
        <p className="text-gray-600">
          Add every appliance you want to run. The total daily kWh is the foundation
          for sizing your battery bank and solar panels.
        </p>
      </div>

      <CalculatorDisclaimer />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main table */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-3 py-3 font-medium text-gray-600">Appliance</th>
                      <th className="text-right px-2 py-3 font-medium text-gray-600 whitespace-nowrap">Watts</th>
                      <th className="text-right px-2 py-3 font-medium text-gray-600 whitespace-nowrap">Hrs</th>
                      <th className="text-left px-2 py-3 font-medium text-gray-600 whitespace-nowrap">Runs</th>
                      <th className="text-right px-2 py-3 font-medium text-gray-600 whitespace-nowrap">Duty</th>
                      <th className="text-right px-2 py-3 font-medium text-gray-600">Qty</th>
                      <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Wh/day</th>
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
                        <tr key={a.id} className={`border-b ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                          <td className="px-3 py-2 min-w-[8rem]">
                            <input
                              type="text"
                              value={a.name}
                              onChange={e => update(a.id, 'name', e.target.value)}
                              placeholder="Appliance name"
                              className="w-full text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-yellow-400 rounded px-1"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={a.watts || ''}
                              onChange={e => update(a.id, 'watts', parseFloat(e.target.value) || 0)}
                              aria-label={a.name ? `Watts for ${a.name}` : 'Watts'}
                              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-12 text-right text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-yellow-400 rounded px-1"
                              min="0"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={a.hours || ''}
                              onChange={e => update(a.id, 'hours', parseFloat(e.target.value) || 0)}
                              aria-label={a.name ? `Hours per day for ${a.name}` : 'Hours per day'}
                              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-12 text-right text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-yellow-400 rounded px-1"
                              min="0" max="24" step="0.5"
                            />
                          </td>
                          <td className="px-2 py-2">
                            {betterProfile !== undefined && (
                              <button
                                onClick={() => update(a.id, 'profile', betterProfile)}
                                title={LOAD_PROFILES[betterProfile].hint}
                                className="block text-xs text-yellow-700 underline decoration-dotted hover:no-underline"
                              >
                                use {LOAD_PROFILES[betterProfile].label}
                              </button>
                            )}
                            <select
                              value={a.profile ?? DEFAULT_PROFILE}
                              onChange={e => update(a.id, 'profile', e.target.value)}
                              aria-label={a.name ? `When ${a.name} runs` : 'When this runs'}
                              title={LOAD_PROFILES[a.profile ?? DEFAULT_PROFILE].hint}
                              className="text-xs bg-transparent border-0 outline-none focus:ring-1 focus:ring-yellow-400 rounded px-0 -ml-1 max-w-[4.75rem]"
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
                                className="block w-full text-right text-xs text-yellow-700 underline decoration-dotted hover:no-underline"
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
                              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-11 text-right text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-yellow-400 rounded px-1"
                              min="0" max="100" step="5"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={a.qty || ''}
                              onChange={e => update(a.id, 'qty', parseInt(e.target.value) || 1)}
                              aria-label={a.name ? `Quantity of ${a.name}` : 'Quantity'}
                              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-9 text-right text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-yellow-400 rounded px-1"
                              min="1"
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-700 whitespace-nowrap">
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
                                    ? 'text-gray-300 hover:text-blue-400'
                                    : 'text-gray-200 hover:text-yellow-500'
                                }`}
                                disabled={scanningId === a.id}
                              >
                                {scanningId === a.id
                                  ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                  : isPro
                                  ? <Camera className="w-4 h-4" />
                                  : <Lock className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => remove(a.id)}
                                aria-label={a.name ? `Remove ${a.name}` : 'Remove row'}
                                className="text-gray-300 hover:text-red-400 transition-colors"
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
                    <tr className="border-t-2 bg-yellow-50">
                      <td colSpan={6} className="px-4 py-3 font-semibold text-gray-700">
                        Total daily consumption
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-yellow-700 whitespace-nowrap">
                        {totalKwh.toFixed(2)} kWh
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="px-4 py-3 border-t text-xs text-gray-600 space-y-1">
                <p>
                  <strong className="text-gray-700">Duty %</strong> — how much of its
                  in-service hours an appliance actually draws power. A light bulb is 100%:
                  switched on, it draws its full watts. A fridge is not — its compressor
                  cycles against a thermostat and runs roughly a third of the time, so a
                  fridge plugged in for 24 hours is not drawing for 24 hours.
                </p>
                <p>
                  Watts stays the <em>running</em> figure, because that is what your inverter
                  has to supply. Duty % is what turns it into energy over a day.
                </p>
                <p className="text-gray-500">{DUTY_CYCLE_SOURCE}</p>
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
              className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add row
            </button>

            <button
              onClick={resetAll}
              title="Clear your list and start from the default appliances"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>

            {isPro ? (
              <button
                onClick={() => handleScanClick(addRow())}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Camera className="w-4 h-4" /> Scan label
              </button>
            ) : (
              <button
                onClick={() => setShowProPrompt(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg border-yellow-300 text-yellow-700 hover:bg-yellow-50 transition-colors"
              >
                <Camera className="w-4 h-4" />
                Scan label
                <span className="text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded-full font-medium">Pro</span>
              </button>
            )}
          </div>

          {/* Pro upsell modal */}
          {showProPrompt && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowProPrompt(false)}>
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-bold text-center mb-2">Label Scan — Pro Feature</h3>
                <p className="text-sm text-gray-600 text-center mb-4">
                  Walk around your home, photograph each appliance nameplate, and let ZonZelf read the wattage automatically — no guessing.
                </p>
                <ul className="text-sm text-gray-600 space-y-1.5 mb-5">
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Works on any appliance nameplate</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Reads BTU, SEER, amps×volts automatically</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Mobile camera or desktop upload</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Saves your load list to your project</li>
                </ul>
                <a
                  href="/auth/signup"
                  className="block w-full text-center bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  Create a free account
                </a>
                <button
                  onClick={() => setShowProPrompt(false)}
                  className="block w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3"
                >
                  Continue without scanning
                </button>
              </div>
            </div>
          )}

          {/* Presets grouped */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Quick add common appliances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {PRESET_GROUPS.map(group => (
                <div key={group.label}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5
                    ${group.icon === 'ac' ? 'text-blue-600' : 'text-gray-400'}`}>
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
                            ? 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                            : 'border-gray-200 hover:border-yellow-400 hover:bg-yellow-50'}`}
                      >
                        {p.name} <span className="text-gray-400">{p.watts >= 1000 ? `${(p.watts/1000).toFixed(1)}kW` : `${p.watts}W`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Results sidebar */}
        <div className="space-y-4">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-4 h-4 text-yellow-600" />
                Daily consumption
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Raw load</p>
                <p className="text-2xl font-bold text-yellow-700">{totalKwh.toFixed(2)} kWh</p>
                <p className="text-xs text-gray-500">{Math.round(totalKwh * 1000)} Wh</p>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Inverter &amp; wiring</p>
                  <span className="text-sm font-medium">{Math.round(efficiency * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.6" max="0.95" step="0.05"
                  value={efficiency}
                  onChange={e => setEfficiency(parseFloat(e.target.value))}
                  aria-label="Inverter and wiring efficiency"
                  className="w-full accent-yellow-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  DC to AC conversion and cable loss. Battery and panel losses are applied on their own pages, so they are not counted twice here.
                </p>
              </div>

              <div className="border-t pt-3 bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Battery must deliver</p>
                <p className="text-3xl font-bold text-gray-900">{adjustedKwh.toFixed(2)} kWh</p>
                <p className="text-xs text-gray-500">
                  What the bank has to supply each day, after inverter losses. Your panels
                  need more than this — they also pay battery round-trip and array losses,
                  which the panel calculator applies.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex gap-2 text-xs text-gray-500">
                <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <p>
                  <strong className="text-gray-700">Motor surge:</strong> Fridges, pumps, and A/C
                  compressors draw 2–3× their running watts at startup. Your inverter must handle
                  this peak — a 1,100W mini-split may surge to 3,000W+ for a few seconds.
                </p>
              </div>
              <div className="flex gap-2 text-xs text-gray-500 border-t pt-3">
                <Wind className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <p>
                  <strong className="text-gray-700">A/C in hot climates (Florida, Texas, SW US):</strong> Air
                  conditioning is typically 40–60% of total daily energy use in summer. A single
                  mini-split running 10 hrs/day adds 8–16 kWh — plan your battery and panel
                  array around this first, then add everything else.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Next step</p>
            <Link
              href="/calculators/battery"
              className="flex items-center justify-between p-3 rounded-lg border hover:border-yellow-400 hover:bg-yellow-50 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium">Battery sizing →</p>
                <p className="text-xs text-gray-500">How many kWh of storage do you need?</p>
              </div>
              <Badge variant="secondary" className="text-xs">Step 2</Badge>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
