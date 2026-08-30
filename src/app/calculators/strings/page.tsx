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
  EXAMPLE_PANEL, EXAMPLE_TRACKER, PANEL_PRESETS,
  DEFAULT_CELL_RISE_C, DEFAULT_MPPT_HEADROOM,
  type PanelSpec, type TrackerSpec, type SiteConditions,
} from '@/lib/pv-string'
import {
  searchSites, siteById, sitesByRegion, recordMargin,
  DEFAULT_DESIGN_LOW_C, DEFAULT_DESIGN_HIGH_C, SITE_CLIMATE_SOURCE, SITE_CLIMATES,
} from '@/lib/site-climate'
import { fieldHelp } from '@/lib/datasheet-vocabulary'
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

/** Same job as on the inverter step: the datasheet's words, next to our box. */
function FieldHelp({ id }: { id: string }) {
  const help = fieldHelp(id)
  if (!help) return null
  return (
    <>
      <p className="mt-1 text-xs text-zon-muted">
        <span className="text-zon-body">Your datasheet may call it</span>{' '}
        {help.alsoCalled.slice(0, 3).map((name, i) => (
          <span key={name}>
            {i > 0 && ' · '}
            <span className="font-medium text-zon-ink">{name}</span>
          </span>
        ))}
      </p>
      {help.gotcha && <p className="mt-1 text-xs text-zon-body">{help.gotcha}</p>}
    </>
  )
}

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
      <FieldHelp id={id} />
    </div>
  )
}

export default function ArrayWiringPage() {
  const [panelDraft, setPanelDraft] = usePersistentState<PanelDraft>('zonzelf:array:panel', EMPTY_PANEL)
  const [useExample, setUseExample] = usePersistentState('zonzelf:array:useExample', false)
  const [lowC, setLowC] = usePersistentState<number>('zonzelf:array:lowC', DEFAULT_DESIGN_LOW_C)
  const [highC, setHighC] = usePersistentState<number>('zonzelf:array:highC', DEFAULT_DESIGN_HIGH_C)
  const [riseC, setRiseC] = usePersistentState<number>('zonzelf:array:riseC', DEFAULT_CELL_RISE_C)
  const [siteId, setSiteId] = usePersistentState<string>('zonzelf:array:siteId', '')
  const [placeQuery, setPlaceQuery] = usePersistentState<string>('zonzelf:array:placeQuery', '')
  const [count, setCount, countMeta] = usePersistentState<number>('zonzelf:array:panelCount', 8)

  const chosenSite = siteId ? siteById(siteId) : undefined
  const matches = searchSites(placeQuery)
  const applySite = (id: string) => {
    const site = siteById(id)
    if (!site) return
    setSiteId(id)
    setPlaceQuery(site.place)
    setLowC(site.designLowC)
    setHighC(site.designHighC)
  }

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
          pvMaxIscA: inverter.pvMaxIscA,
          pvMaxPowerW: inverter.pvMaxPowerW,
          mpptCount: inverter.mpptCount,
        }
      : null

  const site: SiteConditions = { lowestExpectedC: lowC, designHighC: highC, cellRiseC: riseC }
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

  const setPanel = <K extends keyof PanelDraft>(k: K, v: PanelDraft[K]) => {
    setPanelDraft(p => ({ ...p, [k]: v }))
    // Edited figures are no longer the preset's, and must stop citing it.
    setPanelBrand('')
  }

  const [panelBrand, setPanelBrand] = usePersistentState<string>('zonzelf:array:panelModel', '')
  const activePanel = PANEL_PRESETS.find(p => `${p.brand} ${p.model}` === panelBrand)

  const applyPanelPreset = (preset: (typeof PANEL_PRESETS)[number]) => {
    setUseExample(false)
    setPanelBrand(`${preset.brand} ${preset.model}`)
    setPanelDraft({
      wattsStc: preset.wattsStc,
      vocStc: preset.vocStc,
      vmpStc: preset.vmpStc,
      iscStc: preset.iscStc,
      impStc: preset.impStc ?? null,
      betaVoc: preset.betaVoc,
      betaPmax: preset.betaPmax ?? null,
      maxSeriesFuseA: preset.maxSeriesFuseA ?? null,
    })
  }

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
              ? `${a.designIscA.toFixed(1)}A — over the ${tracker!.pvMaxIscA ?? tracker!.pvMaxCurrentA}A rating`
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
                            {best.parallel === 1 ? '' : 's'}
                            {tracker.mpptCount > 1 && (
                              <>
                                {' '}across {best.trackersUsed} of {tracker.mpptCount} trackers
                                {best.stringsPerTracker > 1
                                  ? ` (${best.stringsPerTracker} each)`
                                  : ' (one each)'}
                              </>
                            )}{' '}
                            · {(best.arrayW / 1000).toFixed(1)} kW
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
                        <th scope="col" className="px-3 py-2 text-right">A / tracker</th>
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
                          <td className={`px-3 py-2 text-right tabular-nums ${
                            a.exceedsCurrent ? 'text-zon-red'
                              : a.exceedsUsableCurrent ? 'text-zon-amber' : 'text-zon-body'
                          }`}>
                            {a.designIscA.toFixed(1)}A
                          </td>
                          <td className="px-4 py-2 text-zon-body">
                            {a.exceedsDamageCeiling
                              ? `over the ${tracker.pvMaxInputV}V input — destroys it`
                              : a.exceedsCurrent
                                ? `over the ${tracker.pvMaxIscA ?? tracker.pvMaxCurrentA}A rating`
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
                  {tracker.mpptCount > 1 && (
                    <p>
                      <strong className="text-zon-body">Your unit has {tracker.mpptCount}{' '}
                      independent trackers, and that changes how the limits apply.</strong> They
                      are separate inputs, not one input with double the capacity. Voltage never
                      adds across them — {seriesMax} panels in series on each tracker is{' '}
                      {seriesMax} panels&apos; worth of volts at <em>each</em> input, not twice
                      it. Currents do not add either, so the amps column above is what one
                      tracker carries, not the whole array.
                    </p>
                  )}
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
                The coldest figure decides how many panels may go in a string, so it is worth
                getting right. Each place below is a real thirty-year record for that spot — not a
                region — and the spread inside one state is the reason: Phoenix and Flagstaff are
                about fifteen degrees apart.
              </p>

              <div className="rounded-lg bg-zon-rule-soft p-3">
                <label htmlFor="site-place" className="mb-1 block text-xs font-medium text-zon-muted">
                  Find the nearest place to your site
                </label>
                <input
                  id="site-place"
                  type="search"
                  value={placeQuery}
                  onChange={e => { setPlaceQuery(e.target.value); setSiteId('') }}
                  placeholder={`Type a town or country — ${SITE_CLIMATES.length} places`}
                  className="w-full rounded-lg border border-zon-rule bg-zon-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                />

                {matches.length > 0 && !chosenSite && (
                  <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-zon-rule bg-zon-paper">
                    {matches.map(match => (
                      <li key={match.id}>
                        <button
                          onClick={() => applySite(match.id)}
                          className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-zon-gold-tint"
                        >
                          <span className="text-zon-ink">
                            {match.place}
                            <span className="ml-1.5 text-zon-muted">{match.region}</span>
                          </span>
                          <span className="shrink-0 font-mono tabular-nums text-zon-body">
                            {match.designLowC}° / {match.recordLowC}°
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {placeQuery.trim().length > 1 && matches.length === 0 && !chosenSite && (
                  <p className="mt-2 text-xs text-zon-body">
                    No match. This is a short list of named places, not a gazetteer — pick the
                    nearest one you recognise, or type your own figures below. Yours is the
                    better number either way.
                  </p>
                )}

                {chosenSite && (
                  <div className="mt-2 rounded-lg border border-zon-gold-light bg-zon-gold-tint px-3 py-2">
                    <p className="text-xs font-medium text-zon-ink">{chosenSite.place}</p>
                    <div className="mt-1 space-y-0.5 text-xs text-zon-body">
                      <div className="flex justify-between gap-3">
                        <span>Design low — mean of 30 annual minimums</span>
                        <span className="font-mono tabular-nums">{chosenSite.designLowC} °C</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Record low — coldest day in 30 years</span>
                        <span className="font-mono tabular-nums">{chosenSite.recordLowC} °C</span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recordMargin(chosenSite) !== null && lowC !== chosenSite.recordLowC && (
                        <button
                          onClick={() => setLowC(chosenSite.recordLowC)}
                          className="rounded-full border border-zon-gold-light bg-zon-paper px-3 py-1 text-xs text-zon-gold-deep"
                        >
                          Size against the record instead ({chosenSite.recordLowC} °C,{' '}
                          {recordMargin(chosenSite)}° colder) →
                        </button>
                      )}
                      {lowC !== chosenSite.designLowC && (
                        <button
                          onClick={() => setLowC(chosenSite.designLowC)}
                          className="rounded-full border border-zon-rule bg-zon-paper px-3 py-1 text-xs text-zon-body"
                        >
                          Back to the design low ({chosenSite.designLowC} °C)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!placeQuery.trim() && (
                  <div className="mt-2 max-h-44 space-y-2 overflow-y-auto">
                    {sitesByRegion().map(group => (
                      <div key={group.region}>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-zon-muted">
                          {group.region}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {group.sites.map(place => (
                            <button
                              key={place.id}
                              onClick={() => applySite(place.id)}
                              title={`${place.place} · design ${place.designLowC}°C, record ${place.recordLowC}°C`}
                              className="rounded border border-zon-rule bg-zon-paper px-1.5 py-0.5 text-[11px] text-zon-body hover:border-zon-gold-light"
                            >
                              {place.place.split(',')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

              <details className="rounded-lg border border-zon-rule px-3 py-2">
                <summary className="cursor-pointer text-xs font-medium text-zon-ink">
                  None of these is your site — how to get your own figure
                </summary>
                <div className="mt-2 space-y-2 text-xs text-zon-muted">
                  <p>
                    Every row is a named place, so it describes that spot and nothing around it.
                    Cold air pools in valleys, and a site a few miles from one of these can be
                    several degrees colder. Three ways to do better:
                  </p>
                  <ul className="ml-4 list-disc space-y-1">
                    <li>
                      <strong className="text-zon-body">Your nearest weather station&apos;s record
                      low.</strong> National met services publish these free. It is the number
                      most builders end up using, and it is conservative.
                    </li>
                    <li>
                      <strong className="text-zon-body">ASHRAE&apos;s extreme annual mean minimum
                      design dry-bulb temperature</strong> for your location — the figure NEC
                      690.7 actually points at, and what an installer would use. It is in the
                      ASHRAE Handbook and in most professional PV design tools.
                    </li>
                    <li>
                      <strong className="text-zon-body">Ask a local installer what they design
                      to.</strong> They will know the number for your area without looking it up.
                    </li>
                  </ul>
                  <p>
                    When you are unsure, go colder. A colder figure means a higher string voltage,
                    which means fewer panels in series — it costs you a little harvest and buys
                    you the inverter.
                  </p>
                  <p className="border-t border-zon-rule pt-2">{SITE_CLIMATE_SOURCE}</p>
                </div>
              </details>

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
              {PANEL_PRESETS.length > 0 && (
                <div className="rounded-lg bg-zon-rule-soft p-3">
                  <p className="mb-2 text-xs font-medium text-zon-muted">
                    Panels we have already read the datasheet for
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PANEL_PRESETS.map(preset => {
                      const active = activePanel?.id === preset.id
                      return (
                        <button
                          key={preset.id}
                          onClick={() => applyPanelPreset(preset)}
                          aria-pressed={active}
                          className={`rounded-lg border px-3 py-1.5 text-left text-sm transition-colors ${
                            active
                              ? 'border-zon-gold bg-zon-gold text-zon-ink'
                              : 'border-zon-rule hover:border-zon-gold-light'
                          }`}
                        >
                          <span className="font-medium">{preset.model}</span>
                          <span className="ml-1.5 text-xs text-zon-muted">
                            {preset.brand} · {preset.wattsStc}W
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {activePanel && (
                    <p className="mt-2 text-xs text-zon-muted">
                      From{' '}
                      <a
                        href={activePanel.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zon-gold-deep hover:underline"
                      >
                        {activePanel.brand}&apos;s own datasheet
                      </a>
                      . Check it against your copy — panel revisions change these numbers, and the
                      Voc coefficient in particular decides how many you may put in a string.
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-zon-muted">
                All of these are on the label on the back of the panel, and on its datasheet.
                Voc and the temperature coefficient are the two that decide whether your inverter
                survives — copy them exactly. Every manufacturer names them slightly differently,
                so each box lists the wording you are likely to see; there is a full{' '}
                <Link href="/guides/strings-and-mppt#datasheet" className="text-zon-gold-deep hover:underline">
                  translation table in the guide
                </Link>.
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
