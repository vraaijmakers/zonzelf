'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Zap, Info, Wind, Camera, Loader2, Lock, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usePersistentState, publishLoadSummary, round2 } from '@/lib/calc-storage'

interface Appliance {
  id: number
  name: string
  watts: number
  hours: number
  qty: number
}

const PRESET_GROUPS = [
  {
    label: 'Lighting & fans',
    items: [
      { name: 'LED light bulb',     watts: 10,  hours: 5 },
      { name: 'LED tube light',     watts: 20,  hours: 6 },
      { name: 'Ceiling fan',        watts: 60,  hours: 8 },
      { name: 'Bathroom exhaust',   watts: 30,  hours: 2 },
    ],
  },
  {
    label: 'Cooling (A/C)',
    icon: 'ac',
    items: [
      { name: 'Window AC (5,000 BTU)',      watts: 450,  hours: 8 },
      { name: 'Window AC (8,000 BTU)',      watts: 700,  hours: 8 },
      { name: 'Window AC (12,000 BTU)',     watts: 1100, hours: 8 },
      { name: 'Portable AC (10,000 BTU)',   watts: 1000, hours: 8 },
      { name: 'Mini-split (9,000 BTU)',     watts: 860,  hours: 10 },
      { name: 'Mini-split (12,000 BTU)',    watts: 1100, hours: 10 },
      { name: 'Mini-split (18,000 BTU)',    watts: 1600, hours: 10 },
      { name: 'Mini-split (24,000 BTU)',    watts: 2100, hours: 10 },
      { name: 'Central AC (2 ton)',         watts: 2500, hours: 8 },
      { name: 'Central AC (3 ton)',         watts: 3500, hours: 8 },
      { name: 'Central AC (4 ton)',         watts: 4700, hours: 8 },
      { name: 'Central AC (5 ton)',         watts: 6000, hours: 8 },
      { name: 'Central AC (6 ton)',         watts: 7200, hours: 8 },
      { name: 'Central AC (7.5 ton)',       watts: 9000, hours: 8 },
    ],
  },
  {
    label: 'Kitchen',
    items: [
      { name: 'Mini fridge',        watts: 80,   hours: 24 },
      { name: 'Full-size fridge',   watts: 150,  hours: 24 },
      { name: 'Microwave',          watts: 1000, hours: 0.5 },
      { name: 'Coffee maker',       watts: 900,  hours: 0.25 },
      { name: 'Toaster',            watts: 850,  hours: 0.1 },
      { name: 'Induction cooktop',  watts: 1800, hours: 1 },
    ],
  },
  {
    label: 'Entertainment & office',
    items: [
      { name: 'TV (32")',           watts: 40,  hours: 4 },
      { name: 'TV (55")',           watts: 100, hours: 4 },
      { name: 'Laptop',             watts: 65,  hours: 6 },
      { name: 'Desktop PC',         watts: 200, hours: 4 },
      { name: 'Phone charger',      watts: 10,  hours: 2 },
      { name: 'Router / modem',     watts: 15,  hours: 24 },
    ],
  },
  {
    label: 'Water & utility',
    items: [
      { name: 'Water pump (small)', watts: 300, hours: 1 },
      { name: 'Water pump (1 HP)',  watts: 750, hours: 2 },
      { name: 'Washing machine',    watts: 500, hours: 1 },
      { name: 'Clothes dryer',      watts: 5000, hours: 0.75 },
      { name: 'Dishwasher',         watts: 1200, hours: 1 },
      { name: 'Water heater (elec)',watts: 4000, hours: 1 },
    ],
  },
  {
    label: 'Other',
    items: [
      { name: 'CPAP machine',       watts: 30,  hours: 8 },
      { name: 'Power tool (drill)', watts: 600, hours: 0.5 },
      { name: 'EV charger (L1)',    watts: 1400, hours: 6 },
      { name: 'EV charger (L2)',    watts: 7200, hours: 2 },
    ],
  },
]

// Flat list for type inference
const PRESETS = PRESET_GROUPS.flatMap(g => g.items)

const DEFAULT_APPLIANCES: Appliance[] = [
  { id: 1, name: 'LED light bulb', watts: 10, hours: 5, qty: 4 },
  { id: 2, name: 'Ceiling fan',    watts: 60, hours: 8, qty: 1 },
  { id: 3, name: 'Laptop',         watts: 65, hours: 6, qty: 1 },
  { id: 4, name: 'Mini fridge',    watts: 80, hours: 24, qty: 1 },
]

// Ids only have to be unique within the current list, which may have been
// restored from a previous session.
const nextIdFor = (rows: Appliance[]) =>
  rows.reduce((max, row) => Math.max(max, row.id), 0) + 1

export default function LoadCalculatorPage() {
  const [appliances, setAppliances, , clearAppliances] =
    usePersistentState<Appliance[]>('zonzelf:load:appliances', DEFAULT_APPLIANCES)
  const [efficiency, setEfficiency, , clearEfficiency] =
    usePersistentState('zonzelf:load:efficiency', 0.8)
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

  const addPreset = (preset: typeof PRESETS[0]) =>
    setAppliances(a => [...a, { id: nextIdFor(a), ...preset, qty: 1 }])

  const resetAll = () => {
    clearAppliances()
    clearEfficiency()
  }

  const update = (id: number, field: keyof Appliance, value: string | number) =>
    setAppliances(a => a.map(row => row.id === id ? { ...row, [field]: value } : row))

  const remove = (id: number) =>
    setAppliances(a => a.filter(row => row.id !== id))

  const totalWh = appliances.reduce((sum, a) => sum + a.watts * a.hours * a.qty, 0)
  const totalKwh = totalWh / 1000
  const adjustedKwh = totalKwh / efficiency

  // Publish the result so the battery and panel calculators can pick it up.
  useEffect(() => {
    publishLoadSummary({
      rawKwh: round2(totalKwh),
      efficiency,
      adjustedKwh: round2(adjustedKwh),
    })
  }, [totalKwh, efficiency, adjustedKwh])

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main table */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Appliance</th>
                      <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Watts</th>
                      <th className="text-right px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Hrs/day</th>
                      <th className="text-right px-3 py-3 font-medium text-gray-600">Qty</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Wh/day</th>
                      <th className="px-2 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {appliances.map((a, i) => {
                      const wh = a.watts * a.hours * a.qty
                      return (
                        <tr key={a.id} className={`border-b ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={a.name}
                              onChange={e => update(a.id, 'name', e.target.value)}
                              placeholder="Appliance name"
                              className="w-full text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-yellow-400 rounded px-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={a.watts || ''}
                              onChange={e => update(a.id, 'watts', parseFloat(e.target.value) || 0)}
                              className="w-16 text-right text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-yellow-400 rounded px-1"
                              min="0"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={a.hours || ''}
                              onChange={e => update(a.id, 'hours', parseFloat(e.target.value) || 0)}
                              className="w-16 text-right text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-yellow-400 rounded px-1"
                              min="0" max="24" step="0.5"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={a.qty || ''}
                              onChange={e => update(a.id, 'qty', parseInt(e.target.value) || 1)}
                              className="w-12 text-right text-sm bg-transparent border-0 outline-none focus:ring-1 focus:ring-yellow-400 rounded px-1"
                              min="1"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-gray-700 whitespace-nowrap">
                            {wh >= 1000
                              ? `${(wh / 1000).toFixed(2)} kWh`
                              : `${Math.round(wh)} Wh`}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleScanClick(a.id)}
                                title={isPro ? 'Scan appliance label' : 'Pro feature — scan label'}
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
                      <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700">
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
                <p className="text-xs text-gray-500">{Math.round(totalWh)} Wh</p>
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">System efficiency</p>
                  <span className="text-sm font-medium">{Math.round(efficiency * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.6" max="0.95" step="0.05"
                  value={efficiency}
                  onChange={e => setEfficiency(parseFloat(e.target.value))}
                  className="w-full accent-yellow-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Accounts for inverter losses, wiring, and battery inefficiency. 80% is a safe default.
                </p>
              </div>

              <div className="border-t pt-3 bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Adjusted daily need</p>
                <p className="text-3xl font-bold text-gray-900">{adjustedKwh.toFixed(2)} kWh</p>
                <p className="text-xs text-gray-500">Use this number for battery and panel sizing</p>
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
