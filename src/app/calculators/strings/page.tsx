'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { PanelsTopLeft, Info, AlertTriangle, Thermometer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  usePersistentState, useInverterSummary, usePanelSummary, publishArraySummary,
} from '@/lib/calc-storage'
import {
  vocAtTemperature, vmpAtTemperature, cellTempHot, vmpCoefficient,
  maxSeries, minSeries, evaluateArrangements,
  stringVocProtectionView, stringCurrentProtectionView, stringFuseProtectionView,
  EXAMPLE_PANEL, EXAMPLE_TRACKER,
  DEFAULT_CELL_RISE_C, DEFAULT_MPPT_HEADROOM,
  type PanelSpec, type TrackerSpec, type SiteConditions,
} from '@/lib/pv-string'
import {
  PEAK_SUN_REGIONS, DEFAULT_DESIGN_LOW_C, DEFAULT_DESIGN_HIGH_C,
} from '@/lib/peak-sun'
import CalculatorChrome, { AnswerAnchor } from '@/components/calculators/CalculatorChrome'
import ProtectionOutput, { RegisterBadge } from '@/components/ProtectionOutput'
import MpptWindowBar, { type WindowMarker } from '@/components/calculators/MpptWindowBar'

/**
 * Step 5 — the arrangement.
 *
 * Step 4 says how many panels. This says how they may be wired, and it is the
 * step that was missing: same panels, same cost, same daily kWh, and one
 * arrangement destroys the inverter on the first cold morning.
 *
 * Two registers on one page, deliberately rendered differently. Series count
 * against the maximum PV input, parallel count against the tracker's current
 * rating, and string fusing are PROTECTION — they go through ProtectionOutput,
 * a set of options with the arithmetic and the code citation, never a verdict.
 * The MPPT window headroom and the DC:AC ratio are CAPACITY — a string under
 * the window harvests nothing, but nothing is damaged, so those stay confident
 * numbers.
 */

interface PanelDraft {
  wattsStc: number | null
  vocStc: number | null
  vmpStc: number | null
  iscStc: number | null
  impStc: number | null
  betaVoc: number | null
  betaPmax: number | null
  maxSeriesFuseA: number | null
}

const EMPTY_PANEL: PanelDraft = {
  wattsStc: null, vocStc: null, vmpStc: null, iscStc: null, impStc: null,
  betaVoc: null, betaPmax: null, maxSeriesFuseA: null,
}

const REQUIRED: (keyof PanelDraft)[] = ['wattsStc', 'vocStc', 'vmpStc', 'iscStc', 'betaVoc']

const num = (v: string): number | null => {
  if (v.trim() === '') return null
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

const NOSPIN =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none ' +
  '[&::-webkit-outer-spin-button]:appearance-none '

function NumField({
  id, label, unit, value, onChange, hint, step,
}: {
  id: string
  label: string
  unit: string
  value: number | null
  onChange: (v: number | null) => void
  hint?: string
  step?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-zon-ink">{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={id} type="number" inputMode="decimal" step={step}
          value={value ?? ''}
          onChange={e => onChange(num(e.target.value))}
          className={NOSPIN + 'w-28 rounded-lg border border-zon-rule px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light'}
        />
        <span className="text-sm text-zon-muted">{unit}</span>
      </div>
      {hint && <p className="mt-1 text-xs text-zon-muted">{hint}</p>}
    </div>
  )
}

export default function ArrayWiringPage() {
  const [panelDraft, setPanelDraft] = usePersistentState<PanelDraft>('zonzelf:array:panel', EMPTY_PANEL)
  const [useExample, setUseExample] = usePersistentState('zonzelf:array:useExample', false)
  const [lowC, setLowC] = usePersistentState<number>('zonzelf:array:lowC', DEFAULT_DESIGN_LOW_C)
  const [highC, setHighC] = usePersistentState<number>('zonzelf:array:highC', DEFAULT_DESIGN_HIGH_C)
  const [riseC, setRiseC] = usePersistentState<number>('zonzelf:array:riseC', DEFAULT_CELL_RISE_C)
  const [count, setCount, countMeta] = usePersistentState<number>('zonzelf:array:panelCount', 8)

  const inverter = useInverterSummary()
  const panelSummary = usePanelSummary()

  // Follow the panel step's count until this page has one of its own.
  const panelCount = !countMeta.restored && panelSummary?.panels ? panelSummary.panels : count

  const panelReady = REQUIRED.every(k => panelDraft[k] !== null)
  const panel: PanelSpec | null = useExample
    ? EXAMPLE_PANEL
    : panelReady
      ? {
          wattsStc: panelDraft.wattsStc!,
          vocStc: panelDraft.vocStc!,
          vmpStc: panelDraft.vmpStc!,
          iscStc: panelDraft.iscStc!,
          impStc: panelDraft.impStc ?? panelDraft.iscStc! * 0.94,
          betaVoc: panelDraft.betaVoc!,
          betaPmax: panelDraft.betaPmax ?? undefined,
          maxSeriesFuseA: panelDraft.maxSeriesFuseA ?? undefined,
        }
      : null

  const tracker: TrackerSpec | null = useExample
    ? EXAMPLE_TRACKER
    : inverter
      ? {
          pvMaxInputV: inverter.pvMaxInputV,
          mpptMinV: inverter.mpptMinV,
          mpptMaxV: inverter.mpptMaxV,
          pvMaxCurrentA: inverter.pvMaxCurrentA,
          pvMaxPowerW: inverter.pvMaxPowerW,
        }
      : null

  const site: SiteConditions = { recordLowC: lowC, designHighC: highC, cellRiseC: riseC }
  const ready = panel !== null && tracker !== null

  const perPanelCold = panel ? vocAtTemperature(panel.vocStc, panel.betaVoc, lowC) : 0
  const coeff = panel ? vmpCoefficient(panel) : null
  const perPanelHot = panel && coeff
    ? vmpAtTemperature(panel.vmpStc, coeff.beta, cellTempHot(highC, riseC))
    : 0

  const seriesMax = ready ? maxSeries(panel!, site, tracker!.pvMaxInputV) : 0
  const seriesMin = ready ? minSeries(panel!, site, tracker!.mpptMinV) : 0
  const arrangements = ready ? evaluateArrangements(panel!, tracker!, site, panelCount) : []
  const best = arrangements.find(a => a.ideal) ?? arrangements.find(a => a.safe) ?? arrangements[0]
  // Nothing passing is a real answer and has to look like one. The card must
  // not headline a destroying arrangement in gold as though it were a result.
  const anySafe = arrangements.some(a => a.safe)

  const vocView = ready ? stringVocProtectionView(panel!, tracker!, site) : null
  const currentView = ready ? stringCurrentProtectionView(panel!, tracker!) : null
  const fuseView = ready && best ? stringFuseProtectionView(panel!, best.parallel) : null

  useEffect(() => {
    if (!ready || !best || useExample || !anySafe) return
    publishArraySummary({
      series: best.series,
      parallel: best.parallel,
      panels: best.panels,
      arrayWatts: best.arrayW,
      vocColdV: best.vocColdV,
      vmpHotV: best.vmpHotV,
      designIscA: best.designIscA,
      designLowC: lowC,
      designHighC: highC,
      stringFuseRequired: best.stringFuseRequired,
    })
  }, [ready, best, useExample, anySafe, lowC, highC])

  const setPanel = <K extends keyof PanelDraft>(k: K, v: PanelDraft[K]) =>
    setPanelDraft(p => ({ ...p, [k]: v }))

  const markers: WindowMarker[] = best
    ? [
        {
          volts: best.vmpHotV,
          label: 'Working, hot',
          detail: `what the string sits at on a ${highC} degree day, with the cells ${riseC} degrees hotter still`,
          tone: best.belowWindow ? 'bad' : best.thinHeadroom ? 'warn' : 'ok',
        },
        {
          volts: best.vocColdV,
          label: 'Open circuit, cold',
          detail: `what it reaches at dawn at ${lowC} degrees, before the inverter wakes`,
          tone: best.exceedsDamageCeiling ? 'bad' : best.exceedsTrackingCeiling ? 'warn' : 'ok',
        },
      ]
    : []

  const answerSummary = best
    ? {
        headline: anySafe ? `${best.series}S${best.parallel}P` : 'None fit',
        detail: anySafe
          ? `${best.panels} panels · ${best.vocColdV.toFixed(0)}V cold`
          : `${panelCount} panels, no arrangement inside this unit's limits`,
        rows: arrangements.slice(0, 6).map(a => ({
          id: `${a.series}x${a.parallel}`,
          label: `${a.series} in series × ${a.parallel} parallel`,
          value: a.safe ? `${a.vocColdV.toFixed(0)}V` : 'no',
          sub: a.exceedsDamageCeiling
            ? `${a.vocColdV.toFixed(0)}V cold — over the ${tracker!.pvMaxInputV}V limit`
            : a.exceedsCurrent
              ? `${a.designIscA.toFixed(1)}A — over the ${tracker!.pvMaxCurrentA}A input`
              : a.belowWindow
                ? `${a.vmpHotV.toFixed(0)}V hot — under the ${tracker!.mpptMinV}V floor`
                : `${a.vmpHotV.toFixed(0)}V hot · ${(a.arrayW / 1000).toFixed(1)} kW`,
        })),
      }
    : { headline: '—', detail: 'needs a panel and an inverter' }

  return (
    <CalculatorChrome
      step="array"
      title="Array Wiring: Series, Parallel and Cold Mornings"
      lede="Twelve panels can be twelve in series, two strings of six, or three of four. Same panels, same cost, same daily kWh — and one of those arrangements destroys your inverter on the first frosty morning. This works out which ones are safe."
      note={
        <>
          Panel voltage rises as it gets colder, which is the opposite of what most people
          expect and the reason this step exists.{' '}
          <Link href="/guides/strings-and-mppt" className="text-zon-gold-deep hover:underline">
            The full explanation, with the formulas
          </Link>{' '}
          is worth ten minutes before you buy anything.
        </>
      }
      answer={answerSummary}
      actionSummary={
        <p className="flex items-baseline gap-2 text-sm text-zon-muted">
          Arrangement
          <span className={`font-bold tabular-nums ${anySafe ? 'text-zon-gold-deep' : 'text-zon-ink'}`}>
            {!best ? '—' : anySafe ? `${best.series}S${best.parallel}P` : 'none fit'}
          </span>
        </p>
      }
    >
      {useExample && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-zon-blue-tint bg-zon-blue-tint px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-zon-blue" aria-hidden="true" />
          <p className="text-sm text-zon-body">
            <strong className="text-zon-ink">These are example numbers, not a real product.</strong>{' '}
            A made-up 400 W panel and a made-up tracker, so you can see the mechanism work before
            you have a datasheet in front of you. Nothing here is saved into your system.{' '}
            <button
              onClick={() => setUseExample(false)}
              className="font-medium text-zon-gold-deep underline"
            >
              Use my own figures instead
            </button>
          </p>
        </div>
      )}

      {!ready && !useExample && (
        <Card className="mb-5">
          <CardContent className="pt-4">
            <p className="text-sm text-zon-body">
              This step needs two things: your panel&apos;s label figures below, and your
              inverter&apos;s solar input window from{' '}
              <Link href="/calculators/inverter" className="text-zon-gold-deep hover:underline">
                step 3
              </Link>
              {inverter ? '' : ' — which has not been filled in yet'}.
            </p>
            <button
              onClick={() => setUseExample(true)}
              className="mt-3 rounded-lg border border-zon-gold-light bg-zon-gold-tint px-3 py-1.5 text-sm text-zon-gold-deep"
            >
              Show me how it works with example numbers →
            </button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="order-first min-w-0 space-y-4 lg:order-last lg:col-span-2">
          <AnswerAnchor>
            <div className="space-y-4 lg:sticky lg:top-32">
              {best && tracker && (
                <Card className={anySafe ? 'border-zon-gold-light bg-zon-gold-tint' : 'border-zon-red'}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span className="flex items-center gap-2">
                        <PanelsTopLeft className="h-4 w-4 text-zon-gold-deep" />
                        Where your string sits
                      </span>
                      <RegisterBadge register="capacity" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-zon-muted">
                        {anySafe
                          ? `Workable arrangement of ${panelCount} panels`
                          : `No workable arrangement of ${panelCount} panels`}
                      </p>
                      <p className={`text-4xl font-bold ${anySafe ? 'text-zon-gold-deep' : 'text-zon-ink'}`}>
                        {anySafe ? `${best.series}S${best.parallel}P` : 'None'}
                      </p>
                      <p className="text-sm text-zon-muted">
                        {anySafe ? (
                          <>
                            {best.series} in series, {best.parallel} string
                            {best.parallel === 1 ? '' : 's'} in parallel ·{' '}
                            {(best.arrayW / 1000).toFixed(1)} kW
                          </>
                        ) : (
                          <>
                            Closest is {best.series}S{best.parallel}P, shown below so you can see
                            what it runs into
                          </>
                        )}
                      </p>
                    </div>

                    <div className="border-t border-zon-gold-light pt-3">
                      <MpptWindowBar
                        mpptMinV={tracker.mpptMinV}
                        mpptMaxV={tracker.mpptMaxV}
                        pvMaxInputV={tracker.pvMaxInputV}
                        markers={markers}
                      />
                    </div>

                    {!anySafe && (
                      <p className="flex gap-2 border-t border-zon-gold-light pt-3 text-xs text-zon-body">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-zon-red" aria-hidden="true" />
                        <span>
                          <strong className="text-zon-ink">No arrangement of {panelCount} panels
                          works with this inverter.</strong> Every option runs into one of its
                          limits — {tracker.pvMaxInputV}V in, {tracker.pvMaxCurrentA}A per
                          tracker, or the {tracker.mpptMinV}V tracking floor. The table shows
                          which one each hits. A different panel, a bigger unit, or splitting the
                          array across more trackers are the ways out; a bigger array on the same
                          box is not.
                        </span>
                      </p>
                    )}
                    {!best.exceedsDamageCeiling && best.thinHeadroom && (
                      <p className="border-t border-zon-gold-light pt-3 text-xs text-zon-body">
                        This string clears the {tracker.mpptMinV}V floor when hot, but only just
                        ({best.vmpHotV.toFixed(0)}V, against a{' '}
                        {Math.round(tracker.mpptMinV * (1 + DEFAULT_MPPT_HEADROOM))}V target that
                        leaves {Math.round(DEFAULT_MPPT_HEADROOM * 100)}% in hand). One more panel
                        in series would give it room. This is what the common advice to &ldquo;design
                        well above the minimum&rdquo; is actually asking for.
                      </p>
                    )}
                    {best.exceedsPower && (
                      <p className="border-t border-zon-gold-light pt-3 text-xs text-zon-body">
                        {(best.arrayW / 1000).toFixed(1)} kW of panel into a{' '}
                        {(tracker.pvMaxPowerW / 1000).toFixed(1)} kW input. The extra is clipped
                        on the brightest days, not harvested — common and deliberate, but worth
                        knowing you are doing it.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {vocView && <ProtectionOutput view={vocView} />}
              {currentView && <ProtectionOutput view={currentView} />}
              {fuseView && <ProtectionOutput view={fuseView} />}
            </div>
          </AnswerAnchor>
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-3">
          {/* Every arrangement, with the binding constraint named. */}
          {arrangements.length > 0 && tracker && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zon-body">
                  Every way to wire {panelCount} panels
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <caption className="sr-only">
                      Each arrangement of {panelCount} panels, with its cold and hot string
                      voltages and whether it is within the inverter&apos;s limits
                    </caption>
                    <thead>
                      <tr className="border-b border-zon-rule bg-zon-cream text-zon-muted">
                        <th scope="col" className="px-4 py-2 text-left">Wiring</th>
                        <th scope="col" className="px-3 py-2 text-right">Cold Voc</th>
                        <th scope="col" className="px-3 py-2 text-right">Hot Vmp</th>
                        <th scope="col" className="px-3 py-2 text-right">Current</th>
                        <th scope="col" className="px-4 py-2 text-left">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arrangements.map(a => (
                        <tr key={`${a.series}x${a.parallel}`} className="border-b border-zon-rule-soft">
                          <td className="px-4 py-2 font-mono text-zon-ink">
                            {a.series}S{a.parallel}P
                          </td>
                          <td className={`px-3 py-2 text-right tabular-nums ${a.exceedsDamageCeiling ? 'text-zon-red' : 'text-zon-body'}`}>
                            {a.vocColdV.toFixed(0)}V
                          </td>
                          <td className={`px-3 py-2 text-right tabular-nums ${a.belowWindow ? 'text-zon-amber' : 'text-zon-body'}`}>
                            {a.vmpHotV.toFixed(0)}V
                          </td>
                          <td className={`px-3 py-2 text-right tabular-nums ${a.exceedsCurrent ? 'text-zon-red' : 'text-zon-body'}`}>
                            {a.designIscA.toFixed(1)}A
                          </td>
                          <td className="px-4 py-2 text-zon-body">
                            {a.exceedsDamageCeiling
                              ? `over the ${tracker.pvMaxInputV}V input — destroys it`
                              : a.exceedsCurrent
                                ? `over the ${tracker.pvMaxCurrentA}A input`
                                : a.belowWindow
                                  ? `under the ${tracker.mpptMinV}V floor when hot`
                                  : a.thinHeadroom
                                    ? 'works, little headroom when hot'
                                    : a.exceedsTrackingCeiling
                                      ? 'safe, but clips above the window'
                                      : a.exceedsPower
                                        ? 'works, array clipped on power'
                                        : 'works'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-2 border-t border-zon-rule px-4 py-3 text-xs text-zon-muted">
                  <p>
                    <strong className="text-zon-body">Series is bounded by voltage, parallel by
                    current.</strong> Panels in series add their voltages and keep one panel&apos;s
                    current; strings in parallel add their currents and keep one string&apos;s
                    voltage. That is the whole of it — everything above is those two sentences
                    against your inverter&apos;s two limits.
                  </p>
                  <p>
                    Between {seriesMin} and {seriesMax} panels in series works for this pairing:
                    fewer than {seriesMin} and the string sags under the tracking floor on a hot
                    afternoon, more than {seriesMax} and it passes the input maximum on a cold
                    morning. Only whole strings are listed — an array is not wired with a
                    fraction of one.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Temperature — the input that decides everything. */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-zon-body">
                <Thermometer className="h-4 w-4 text-zon-gold-deep" aria-hidden="true" />
                Your site&apos;s temperatures
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <p className="text-xs text-zon-muted">
                This is the input the calculator most needs you to replace. The presets are ranges
                across whole countries and states, and the record figures come from frost hollows
                and mountains rather than from where people build. Get your own site&apos;s figure
                — a local weather station&apos;s record low is a good source.
              </p>

              <div className="rounded-lg bg-zon-rule-soft p-3">
                <p className="mb-2 text-xs font-medium text-zon-muted">
                  Starting points by region — design low, and the all-time record
                </p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {PEAK_SUN_REGIONS.map(r => (
                    <button
                      key={r.region}
                      onClick={() => { setLowC(r.designLowC); setHighC(r.designHighC) }}
                      className={`rounded px-2 py-1.5 text-left text-xs transition-colors ${
                        lowC === r.designLowC && highC === r.designHighC
                          ? 'bg-zon-gold-tint font-medium text-zon-gold-deep'
                          : 'text-zon-body hover:bg-zon-rule-soft'
                      }`}
                    >
                      {r.region}
                      <span className="float-right font-mono">
                        {r.designLowC}° / {r.recordLowC}°
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <NumField
                  id="site-low" label="Coldest expected" unit="°C" step="1"
                  value={lowC} onChange={v => setLowC(v ?? DEFAULT_DESIGN_LOW_C)}
                  hint="Sets the highest voltage your array ever produces."
                />
                <NumField
                  id="site-high" label="Hottest expected" unit="°C" step="1"
                  value={highC} onChange={v => setHighC(v ?? DEFAULT_DESIGN_HIGH_C)}
                  hint="Air temperature, not the panel's."
                />
                <NumField
                  id="site-rise" label="Cell rise in sun" unit="°C" step="5"
                  value={riseC} onChange={v => setRiseC(v ?? DEFAULT_CELL_RISE_C)}
                  hint="Panels run 25–30° above the air."
                />
              </div>

              {panel && (
                <div className="space-y-2 border-t border-zon-rule pt-3 text-xs text-zon-body">
                  <p>
                    <strong className="text-zon-ink">Cold, per panel.</strong>{' '}
                    Voc({lowC}°) = {panel.vocStc}V × [1 + ({panel.betaVoc}/100) × ({lowC} − 25)] ={' '}
                    <span className="font-mono tabular-nums">{perPanelCold.toFixed(1)}V</span> —{' '}
                    {((perPanelCold / panel.vocStc - 1) * 100).toFixed(1)}% over the label. The
                    coefficient is negative and the temperature is below 25°, so two negatives
                    multiply to a voltage <em>above</em> nameplate.
                  </p>
                  <p>
                    <strong className="text-zon-ink">Hot, per panel.</strong>{' '}
                    Cells reach {cellTempHot(highC, riseC)}° on a {highC}° day, so Vmp ={' '}
                    {panel.vmpStc}V × [1 + ({coeff!.beta}/100) × ({cellTempHot(highC, riseC)} − 25)] ={' '}
                    <span className="font-mono tabular-nums">{perPanelHot.toFixed(1)}V</span>.
                    {coeff!.from === 'pmax' && ' Using the Pmax coefficient, the usual stand-in when Vmp has none of its own.'}
                    {coeff!.from === 'voc' && ' Using the Voc coefficient as a last resort — it understates the sag, so treat this as the optimistic case.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* The panel's own label. */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zon-body">Your panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <p className="text-xs text-zon-muted">
                All of these are on the label on the back of the panel, and on its datasheet.
                Voc and the temperature coefficient are the two that decide whether your inverter
                survives — copy them exactly.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumField
                  id="panel-w" label="Rated power (Pmax)" unit="W"
                  value={panelDraft.wattsStc} onChange={v => setPanel('wattsStc', v)}
                />
                <NumField
                  id="panel-voc" label="Open-circuit voltage (Voc)" unit="V" step="0.1"
                  value={panelDraft.vocStc} onChange={v => setPanel('vocStc', v)}
                  hint="The highest voltage the panel ever makes."
                />
                <NumField
                  id="panel-vmp" label="Voltage at max power (Vmp)" unit="V" step="0.1"
                  value={panelDraft.vmpStc} onChange={v => setPanel('vmpStc', v)}
                  hint="Where it sits while actually working."
                />
                <NumField
                  id="panel-isc" label="Short-circuit current (Isc)" unit="A" step="0.1"
                  value={panelDraft.iscStc} onChange={v => setPanel('iscStc', v)}
                />
                <NumField
                  id="panel-imp" label="Current at max power (Imp)" unit="A" step="0.1"
                  value={panelDraft.impStc} onChange={v => setPanel('impStc', v)}
                  hint="Optional."
                />
                <NumField
                  id="panel-bvoc" label="Voc temperature coefficient" unit="%/°C" step="0.01"
                  value={panelDraft.betaVoc} onChange={v => setPanel('betaVoc', v)}
                  hint="Negative, around −0.25 to −0.35."
                />
                <NumField
                  id="panel-bpmax" label="Pmax temperature coefficient" unit="%/°C" step="0.01"
                  value={panelDraft.betaPmax} onChange={v => setPanel('betaPmax', v)}
                  hint="Optional. Used for the hot-day sag."
                />
                <NumField
                  id="panel-fuse" label="Max series fuse rating" unit="A"
                  value={panelDraft.maxSeriesFuseA} onChange={v => setPanel('maxSeriesFuseA', v)}
                  hint="Decides whether parallel strings need fuses."
                />
              </div>
              {panelDraft.betaVoc !== null && panelDraft.betaVoc > 0 && (
                <p className="rounded-lg border border-zon-amber-tint bg-zon-amber-tint px-3 py-2 text-xs text-zon-body">
                  The Voc coefficient should be negative. A positive value says the panel makes{' '}
                  <em>more</em> voltage as it gets hotter, which would invert the whole
                  calculation — check for a minus sign on the datasheet.
                </p>
              )}
            </CardContent>
          </Card>

          <div>
            <label htmlFor="array-count" className="mb-1 block text-sm font-medium text-zon-ink">
              Panels to wire
            </label>
            <div className="flex items-center gap-3">
              <input
                id="array-count" type="number" min="1" max="120"
                value={panelCount}
                onChange={e => setCount(Math.min(120, Math.max(1, parseInt(e.target.value) || 1)))}
                className={NOSPIN + 'w-24 rounded-lg border border-zon-rule px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light'}
              />
              {panelSummary && panelSummary.panels !== panelCount && (
                <button
                  onClick={() => setCount(panelSummary.panels)}
                  className="rounded-full border border-zon-gold-light bg-zon-gold-tint px-3 py-1 text-xs text-zon-gold-deep"
                >
                  Use {panelSummary.panels} from your panel sizing →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </CalculatorChrome>
  )
}
