'use client'

import Link from 'next/link'
import { usePersistentState } from '@/lib/calc-storage'
import CalculatorDisclaimer from '@/components/CalculatorDisclaimer'
import { Cable, Info, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// AWG specs: [awg, max_amps_chassis, max_amps_bundle, resistance_ohm_per_100ft]
// Resistance at 20°C copper, resistance per 100 feet (both ways = 200ft for round trip)
const AWG_TABLE: [number, number, number, number][] = [
  [20,  11,   7.5,  1.015],
  [18,  16,  10,    0.639],
  [16,  22,  13,    0.403],
  [14,  32,  17,    0.253],
  [12,  41,  23,    0.159],
  [10,  55,  33,    0.100],
  [8,   73,  46,    0.0628],
  [6,   101, 60,    0.0395],
  [4,   135, 80,    0.0249],
  [2,   181, 100,   0.0157],
  [1,   211, 125,   0.0125],
  [0,   245, 150,   0.00989],
  [-1,  283, 175,   0.00785],  // 00 (2/0)
  [-2,  328, 200,   0.00623],  // 000 (3/0)
  [-3,  380, 225,   0.00494],  // 0000 (4/0)
]

function awgLabel(awg: number) {
  if (awg === -1) return '2/0'
  if (awg === -2) return '3/0'
  if (awg === -3) return '4/0'
  if (awg === 0)  return '1/0'
  return `${awg}`
}

export default function AwgCalculatorPage() {
  const [amps, setAmps]           = usePersistentState('zonzelf:awg:amps', 30)
  const [lengthFt, setLengthFt]   = usePersistentState('zonzelf:awg:lengthFt', 10)
  const [useMetric, setUseMetric] = usePersistentState('zonzelf:awg:useMetric', false)
  const [voltage, setVoltage]     = usePersistentState('zonzelf:awg:voltage', 24)
  const [maxDrop, setMaxDrop]     = usePersistentState('zonzelf:awg:maxDrop', 3)  // % voltage drop

  const lengthDisplay = useMetric ? lengthFt * 0.3048 : lengthFt
  const lengthInFt    = useMetric ? (lengthDisplay as number) / 0.3048 : lengthFt

  // Round trip length
  const roundTripFt = lengthInFt * 2

  // Find minimum AWG based on ampacity AND voltage drop
  const results = AWG_TABLE.map(([awg, ampsChassis, , resistPer100ft]) => {
    const totalResistance = (resistPer100ft / 100) * roundTripFt
    const voltDrop        = amps * totalResistance
    const voltDropPct     = (voltDrop / voltage) * 100
    const powerLoss       = amps * voltDrop
    const meetsAmpacity   = ampsChassis >= amps
    const meetsDrop       = voltDropPct <= maxDrop
    return { awg, ampsChassis, resistPer100ft, voltDrop, voltDropPct, powerLoss, meetsAmpacity, meetsDrop }
  })

  const recommended = results.find(r => r.meetsAmpacity && r.meetsDrop)
  const minAmpacity = results.find(r => r.meetsAmpacity)

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/calculators" className="hover:underline">Calculators</Link>
          <span>›</span>
          <span>AWG Calculator</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Cable AWG Calculator</h1>
        <p className="text-gray-600">
          Enter your current, cable run length, and system voltage to find the right wire gauge.
          Uses <strong>one-way</strong> length — the calculator accounts for the full round trip.
        </p>
      </div>

      <CalculatorDisclaimer />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Current (amps)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number" value={amps}
                    onChange={e => setAmps(parseFloat(e.target.value) || 0)}
                    min="1" max="400"
                    className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="text-sm text-gray-500">A</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Use the maximum continuous current, not peak. For solar: panel Isc × 1.25 safety factor.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  One-way cable length
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={useMetric ? +(lengthFt * 0.3048).toFixed(1) : lengthFt}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0
                      setLengthFt(useMetric ? val / 0.3048 : val)
                    }}
                    min="0.5" step={useMetric ? 0.5 : 1}
                    className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <button
                    onClick={() => setUseMetric(!useMetric)}
                    className="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    {useMetric ? 'meters' : 'feet'} ↕
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  One-way only — e.g. panel to charge controller. The calculator doubles it for the return wire.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">System voltage</label>
                <div className="flex gap-2">
                  {[12, 24, 48, 120, 240].map(v => (
                    <button key={v} onClick={() => setVoltage(v)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        voltage === v ? 'bg-yellow-500 text-white border-yellow-500' : 'border-gray-200 hover:border-yellow-300'
                      }`}
                    >
                      {v}V
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Max allowed voltage drop: <span className="text-yellow-700">{maxDrop}%</span>
                </label>
                <input
                  type="range" min="1" max="5" step="0.5"
                  value={maxDrop}
                  onChange={e => setMaxDrop(parseFloat(e.target.value))}
                  className="w-full accent-yellow-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1% (critical)</span>
                  <span>3% (recommended)</span>
                  <span>5% (maximum)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AWG table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Voltage drop by gauge</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-500">
                      <th className="text-left px-4 py-2">AWG</th>
                      <th className="text-right px-3 py-2">Max A</th>
                      <th className="text-right px-3 py-2">V drop</th>
                      <th className="text-right px-4 py-2">% drop</th>
                      <th className="text-right px-4 py-2">W lost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.filter(r => r.awg <= 6).map(r => {
                      const isRecommended = recommended?.awg === r.awg
                      const tooThin = !r.meetsAmpacity
                      return (
                        <tr key={r.awg}
                          className={`border-b ${
                            isRecommended ? 'bg-green-50 font-medium' :
                            tooThin ? 'bg-red-50 opacity-50' : ''
                          }`}
                        >
                          <td className="px-4 py-2 font-mono">
                            {awgLabel(r.awg)}
                            {isRecommended && <span className="ml-2 text-green-600 text-xs">✓ recommended</span>}
                          </td>
                          <td className={`px-3 py-2 text-right ${tooThin ? 'text-red-500' : ''}`}>
                            {r.ampsChassis}A
                          </td>
                          <td className="px-3 py-2 text-right">{r.voltDrop.toFixed(2)}V</td>
                          <td className={`px-4 py-2 text-right ${r.voltDropPct > maxDrop ? 'text-orange-500' : 'text-green-600'}`}>
                            {r.voltDropPct.toFixed(1)}%
                          </td>
                          <td className="px-4 py-2 text-right">{r.powerLoss.toFixed(1)}W</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <Card className={`border-2 ${recommended ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Cable className="w-4 h-4" />
                Recommended gauge
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommended ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Use at minimum</p>
                    <p className="text-5xl font-bold text-green-700">AWG {awgLabel(recommended.awg)}</p>
                    <p className="text-sm text-gray-600 mt-1">Rated for {recommended.ampsChassis}A continuous</p>
                  </div>
                  <div className="border-t pt-3 text-xs space-y-1.5 text-gray-600">
                    <div className="flex justify-between">
                      <span>Voltage drop</span>
                      <span className="font-medium text-green-700">
                        {recommended.voltDrop.toFixed(2)}V ({recommended.voltDropPct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Power lost in cable</span>
                      <span className="font-medium">{recommended.powerLoss.toFixed(1)}W</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Round trip length</span>
                      <span className="font-medium">{Math.round(lengthInFt * 2)}ft ({(lengthInFt * 2 * 0.3048).toFixed(1)}m)</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-700">
                    No standard AWG meets both your ampacity and voltage drop requirements.
                    Consider splitting the load across two runs or reducing cable length.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {minAmpacity && recommended && minAmpacity.awg !== recommended.awg && (
            <Card className="border-blue-200">
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500 mb-1">Minimum by ampacity only (ignoring drop)</p>
                <p className="text-lg font-bold text-blue-700">AWG {awgLabel(minAmpacity.awg)}</p>
                <p className="text-xs text-gray-500">
                  Drop would be {minAmpacity.voltDropPct.toFixed(1)}% — above your {maxDrop}% limit.
                  Going up to AWG {awgLabel(recommended.awg)} fixes this.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2 text-xs text-gray-500">
                <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <p>
                  <strong className="text-gray-700">When in doubt, go thicker.</strong> A larger
                  cable runs cooler, wastes less energy, and gives headroom if you add loads later.
                  The extra cost of one gauge up is almost always worth it.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
