'use client'

import Link from 'next/link'
import { usePersistentState } from '@/lib/calc-storage'
import CalculatorDisclaimer from '@/components/CalculatorDisclaimer'
import { Cable, Info, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type AmpacityMode,
  awgLabel,
  evaluateAwgTable,
  minByAmpacity,
  recommendAwg,
} from '@/lib/calculators/awg'

export default function AwgCalculatorPage() {
  const [amps, setAmps]           = usePersistentState('zonzelf:awg:amps', 30)
  const [lengthFt, setLengthFt]   = usePersistentState('zonzelf:awg:lengthFt', 10)
  const [useMetric, setUseMetric] = usePersistentState('zonzelf:awg:useMetric', false)
  const [voltage, setVoltage]     = usePersistentState('zonzelf:awg:voltage', 24)
  const [maxDrop, setMaxDrop]     = usePersistentState('zonzelf:awg:maxDrop', 3)
  const [mode, setMode]           = usePersistentState<AmpacityMode>('zonzelf:awg:mode', 'conduit')

  const lengthDisplay = useMetric ? lengthFt * 0.3048 : lengthFt
  const lengthInFt    = useMetric ? (lengthDisplay as number) / 0.3048 : lengthFt

  const results = evaluateAwgTable({
    amps,
    oneWayFt: lengthInFt,
    voltage,
    maxDropPct: maxDrop,
    mode,
  })
  const recommended = recommendAwg(results)
  const minAmpacity = minByAmpacity(results)
  // Show every size that is a candidate in this mode (conduit hides 20/18/16).
  const visible = results.filter(r => mode === 'chassis' || r.conduitAmps != null)

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
          Enter your current, cable run length, and system voltage to find a starting wire
          gauge. Uses <strong>one-way</strong> length — the calculator accounts for the full
          round trip. Defaults to conservative in-wall / in-conduit ampacity, not chassis
          ratings.
        </p>
      </div>

      <CalculatorDisclaimer />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <div role="group" aria-labelledby="awg-mode-label">
                <span id="awg-mode-label" className="block text-sm font-medium mb-1">Ampacity table</span>
                <div className="flex gap-2">
                  {([
                    ['conduit', 'In-wall / conduit'],
                    ['chassis', 'Chassis / battery cable'],
                  ] as [AmpacityMode, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setMode(value)}
                      aria-pressed={mode === value}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        mode === value
                          ? 'bg-yellow-500 text-white border-yellow-500'
                          : 'border-gray-200 hover:border-yellow-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {mode === 'conduit'
                    ? 'NEC Table 310.16 (2020), 75°C copper column, ≤3 current-carrying conductors, 30°C ambient. Default — use this for anything in a wall, conduit, or loft. NEN 1010 / IEC 60364 use mm²: convert and verify locally.'
                    : 'SAE-style chassis ratings for short, well-ventilated DC runs (battery interconnects). Never use these for in-wall wiring — they will undersize the cable relative to building code.'}
                </p>
              </div>

              <div>
                <label htmlFor="awg-amps" className="block text-sm font-medium mb-1">Current (amps)</label>
                <div className="flex items-center gap-3">
                  <input
                    id="awg-amps"
                    type="number" value={amps}
                    onChange={e => setAmps(parseFloat(e.target.value) || 0)}
                    min="1" max="400"
                    className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <span className="text-sm text-gray-500">A</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Use the maximum continuous current, not peak. For solar: panel Isc × 1.25 safety factor
                  (NEC 690.8 language) — that 1.25 is on the current you type, not extra on the table.
                </p>
              </div>

              <div>
                <label htmlFor="awg-length" className="block text-sm font-medium mb-1">
                  One-way cable length
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="awg-length"
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
                    aria-label={`Switch to ${useMetric ? 'feet' : 'meters'}`}
                    className="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    {useMetric ? 'meters' : 'feet'} ↕
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  One-way only — e.g. panel to charge controller. The calculator doubles it for the return wire.
                </p>
              </div>

              <div role="group" aria-labelledby="awg-voltage-label">
                <span id="awg-voltage-label" className="block text-sm font-medium mb-1">System voltage</span>
                <div className="flex gap-2">
                  {[12, 24, 48, 120, 240].map(v => (
                    <button key={v} onClick={() => setVoltage(v)}
                      aria-pressed={voltage === v}
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
                <label htmlFor="awg-maxdrop" className="block text-sm font-medium mb-1">
                  Max allowed voltage drop: <span className="text-yellow-700">{maxDrop}%</span>
                </label>
                <input
                  id="awg-maxdrop"
                  type="range" min="1" max="5" step="0.5"
                  value={maxDrop}
                  onChange={e => setMaxDrop(parseFloat(e.target.value))}
                  className="w-full accent-yellow-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1% (critical)</span>
                  <span>3% (typical target)</span>
                  <span>5% (loose)</span>
                </div>
              </div>
            </CardContent>
          </Card>

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
                    {visible.map(r => {
                      const isPick = recommended?.awg === r.awg
                      const tooThin = !r.meetsAmpacity
                      const rating = mode === 'conduit' ? r.conduitAmps : r.chassisAmps
                      return (
                        <tr key={r.awg}
                          className={`border-b ${
                            isPick ? 'bg-yellow-50 font-medium' :
                            tooThin ? 'bg-red-50 opacity-50' : ''
                          }`}
                        >
                          <td className="px-4 py-2 font-mono">
                            {awgLabel(r.awg)}
                            {isPick && <span className="ml-2 text-gray-600 text-xs">← starting estimate</span>}
                          </td>
                          <td className={`px-3 py-2 text-right ${tooThin ? 'text-red-500' : ''}`}>
                            {rating}A
                          </td>
                          <td className="px-3 py-2 text-right">{r.voltDrop.toFixed(2)}V</td>
                          <td className={`px-4 py-2 text-right ${r.voltDropPct > maxDrop ? 'text-orange-500' : ''}`}>
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

        <div className="space-y-4">
          <Card className="border-2 border-yellow-200 bg-yellow-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Cable className="w-4 h-4" />
                Starting estimate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommended ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Thinnest gauge that meets both checks</p>
                    <p className="text-5xl font-bold text-gray-800">AWG {awgLabel(recommended.awg)}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {mode === 'conduit' ? recommended.conduitAmps : recommended.chassisAmps}A
                      {' '}{mode === 'conduit' ? 'NEC 75°C' : 'chassis'}
                    </p>
                  </div>
                  <div className="border-t pt-3 text-xs space-y-1.5 text-gray-600">
                    <div className="flex justify-between">
                      <span>Voltage drop</span>
                      <span className="font-medium">
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
                    No standard AWG in this table meets both ampacity and voltage drop.
                    Consider splitting the load across two runs, reducing length, or raising voltage.
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
                  Drop would be {minAmpacity.voltDropPct.toFixed(1)}% — above your {maxDrop}% target.
                  Going up to AWG {awgLabel(recommended.awg)} is the drop-limited estimate.
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
                  cable runs cooler and wastes less energy. The fuse or breaker must still
                  protect the wire — this table does not size overcurrent protection. Local
                  code (NEC, NEN 1010, IEC 60364) wins over this page.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
