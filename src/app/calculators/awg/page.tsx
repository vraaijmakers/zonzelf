'use client'

import {
  usePersistentState, useInverterSummary, useArraySummary, useLoadSummary,
} from '@/lib/calc-storage'
import {
  resolveRuns, combinerAdvice, mpptArrival, looksLikeBatteryVoltage, type RunId,
} from '@/lib/circuit-runs'
import { COPPER_ONLY_HEADLINE, CCA_WARNING } from '@/lib/conductor-material'
import Link from 'next/link'
import CalculatorChrome, { AnswerAnchor } from '@/components/calculators/CalculatorChrome'
import { Info, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  evaluateGauges, passingGauges, thinnestByAmpacity,
  conductorProtectionView, NEC_SOURCES, type TempColumn,
} from '@/lib/awg'
import { awgLabel } from '@/lib/awg'
import {
  sizeOvercurrent, thinnestProtectableAwg, ocpdProtectionView,
  DC_RATING_WARNING, type CircuitKind,
} from '@/lib/overcurrent'
import ProtectionOutput, { RegisterBadge } from '@/components/ProtectionOutput'

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
  const [kind, setKind]           = usePersistentState<CircuitKind>('zonzelf:awg:circuitKind', 'general')
  const [runId, setRunId]         = usePersistentState<RunId | ''>('zonzelf:awg:runId', '')

  // The page used to ask for a naked current with no indication of which cable
  // it was sizing. The chain already knows most of these, so it offers them.
  const inverter = useInverterSummary()
  const array = useArraySummary()
  const load = useLoadSummary()
  const runs = resolveRuns({ inverter, array, load })
  const activeRun = runs.find(r => r.id === runId) ?? null
  const combiner = combinerAdvice(array)

  const applyRun = (id: RunId) => {
    const run = runs.find(r => r.id === id)
    if (!run) return
    setRunId(id)
    setKind(run.kind)
    setMaxDrop(run.suggestedDropPercent)
    setLengthFt(run.typicalFeet)
    if (run.amps !== null) setAmps(run.amps)
    if (run.volts !== null) setVoltage(run.volts)
  }

  // lengthFt is always stored in feet; the metric toggle is display-only.
  const input = { amps, oneWayFeet: lengthFt, volts: voltage, maxDropPercent: maxDrop, column, kind, continuous: true }

  const results   = evaluateGauges(input)
  const thinnest  = passingGauges(input)[0]
  const byAmpsOnly = thinnestByAmpacity(input)
  const roundTripFt = lengthFt * 2

  // The fuse must protect the wire. Sized against the thinnest conductor that
  // passed both limits, because that is the one most likely to be bought.
  const ocpd = thinnest
    ? sizeOvercurrent({ amps, continuous: true, kind, awg: thinnest.spec.awg, column })
    : null
  const protectable = ocpd?.impossible
    ? thinnestProtectableAwg({ amps, continuous: true, kind, column })
    : undefined
  const conductorView = conductorProtectionView(input)

  // The percentage budget is a proxy; this is the question it stands in for.
  // Uses the thinnest gauge that passed, because that is the one most likely
  // to be bought.
  const arrival = kind === 'pv-source' && thinnest && array && inverter
    ? mpptArrival(array.vmpHotV, thinnest.voltageDrop, inverter.mpptMinV)
    : null
  const batteryVoltageOnPv = activeRun
    ? looksLikeBatteryVoltage(activeRun.kind, voltage)
    : false
  const ocpdView = ocpd ? ocpdProtectionView(ocpd) : null

  // Protection register: the bar mirrors what ProtectionOutput already shows —
  // the set of gauges that pass — never a single recommended one. A capacity
  // answer can be a confident number in gold; this one cannot.
  const answerSummary = {
    headline: conductorView.options.length > 0
      ? conductorView.options.slice(0, 3).join(' · ')
      : 'none pass',
    detail: conductorView.options.length > 0
      ? `AWG that pass at ${amps}A over ${lengthFt}ft`
      : `nothing passes at ${amps}A over ${lengthFt}ft`,
  }

  return (
    <CalculatorChrome
      step="protection"
      title="Cable AWG Calculator"
      lede="Work out which cable sizes your run allows, and see exactly how each limit was worked out. Enter the one-way length — the return wire is added for you."
      answer={answerSummary}
      actionSummary={
        <p className="flex items-baseline gap-2 text-sm text-zon-muted">
          Passing at {amps}A over {lengthFt}ft
          <span className="font-mono font-semibold text-zon-ink">{answerSummary.headline}</span>
        </p>
      }
    >
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Protection register — sets and arithmetic, never a verdict */}
        <div className="order-first min-w-0 space-y-4 lg:order-last lg:col-span-2">
          <AnswerAnchor>
            <div className="lg:sticky lg:top-32 space-y-4">
            <ProtectionOutput view={conductorView}>
              {thinnest && (
                <p className="text-xs text-zon-muted">
                  Thicker is always electrically safer — it runs cooler and wastes less.
                  Round trip is {Math.round(roundTripFt)}ft ({(roundTripFt * 0.3048).toFixed(1)}m).
                </p>
              )}
              {byAmpsOnly && thinnest && byAmpsOnly.spec.awg !== thinnest.spec.awg && (
                <p className="text-xs text-zon-body">
                  On current alone, <span className="font-mono text-zon-ink">{byAmpsOnly.label} AWG</span>{' '}
                  would do. Its drop would be{' '}
                  <span className="tabular-nums">{byAmpsOnly.voltageDropPercent.toFixed(1)}%</span>,
                  over your {maxDrop}% limit — so it is <strong>distance</strong>, not current,
                  that rules out the thinner sizes.
                </p>
              )}
            </ProtectionOutput>

            {ocpdView && (
              <ProtectionOutput view={ocpdView}>
                {protectable && (
                  <p className="text-xs text-zon-body">
                    {awgLabel(protectable.awg)} AWG takes a{' '}
                    <span className="tabular-nums">{protectable.rating}A</span> device.
                  </p>
                )}
                {!ocpd?.impossible && (
                  <p className="text-xs text-zon-muted">
                    Smallest is usual — a larger device still protects the wire but trips later
                    into a fault.
                  </p>
                )}
                <p className="text-xs text-zon-muted">
                  NEC 240.4(B) may permit the next size above the conductor ampacity under
                  conditions this page cannot check. That is an electrician&apos;s call, not a
                  default — nothing here exceeds what the wire can carry.
                </p>
              </ProtectionOutput>
            )}

            <Card>
              <CardContent className="pt-4">
                <div className="flex gap-2 text-xs text-zon-body">
                  <Info className="w-4 h-4 shrink-0 text-zon-blue mt-0.5" aria-hidden="true" />
                  <p><strong className="text-zon-ink">DC needs a DC-rated device.</strong> {DC_RATING_WARNING}</p>
                </div>
              </CardContent>
            </Card>

            {/* Every figure on this page is NEC 310.16's copper column. That
                was true and said nowhere the reader could see it. */}
            <Card className="border-zon-amber">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-zon-ink">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-zon-amber" aria-hidden="true" />
                  Copper only
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-zon-body">
                <p>
                  <strong className="text-zon-ink">{COPPER_ONLY_HEADLINE}</strong> Aluminium
                  carries about 61% of the current for the same gauge, so every number here is
                  wrong for it — in the undersizing direction.
                </p>
                <p>{CCA_WARNING}</p>
                <p className="text-zon-muted">
                  How to tell what you bought, and why the joint is what fails:{' '}
                  <Link href="/guides/wiring#conductor-material" className="text-zon-gold-deep hover:underline">
                    conductor material in the wiring guide
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>

            {arrival && (
              <Card className={arrival.clears ? undefined : 'border-zon-red'}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-base text-zon-ink">
                    What reaches the inverter
                    <RegisterBadge register="capacity" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-zon-body">
                  <p className="text-sm">
                    <span className="font-mono tabular-nums text-zon-ink">
                      {arrival.sourceV.toFixed(0)}V
                    </span>{' '}
                    at the array on the hottest day, minus{' '}
                    <span className="font-mono tabular-nums">{arrival.dropV.toFixed(1)}V</span> in
                    the cable, leaves{' '}
                    <span className="font-mono tabular-nums font-semibold text-zon-ink">
                      {arrival.arrivingV.toFixed(0)}V
                    </span>{' '}
                    at the input.
                  </p>
                  {arrival.clears ? (
                    <p>
                      That is {Math.round(arrival.marginV)}V above the {arrival.floorV}V tracking
                      floor. The percentage budget is the binding constraint here, not the floor —
                      which is the usual case on a tall string, and worth knowing so you tighten
                      the right one.
                    </p>
                  ) : (
                    <p className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-zon-red" aria-hidden="true" />
                      <span>
                        <strong className="text-zon-ink">That is under the {arrival.floorV}V
                        floor.</strong> On the hottest afternoon this string stops tracking and
                        harvests nothing. Thicker cable recovers some of it; more panels in
                        series is the real fix, if the cold-morning limit allows it.
                      </span>
                    </p>
                  )}
                  <p className="text-zon-muted">
                    Computed at your entered current, which for a PV run is Isc. Power actually
                    flows at Imp, a few percent lower, so the real drop is slightly smaller than
                    this — the pessimistic direction.
                  </p>
                </CardContent>
              </Card>
            )}

            {combiner && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-zon-ink">
                    {combiner.needed ? 'You need a combiner' : 'No combiner needed'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-zon-body">
                  <p>{combiner.why}</p>
                  {combiner.needed && combiner.fused === true && (
                    <p className="text-zon-muted">
                      Size those string fuses on the{' '}
                      <Link href="/calculators/strings" className="text-zon-gold-deep hover:underline">
                        array wiring step
                      </Link>
                      , which works them out from your panel&apos;s Isc and its maximum series
                      fuse rating.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            </div>
          </AnswerAnchor>
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-3">
          {/* Which cable, before how many amps. A system has at least four
              runs and they are not interchangeable. */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zon-body">
                Which run are you sizing?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              <div className="grid gap-2 sm:grid-cols-2">
                {runs.filter(r => r.applies).map(run => {
                  const active = runId === run.id
                  return (
                    <button
                      key={run.id}
                      onClick={() => applyRun(run.id)}
                      aria-pressed={active}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                        active
                          ? 'border-zon-gold bg-zon-gold-tint'
                          : 'border-zon-rule hover:border-zon-gold-light'
                      }`}
                    >
                      <span className="block text-sm font-medium text-zon-ink">{run.label}</span>
                      <span className="mt-0.5 block text-xs text-zon-muted">{run.where}</span>
                      {run.amps !== null && (
                        <span className="mt-1 block text-xs font-medium text-zon-gold-deep">
                          {run.amps}A at {run.volts}V — from your system
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {activeRun ? (
                <div className="space-y-2 border-t border-zon-rule pt-3 text-xs text-zon-body">
                  {/* Selecting a run whose figures are unknown used to set the
                      circuit type and length and silently leave the current
                      and voltage at whatever was there before — which for a PV
                      string meant sizing a 287V circuit against 24V, and that
                      is six gauge sizes of difference, not a rounding error. */}
                  {activeRun.amps === null && (
                    <p className="rounded-lg border border-zon-amber-tint bg-zon-amber-tint px-3 py-2">
                      <strong className="text-zon-ink">
                        The numbers below are not from your system.
                      </strong>{' '}
                      {activeRun.kind === 'pv-source'
                        ? 'This run needs your panel and array, which come from the '
                        : 'This run needs your inverter, which comes from the '}
                      <Link
                        href={activeRun.kind === 'pv-source' ? '/calculators/strings' : '/calculators/inverter'}
                        className="text-zon-gold-deep hover:underline"
                      >
                        {activeRun.kind === 'pv-source' ? 'array wiring step' : 'inverter step'}
                      </Link>
                      . Until then the current and voltage are whatever was last typed here —
                      check both against your own figures before trusting the answer.
                    </p>
                  )}
                  {activeRun.derivation && (
                    <p>
                      <strong className="text-zon-ink">Where that current comes from.</strong>{' '}
                      {activeRun.derivation}
                    </p>
                  )}
                  <p>{activeRun.note}</p>
                  <p className="text-zon-muted">
                    The length below is a typical starting point, not your run — measure it.
                  </p>
                </div>
              ) : (
                <p className="border-t border-zon-rule pt-3 text-xs text-zon-muted">
                  Pick a run and the current, voltage and circuit type fill in from the steps you
                  have already done. Or size any cable by hand below — nothing here is locked.
                  {!inverter && !array && (
                    <>
                      {' '}
                      You have not been through the{' '}
                      <Link href="/calculators/inverter" className="text-zon-gold-deep hover:underline">
                        inverter
                      </Link>{' '}
                      or{' '}
                      <Link href="/calculators/strings" className="text-zon-gold-deep hover:underline">
                        array wiring
                      </Link>{' '}
                      steps, so there is nothing to fill in from yet.
                    </>
                  )}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 space-y-5">
              <div>
                <label htmlFor="awg-amps" className="block text-sm font-medium mb-1 text-zon-ink">
                  Current (amps)
                  {activeRun && (
                    <span className="ml-1 font-normal text-zon-muted">— {activeRun.label}</span>
                  )}
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
                  {kind === 'pv-source'
                    ? 'Enter the panel short-circuit current (Isc) as printed on the label. Do not pre-multiply it — the 156% of NEC 690.8(A) is applied below, and doing it twice oversizes everything.'
                    : 'The operating current, not the peak. The 125% continuous factor is applied below, so enter what the circuit actually draws.'}
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
                  Voltage on this run
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {(activeRun ? activeRun.voltageOptions : [12, 24, 48, 120, 240]).map(v => (
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
                  {activeRun && activeRun.volts !== null && voltage !== activeRun.volts && (
                    <button
                      onClick={() => setVoltage(activeRun.volts!)}
                      className="rounded-full border border-zon-gold-light bg-zon-gold-tint px-3 py-1 text-xs text-zon-gold-deep"
                    >
                      Use {activeRun.volts}V from your system →
                    </button>
                  )}
                  <label className="sr-only" htmlFor="awg-voltage-custom">Circuit voltage</label>
                  <input
                    id="awg-voltage-custom"
                    type="number"
                    value={voltage}
                    onChange={e => setVoltage(Math.max(1, parseFloat(e.target.value) || 1))}
                    min="1" max="1500"
                    className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-24 rounded-lg border border-zon-rule px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                  />
                  <span className="text-sm text-zon-muted">V</span>
                </div>
                {batteryVoltageOnPv && (
                  <p className="mt-2 rounded-lg border border-zon-amber-tint bg-zon-amber-tint px-3 py-2 text-xs text-zon-body">
                    <strong className="text-zon-ink">{voltage}V is a battery voltage.</strong> A
                    panel string is hundreds of volts — {activeRun?.volts
                      ? `yours is about ${activeRun.volts}V.`
                      : 'seven 41V panels in series is 287V, for instance.'}{' '}
                    Sizing a string against a battery figure overstates the drop percentage by
                    roughly ten times and can cost you several gauge sizes of copper you do not
                    need.
                    {activeRun?.volts && (
                      <>
                        {' '}
                        <button
                          onClick={() => setVoltage(activeRun.volts!)}
                          className="font-medium text-zon-gold-deep underline"
                        >
                          Use {activeRun.volts}V →
                        </button>
                      </>
                    )}
                  </p>
                )}
                <p className="text-xs text-zon-muted mt-1">
                  {activeRun
                    ? activeRun.voltageMeans
                    : 'The operating voltage of the cable you are sizing — a battery bank nominal for a DC run, a string\u2019s series total for a PV run, the AC output for an AC run. It is what the voltage drop below is measured against.'}
                </p>
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

              <div role="group" aria-labelledby="awg-kind-label">
                <span id="awg-kind-label" className="block text-sm font-medium mb-1 text-zon-ink">
                  Circuit type
                </span>
                <div className="flex gap-2 flex-wrap">
                  {([['general', 'General load'], ['pv-source', 'Solar panel string']] as const).map(([k, lbl]) => (
                    <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        kind === k
                          ? 'bg-zon-gold text-zon-ink border-zon-gold'
                          : 'border-zon-rule hover:border-zon-gold-light'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zon-muted mt-1">
                  {kind === 'pv-source'
                    ? 'A panel string carries two 125% factors — one because bright conditions push a panel above its nameplate, one because it runs for hours. Enter the panel short-circuit current (Isc) above, not its rated output.'
                    : 'Anything running three hours or more is a continuous load and gets a 125% factor on its protection.'}
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
      </div>
    </CalculatorChrome>
  )
}
