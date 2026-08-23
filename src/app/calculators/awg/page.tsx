'use client'

import Link from 'next/link'
import { usePersistentState } from '@/lib/calc-storage'
import CalculatorDisclaimer from '@/components/CalculatorDisclaimer'
import { Info, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  evaluateGauges, passingGauges, thinnestByAmpacity,
  NEC_SOURCES, type TempColumn,
} from '@/lib/awg'

const TEMP_COLUMNS: { value: TempColumn; label: string; hint: string }[] = [
  { value: 60, label: '60 °C', hint: 'TW, UF — older or budget terminals' },
  { value: 75, label: '75 °C', hint: 'THW, THWN, XHHW — most equipment' },
  { value: 90, label: '90 °C', hint: 'THHN, XHHW-2 — only if every terminal is listed 90 °C' },
]

export default function AwgCalculatorPage() {
  const [amps, setAmps]           = usePersistentState('zonzelf:awg:amps', 30)
  const [lengthFt, setLengthFt]   = usePersistentState('zonzelf:awg:lengthFt', 10)
  const [useMetric, setUseMetric] = usePersistentState('zonzelf:awg:useMetric', false)
  const [voltage, setVoltage]     = usePersistentState('zonzelf:awg:voltage', 24)
  const [maxDrop, setMaxDrop]     = usePersistentState('zonzelf:awg:maxDrop', 3)
  const [column, setColumn]       = usePersistentState<TempColumn>('zonzelf:awg:tempColumn', 75)

  // lengthFt is always stored in feet; the metric toggle is display-only.
  const input = { amps, oneWayFeet: lengthFt, volts: voltage, maxDropPercent: maxDrop, column }

  const results   = evaluateGauges(input)
  const passing   = passingGauges(input)
  const thinnest  = passing[0]
  const byAmpsOnly = thinnestByAmpacity(input)
  const roundTripFt = lengthFt * 2
  const dropBudgetV = (voltage * maxDrop) / 100

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-zon-muted mb-2">
          <Link href="/calculators" className="hover:underline">Calculators</Link>
          <span>›</span>
          <span>AWG Calculator</span>
        </div>
        <h1 className="text-3xl font-bold mb-2 text-zon-ink">Cable AWG Calculator</h1>
        <p className="text-zon-body">
          Work out which cable sizes your run allows, and see exactly how each limit was
          worked out. Enter the <strong>one-way</strong> length — the return wire is added for you.
        </p>
      </div>

      <CalculatorDisclaimer />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardContent className="pt-5 space-y-5">
              <div>
                <label htmlFor="awg-amps" className="block text-sm font-medium mb-1 text-zon-ink">
                  Current (amps)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="awg-amps" type="number" value={amps}
                    onChange={e => setAmps(Math.max(0, parseFloat(e.target.value) || 0))}
                    min="1" max="400"
                    className="w-28 border border-zon-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                  />
                  <span className="text-sm text-zon-muted">A</span>
                </div>
                <p className="text-xs text-zon-muted mt-1">
                  The maximum continuous current, not the peak. For a solar array that is
                  short-circuit current (Isc) × 1.25.
                </p>
              </div>

              <div>
                <label htmlFor="awg-length" className="block text-sm font-medium mb-1 text-zon-ink">
                  One-way cable length
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="awg-length" type="number"
                    value={useMetric ? +(lengthFt * 0.3048).toFixed(1) : lengthFt}
                    onChange={e => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0)
                      setLengthFt(useMetric ? val / 0.3048 : val)
                    }}
                    min="0.5" step={useMetric ? 0.5 : 1}
                    className="w-28 border border-zon-rule rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                  />
                  <button
                    onClick={() => setUseMetric(!useMetric)}
                    aria-label={`Switch to ${useMetric ? 'feet' : 'meters'}`}
                    className="text-sm px-3 py-2 rounded-lg border border-zon-rule hover:bg-zon-cream transition-colors"
                  >
                    {useMetric ? 'meters' : 'feet'} ↕
                  </button>
                </div>
                <p className="text-xs text-zon-muted mt-1">
                  One way only — panel to charge controller, say. Doubled below for the return wire.
                </p>
              </div>

              <div role="group" aria-labelledby="awg-voltage-label">
                <span id="awg-voltage-label" className="block text-sm font-medium mb-1 text-zon-ink">
                  System voltage
                </span>
                <div className="flex gap-2 flex-wrap">
                  {[12, 24, 48, 120, 240].map(v => (
                    <button key={v} onClick={() => setVoltage(v)} aria-pressed={voltage === v}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        voltage === v
                          ? 'bg-zon-gold text-zon-ink border-zon-gold'
                          : 'border-zon-rule hover:border-zon-gold-light'
                      }`}
                    >
                      {v}V
                    </button>
                  ))}
                </div>
              </div>

              <div role="group" aria-labelledby="awg-temp-label">
                <span id="awg-temp-label" className="block text-sm font-medium mb-1 text-zon-ink">
                  Terminal temperature rating
                </span>
                <div className="flex gap-2 flex-wrap">
                  {TEMP_COLUMNS.map(t => (
                    <button key={t.value} onClick={() => setColumn(t.value)} aria-pressed={column === t.value}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        column === t.value
                          ? 'bg-zon-gold text-zon-ink border-zon-gold'
                          : 'border-zon-rule hover:border-zon-gold-light'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zon-muted mt-1">
                  {TEMP_COLUMNS.find(t => t.value === column)?.hint}. Your circuit is limited by
                  the <em>lowest-rated</em> connection in it — usually a breaker or a lug, not the
                  wire. Buying 90 °C cable does not move you to the 90 °C column on its own.
                </p>
              </div>

              <div>
                <label htmlFor="awg-maxdrop" className="block text-sm font-medium mb-1 text-zon-ink">
                  Voltage drop you will accept:{' '}
                  <span className="text-zon-gold-deep font-semibold">{maxDrop}%</span>
                </label>
                <input
                  id="awg-maxdrop" type="range" min="1" max="5" step="0.5" value={maxDrop}
                  onChange={e => setMaxDrop(parseFloat(e.target.value))}
                  className="w-full accent-zon-gold"
                />
                <div className="flex justify-between text-xs text-zon-muted mt-1">
                  <span>1% (critical runs)</span>
                  <span>3% (common choice)</span>
                  <span>5% (upper limit)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Full table — the derivation, not a sidebar detail */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zon-body">
                Every size, both limits
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <caption className="sr-only">
                    Ampacity and voltage drop for each cable size at your inputs
                  </caption>
                  <thead>
                    <tr className="border-b border-zon-rule bg-zon-cream text-zon-muted">
                      <th scope="col" className="text-left px-4 py-2">Size</th>
                      <th scope="col" className="text-right px-3 py-2">Carries</th>
                      <th scope="col" className="text-right px-3 py-2">V drop</th>
                      <th scope="col" className="text-right px-4 py-2">% drop</th>
                      <th scope="col" className="text-right px-4 py-2">W lost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.spec.awg} className="border-b border-zon-rule-soft">
                        <td className="px-4 py-2 font-mono text-zon-ink">
                          {r.label}
                          {thinnest?.spec.awg === r.spec.awg && (
                            <span className="ml-2 font-sans text-zon-gold-deep">thinnest that qualifies</span>
                          )}
                          {r.ocpdLimited && (
                            <span className="ml-2 text-zon-muted font-sans" title="Limited by NEC 240.4(D)">
                              capped
                            </span>
                          )}
                        </td>
                        <td className={`px-3 py-2 text-right tabular-nums ${r.meetsAmpacity ? 'text-zon-body' : 'text-zon-red'}`}>
                          {r.usableAmpacity}A
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-zon-body">{r.voltageDrop.toFixed(2)}V</td>
                        <td className={`px-4 py-2 text-right tabular-nums ${r.meetsVoltageDrop ? 'text-zon-body' : 'text-zon-amber'}`}>
                          {Number.isFinite(r.voltageDropPercent) ? `${r.voltageDropPercent.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-zon-body">{r.powerLossWatts.toFixed(1)}W</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-zon-rule text-xs text-zon-muted space-y-1">
                <p><strong className="text-zon-body">Carries</strong> — {NEC_SOURCES.ampacity}.</p>
                <p><strong className="text-zon-body">capped</strong> — {NEC_SOURCES.smallConductor}. This overrides the table.</p>
                <p>
                  Sizes thinner than 14 AWG are not in Table 310.16 and are not listed. Ambient
                  temperatures above 30 °C, and more than three current-carrying conductors in one
                  conduit, both <em>reduce</em> these figures — neither is applied here.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Derivation */}
        <div className="space-y-4">
          <Card className="border-zon-gold-light">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-zon-ink">What your inputs allow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {passing.length > 0 ? (
                <>
                  <div>
                    <p className="text-xs text-zon-muted uppercase tracking-wide mb-1">
                      Sizes meeting both limits
                    </p>
                    <p className="text-xl font-semibold text-zon-ink font-mono">
                      {passing.map(p => p.label).join(' · ')}
                    </p>
                    <p className="text-xs text-zon-muted mt-1">
                      Thinnest that qualifies is {thinnest.label}. Thicker is always electrically
                      safer — it runs cooler and wastes less.
                    </p>
                  </div>

                  <div className="border-t border-zon-rule pt-3 space-y-3 text-xs text-zon-body">
                    <div>
                      <p className="font-semibold text-zon-ink mb-1">1 · Can it carry the current?</p>
                      <p>
                        At {column} °C, {thinnest.label} is rated{' '}
                        <span className="tabular-nums">{thinnest.tableAmpacity}A</span>
                        {thinnest.ocpdLimited && (
                          <> but capped to <span className="tabular-nums">{thinnest.usableAmpacity}A</span> by the small-conductor rule</>
                        )}
                        . Your load is <span className="tabular-nums">{amps}A</span>.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-zon-ink mb-1">2 · Is the drop acceptable?</p>
                      <p>
                        {maxDrop}% of {voltage}V is a{' '}
                        <span className="tabular-nums">{dropBudgetV.toFixed(2)}V</span> budget.
                        {' '}{thinnest.label} over <span className="tabular-nums">{Math.round(roundTripFt)}ft</span>{' '}
                        of copper at <span className="tabular-nums">{amps}A</span> drops{' '}
                        <span className="tabular-nums">{thinnest.voltageDrop.toFixed(2)}V</span>{' '}
                        (<span className="tabular-nums">{thinnest.voltageDropPercent.toFixed(1)}%</span>).
                      </p>
                    </div>
                    <p className="text-zon-muted">
                      Round trip is {Math.round(roundTripFt)}ft ({(roundTripFt * 0.3048).toFixed(1)}m) —
                      current flows out and back, so a {Math.round(lengthFt)}ft run is twice that in copper.
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-zon-amber shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-zon-body">
                    No listed size meets both your current and your voltage-drop limit. Options:
                    split the load over two runs, shorten the run, raise the system voltage, or
                    accept a larger drop.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {byAmpsOnly && thinnest && byAmpsOnly.spec.awg !== thinnest.spec.awg && (
            <Card>
              <CardContent className="pt-4 text-xs">
                <p className="text-zon-muted mb-1">Which limit is binding?</p>
                <p className="text-zon-body">
                  On current alone, <span className="font-mono text-zon-ink">{byAmpsOnly.label}</span>{' '}
                  would do. Its drop would be{' '}
                  <span className="tabular-nums">{byAmpsOnly.voltageDropPercent.toFixed(1)}%</span>,
                  over your {maxDrop}% limit — so it is <strong>distance</strong>, not current,
                  pushing you to {thinnest.label}.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2 text-xs text-zon-body">
                <Info className="w-4 h-4 shrink-0 text-zon-blue mt-0.5" aria-hidden="true" />
                <p>
                  <strong className="text-zon-ink">A cable size is only half the job.</strong> The
                  fuse or breaker has to protect the wire — a correctly sized cable behind an
                  oversized breaker is still a fire risk. ZonZelf does not size overcurrent
                  protection yet. Check your local code, and have the design reviewed before you
                  build.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
