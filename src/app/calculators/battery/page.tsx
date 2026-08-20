'use client'

import { useState } from 'react'
import { Battery, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const BATTERY_TYPES = [
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
  const [dailyKwh, setDailyKwh] = useState(3.5)
  const [days, setDays] = useState(2)
  const [voltage, setVoltage] = useState(24)
  const [selectedType, setSelectedType] = useState('lifepo4')
  const [showTypes, setShowTypes] = useState(false)

  const battery = BATTERY_TYPES.find(b => b.id === selectedType)!

  const usableKwh  = dailyKwh * days
  const totalKwh   = usableKwh / battery.dod
  const totalAh    = (totalKwh * 1000) / voltage
  const usableAh   = totalAh * battery.dod

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a href="/calculators" className="hover:underline">Calculators</a>
          <span>›</span>
          <span>Battery Sizing</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Battery Bank Sizing</h1>
        <p className="text-gray-600">
          How much battery storage do you need? Enter your daily consumption, how many days
          of backup you want, and your battery chemistry.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Inputs */}
          <Card>
            <CardContent className="pt-5 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Daily energy consumption (kWh)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={dailyKwh}
                    onChange={e => setDailyKwh(parseFloat(e.target.value) || 0)}
                    step="0.1" min="0"
                    className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="text-sm text-gray-500">kWh/day</span>
                  <a href="/calculators/load" className="text-xs text-yellow-700 hover:underline ml-auto">
                    Calculate from appliances →
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Days of autonomy
                  <span className="ml-1 font-normal text-gray-400 text-xs">
                    (days to run without sun)
                  </span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5, 7].map(d => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        days === d
                          ? 'bg-yellow-500 text-white border-yellow-500'
                          : 'border-gray-200 hover:border-yellow-300'
                      }`}
                    >
                      {d} {d === 1 ? 'day' : 'days'}
                    </button>
                  ))}
                  <input
                    type="number"
                    value={days}
                    onChange={e => setDays(parseInt(e.target.value) || 1)}
                    min="1" max="14"
                    className="w-16 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">System voltage</label>
                <div className="flex gap-2">
                  {[12, 24, 48].map(v => (
                    <button
                      key={v}
                      onClick={() => setVoltage(v)}
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
            <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowTypes(!showTypes)}>
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
                Recommended bank
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
                  <strong className="text-gray-700">Inverter cutoff:</strong> Set your low-voltage
                  disconnect to stop discharge at your DoD limit.
                  For {voltage}V {battery.name.split(' ')[0]}, that's typically{' '}
                  <strong className="text-gray-700">
                    {voltage === 12
                      ? battery.id === 'lifepo4' ? '12.0V' : '11.8V'
                      : voltage === 24
                      ? battery.id === 'lifepo4' ? '24.0V' : '23.6V'
                      : battery.id === 'lifepo4' ? '48.0V' : '47.2V'}
                  </strong>.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Next step</p>
            <a
              href="/calculators/panels"
              className="flex items-center justify-between p-3 rounded-lg border hover:border-yellow-400 hover:bg-yellow-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">Panel sizing →</p>
                <p className="text-xs text-gray-500">How many solar panels do you need?</p>
              </div>
              <Badge variant="secondary" className="text-xs">Step 3</Badge>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
