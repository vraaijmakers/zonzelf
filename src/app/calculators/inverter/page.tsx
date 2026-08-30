'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Plug, Info, AlertTriangle, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  usePersistentState, useLoadSummary, publishInverterSummary,
  LOAD_APPLIANCES_KEY, DEFAULT_APPLIANCES, type StoredAppliance,
} from '@/lib/calc-storage'
import {
  peakDemand, inverterFit, suggestedContinuousW, CONTINUOUS_HEADROOM,
  INVERTER_SIZING_SOURCE, COMMON_INVERTER_SIZES, INVERTER_PRESETS,
  type InverterSpec,
} from '@/lib/inverter-sizing'
import { fieldHelp } from '@/lib/datasheet-vocabulary'
import { normalizeSurge, suggestedSurge, SURGE_SOURCE } from '@/lib/appliance-load'
import { recommendedSystemVoltageForPower, dcCurrentFor, DC_CURRENT_CEILING_A } from '@/lib/system-voltage'
import CalculatorChrome, { AnswerAnchor } from '@/components/calculators/CalculatorChrome'
import { RegisterBadge } from '@/components/ProtectionOutput'

/**
 * Step 3 — the unit, and the two numbers it is sold on.
 *
 * The page does two jobs that look like one. The first half is CAPACITY: how
 * many continuous watts and how many surge watts the house asks for. The
 * second half is DATA ENTRY for the array step, and it is the reason this step
 * moved ahead of panels — a string is designed against a specific tracker's
 * voltage window, so nothing about array wiring can be answered until these
 * fields exist.
 *
 * The PV fields deliberately start EMPTY. A default MPPT window would be a
 * number nobody chose, silently deciding a protection-register output two
 * steps later. "Read it off your datasheet" is the honest instruction, and
 * reading a datasheet is the skill this site exists to teach.
 */

/** The unit being described. Nulls mean "not filled in", never "zero volts". */
interface UnitDraft {
  brand: string
  model: string
  acContinuousW: number | null
  acSurgeW: number | null
  dcSystemVoltage: number
  pvMaxInputV: number | null
  mpptMinV: number | null
  mpptMaxV: number | null
  mpptStartV: number | null
  mpptCount: number
  pvMaxPowerW: number | null
  pvMaxCurrentA: number | null
  maxChargeCurrentA: number | null
}

const EMPTY_UNIT: UnitDraft = {
  brand: '', model: '',
  acContinuousW: null, acSurgeW: null, dcSystemVoltage: 48,
  pvMaxInputV: null, mpptMinV: null, mpptMaxV: null, mpptStartV: null,
  mpptCount: 1, pvMaxPowerW: null, pvMaxCurrentA: null, maxChargeCurrentA: null,
}

/** Everything the array step cannot proceed without. */
const REQUIRED: (keyof UnitDraft)[] = ['pvMaxInputV', 'mpptMinV', 'mpptMaxV', 'pvMaxPowerW', 'pvMaxCurrentA']

const num = (v: string): number | null => {
  if (v.trim() === '') return null
  const n = parseFloat(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * What the same number is called on a real datasheet.
 *
 * This is not decoration. A session on a Sun Gold SPH10048P left five of nine
 * fields blank while the datasheet stated every one of them, purely because
 * our names and theirs did not match. Reading is the hard part of this step,
 * so the translation belongs next to the box, not in a guide two clicks away.
 */
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
        <span className="text-zon-muted"> · look under &ldquo;{help.section}&rdquo;</span>
      </p>
      {help.gotcha && <p className="mt-1 text-xs text-zon-body">{help.gotcha}</p>}
    </>
  )
}

function NumField({
  id, label, unit, value, onChange, hint, placeholder,
}: {
  id: string
  label: string
  unit: string
  value: number | null
  onChange: (v: number | null) => void
  hint?: string
  placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1 text-zon-ink">{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={e => onChange(num(e.target.value))}
          min="0"
          className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-32 rounded-lg border border-zon-rule px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
        />
        <span className="text-sm text-zon-muted">{unit}</span>
      </div>
      {hint && <p className="mt-1 text-xs text-zon-muted">{hint}</p>}
      <FieldHelp id={id} />
    </div>
  )
}

export default function InverterSizingPage() {
  const [appliances, setAppliances] = usePersistentState<StoredAppliance[]>(LOAD_APPLIANCES_KEY, DEFAULT_APPLIANCES)
  const [unit, setUnit] = usePersistentState<UnitDraft>('zonzelf:inverter:unit', EMPTY_UNIT)
  const loadSummary = useLoadSummary()

  const demand = peakDemand(appliances)
  const suggested = suggestedContinuousW(demand)
  const hasLoads = appliances.length > 0 && demand.continuousW > 0

  const missing = REQUIRED.filter(k => unit[k] === null)
  const pvComplete = missing.length === 0
  const fit = unit.acContinuousW !== null
    ? inverterFit({ acContinuousW: unit.acContinuousW, acSurgeW: unit.acSurgeW ?? undefined }, demand)
    : null

  // The window is only meaningful if the two numbers are the right way round.
  const windowInverted =
    unit.mpptMinV !== null && unit.mpptMaxV !== null && unit.mpptMinV >= unit.mpptMaxV
  const ceilingBelowWindow =
    unit.pvMaxInputV !== null && unit.mpptMaxV !== null && unit.pvMaxInputV < unit.mpptMaxV

  // Publish only once every field the array step reads actually exists. A
  // partial summary would let step 5 size a string against a null window.
  useEffect(() => {
    if (!pvComplete || unit.acContinuousW === null) return
    publishInverterSummary({
      brand: unit.brand.trim() || undefined,
      model: unit.model.trim() || undefined,
      acContinuousW: unit.acContinuousW,
      acSurgeW: unit.acSurgeW ?? 0,
      dcSystemVoltage: unit.dcSystemVoltage,
      pvMaxInputV: unit.pvMaxInputV!,
      mpptMinV: unit.mpptMinV!,
      mpptMaxV: unit.mpptMaxV!,
      mpptStartV: unit.mpptStartV ?? undefined,
      mpptCount: unit.mpptCount,
      pvMaxPowerW: unit.pvMaxPowerW!,
      pvMaxCurrentA: unit.pvMaxCurrentA!,
      maxChargeCurrentA: unit.maxChargeCurrentA ?? undefined,
    })
  }, [unit, pvComplete])

  const set = <K extends keyof UnitDraft>(key: K, value: UnitDraft[K]) =>
    setUnit(u => ({ ...u, [key]: value }))

  const applyPreset = (preset: InverterSpec) =>
    setUnit({
      brand: preset.brand,
      model: preset.model,
      acContinuousW: preset.acContinuousW,
      acSurgeW: preset.acSurgeW ?? null,
      dcSystemVoltage: preset.dcSystemVoltage,
      pvMaxInputV: preset.pvMaxInputV,
      mpptMinV: preset.mpptMinV,
      mpptMaxV: preset.mpptMaxV,
      mpptStartV: preset.mpptStartV ?? null,
      mpptCount: preset.mpptCount,
      pvMaxPowerW: preset.pvMaxPowerW,
      pvMaxCurrentA: preset.pvMaxCurrentA,
      maxChargeCurrentA: preset.maxChargeCurrentA ?? null,
    })

  const activePreset = INVERTER_PRESETS.find(
    p => p.brand === unit.brand && p.model === unit.model,
  )

  const setSurge = (id: number, surge: number) =>
    setAppliances(rows => rows.map(r => (r.id === id ? { ...r, surge } : r)))

  const voltageForPower = recommendedSystemVoltageForPower(demand.continuousW)

  const answerSummary = {
    headline: hasLoads ? `${Math.round(demand.surgeW).toLocaleString()} W` : '—',
    detail: hasLoads
      ? `surge · ${Math.round(demand.continuousW).toLocaleString()} W continuous`
      : 'add appliances at step 1',
    rows: hasLoads
      ? [
          {
            id: 'continuous',
            label: 'Everything running at once',
            value: `${Math.round(demand.continuousW).toLocaleString()} W`,
            sub: `wants ${Math.round(fit?.wantedContinuousW ?? demand.continuousW * (1 + CONTINUOUS_HEADROOM)).toLocaleString()} W with headroom`,
          },
          {
            id: 'surge',
            label: 'Plus the hardest single start-up',
            value: `${Math.round(demand.surgeW).toLocaleString()} W`,
            sub: demand.driver
              ? `${demand.driver.name} at ${demand.driver.surge}x`
              : 'nothing in your list surges',
          },
        ]
      : undefined,
  }

  return (
    <CalculatorChrome
      step="inverter"
      title="Inverter & Surge Sizing"
      lede="An inverter is sold on two numbers, and people buy on the first one. Continuous is what it carries all day. Surge is what it carries for a few seconds while a motor starts — and that is the number that decides whether your well pump ever runs."
      note={
        <>
          This step also collects your unit&apos;s solar input specifications, because the
          next two steps design the array into them. See{' '}
          <Link href="/guides/how-it-works" className="text-zon-gold-deep hover:underline">
            how a solar system actually works
          </Link>{' '}
          for where the inverter sits in the chain.
        </>
      }
      answer={answerSummary}
      actionSummary={
        <p className="flex items-baseline gap-2 text-sm text-zon-muted">
          Needs
          <span className="font-bold tabular-nums text-zon-gold-deep">
            {hasLoads ? `${Math.round(demand.surgeW).toLocaleString()} W` : '—'}
          </span>
          <span>surge</span>
        </p>
      }
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="order-first min-w-0 space-y-4 lg:order-last lg:col-span-2">
          <AnswerAnchor>
            <div className="space-y-4 lg:sticky lg:top-32">
              <Card className="border-zon-gold-light bg-zon-gold-tint">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span className="flex items-center gap-2">
                      <Plug className="h-4 w-4 text-zon-gold-deep" />
                      What the house asks for
                    </span>
                    <RegisterBadge register="capacity" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wide text-zon-muted">
                      Continuous, everything at once
                    </p>
                    <p className="text-4xl font-bold text-zon-gold-deep">
                      {hasLoads ? `${Math.round(demand.continuousW).toLocaleString()} W` : '—'}
                    </p>
                    {hasLoads && (
                      <p className="text-sm text-zon-muted">
                        {Math.round(demand.continuousW * (1 + CONTINUOUS_HEADROOM)).toLocaleString()} W
                        with {Math.round(CONTINUOUS_HEADROOM * 100)}% headroom
                      </p>
                    )}
                  </div>

                  <div className="border-t border-zon-gold-light pt-3">
                    <p className="mb-1 text-xs uppercase tracking-wide text-zon-muted">
                      Surge, for a few seconds
                    </p>
                    <p className="text-2xl font-bold text-zon-ink">
                      {hasLoads ? `${Math.round(demand.surgeW).toLocaleString()} W` : '—'}
                    </p>
                    <p className="text-xs text-zon-muted">
                      {demand.driver
                        ? `${Math.round(demand.continuousW).toLocaleString()} W running, plus ${Math.round(demand.surgeHeadroomW).toLocaleString()} W while the ${demand.driver.name.toLowerCase()} starts`
                        : 'Nothing in your list has a start-up surge.'}
                    </p>
                  </div>

                  {suggested !== null && (
                    <div className="border-t border-zon-gold-light pt-3">
                      <p className="mb-1 text-xs uppercase tracking-wide text-zon-muted">
                        Smallest common size that fits
                      </p>
                      <p className="text-xl font-bold text-zon-ink">
                        {suggested.toLocaleString()} W continuous
                      </p>
                      <p className="text-xs text-zon-muted">
                        Check its surge column separately — a unit can carry your continuous
                        load and still trip on the start-up.
                      </p>
                    </div>
                  )}

                  {hasLoads && (
                    <div className="border-t border-zon-gold-light pt-3 text-xs text-zon-muted">
                      <div className="flex justify-between">
                        <span>Biggest single load</span>
                        <span className="font-medium tabular-nums text-zon-body">
                          {Math.round(demand.largestSingleW).toLocaleString()} W
                        </span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span>Suits a bank at</span>
                        <span className="font-medium tabular-nums text-zon-body">
                          {voltageForPower}V
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {fit && (
                <Card className={fit.continuous === 'short' || fit.surge === 'short' ? 'border-zon-red' : ''}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-zon-ink">
                      {unit.brand || unit.model ? `${unit.brand} ${unit.model}`.trim() : 'Your unit'} against that
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-zon-body">Continuous</span>
                      <span className="tabular-nums text-zon-ink">
                        {unit.acContinuousW?.toLocaleString()} W
                        <span className={`ml-2 text-xs font-medium ${
                          fit.continuous === 'ok' ? 'text-green-700'
                            : fit.continuous === 'tight' ? 'text-zon-amber' : 'text-zon-red'
                        }`}>
                          {fit.continuous === 'ok' ? 'comfortable'
                            : fit.continuous === 'tight' ? 'tight' : 'short'}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-zon-body">Surge</span>
                      <span className="tabular-nums text-zon-ink">
                        {unit.acSurgeW !== null ? `${unit.acSurgeW.toLocaleString()} W` : 'not stated'}
                        <span className={`ml-2 text-xs font-medium ${
                          fit.surge === 'ok' ? 'text-green-700'
                            : fit.surge === 'short' ? 'text-zon-red' : 'text-zon-muted'
                        }`}>
                          {fit.surge === 'ok' ? 'covers it'
                            : fit.surge === 'short' ? 'will trip' : 'unknown'}
                        </span>
                      </span>
                    </div>
                    {fit.surge === 'unknown' && (
                      <p className="text-xs text-zon-muted">
                        Plenty of datasheets leave the surge column out. That is worth chasing
                        down rather than assuming — it is the number your compressor depends on.
                      </p>
                    )}
                    {fit.continuous === 'short' && (
                      <p className="flex gap-2 text-xs text-zon-body">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-zon-red" aria-hidden="true" />
                        This unit cannot carry your loads with everything on. Either it is too
                        small, or some of these appliances never run together — decide which,
                        rather than hoping.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="pt-4">
                  <div className="flex gap-2 text-xs text-zon-muted">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-zon-blue" aria-hidden="true" />
                    <p>
                      <strong className="text-zon-body">Bigger is the safe mistake here.</strong>{' '}
                      An oversized inverter costs money and idles slightly less efficiently. An
                      undersized one shuts down mid-shower. That is the opposite of the battery
                      step, where oversizing is the expensive mistake.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AnswerAnchor>
        </div>

        <div className="min-w-0 space-y-5 lg:col-span-3">
          {/* Surge, per appliance — the derivation, not a sidebar detail. */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-zon-body">
                <Zap className="h-4 w-4 text-zon-gold-deep" aria-hidden="true" />
                What starts hard
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!hasLoads ? (
                <p className="px-4 py-4 text-sm text-zon-muted">
                  No appliances yet.{' '}
                  <Link href="/calculators/load" className="text-zon-gold-deep hover:underline">
                    Add them at step 1
                  </Link>{' '}
                  and their start-up surge appears here.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <caption className="sr-only">
                        Running watts and start-up surge for each appliance
                      </caption>
                      <thead>
                        <tr className="border-b border-zon-rule bg-zon-cream text-zon-muted">
                          <th scope="col" className="px-4 py-2 text-left">Appliance</th>
                          <th scope="col" className="px-3 py-2 text-right">Running</th>
                          <th scope="col" className="px-3 py-2 text-right">Start-up</th>
                          <th scope="col" className="px-4 py-2 text-right">Peak draw</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appliances.map(row => {
                          const surge = normalizeSurge(row.surge)
                          const running = (row.watts || 0) * (row.qty || 0)
                          const better = suggestedSurge(row.name, row.surge)
                          const isDriver =
                            demand.driver !== null &&
                            (row.watts || 0) * (surge - 1) === demand.surgeHeadroomW &&
                            demand.surgeHeadroomW > 0
                          return (
                            <tr key={row.id} className="border-b border-zon-rule-soft">
                              <td className="px-4 py-2 text-zon-ink">
                                {row.name || 'Unnamed'}
                                {isDriver && (
                                  <span className="ml-2 text-zon-gold-deep">sets the surge</span>
                                )}
                                {better !== undefined && (
                                  <button
                                    onClick={() => setSurge(row.id, better)}
                                    className="ml-2 rounded-full border border-zon-gold-light bg-zon-gold-tint px-2 py-px text-[10px] text-zon-gold-deep"
                                  >
                                    use {better}x
                                  </button>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-zon-body">
                                {Math.round(running).toLocaleString()} W
                              </td>
                              <td className="px-3 py-2 text-right">
                                <label className="sr-only" htmlFor={`surge-${row.id}`}>
                                  Start-up multiple for {row.name || 'this appliance'}
                                </label>
                                <input
                                  id={`surge-${row.id}`}
                                  type="number"
                                  value={surge}
                                  step="0.5" min="1" max="10"
                                  onChange={e => setSurge(row.id, normalizeSurge(parseFloat(e.target.value)))}
                                  className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-14 rounded border border-zon-rule px-2 py-1 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                                />
                                <span className="ml-1 text-zon-muted">x</span>
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums text-zon-body">
                                {Math.round(running + (row.watts || 0) * (surge - 1)).toLocaleString()} W
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="space-y-2 border-t border-zon-rule px-4 py-3 text-xs text-zon-muted">
                    <p>
                      <strong className="text-zon-body">How the surge figure is built.</strong>{' '}
                      Everything running at once is{' '}
                      <span className="tabular-nums">{Math.round(demand.continuousW).toLocaleString()} W</span>.
                      {demand.driver
                        ? ` The hardest single start-up is the ${demand.driver.name.toLowerCase()}, which adds ${Math.round(demand.surgeHeadroomW).toLocaleString()} W on top of what it already draws — giving ${Math.round(demand.surgeW).toLocaleString()} W.`
                        : ' Nothing in the list surges, so the surge figure is the same as the continuous one.'}{' '}
                      Only the largest start-up is added: motors do not start in the same
                      half-second, and adding every surge together sizes for a coincidence.
                    </p>
                    <p>{SURGE_SOURCE}</p>
                    <p>{INVERTER_SIZING_SOURCE}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* The unit's own specifications. */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zon-body">Your unit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-1">
              {INVERTER_PRESETS.length > 0 && (
                <div className="rounded-lg bg-zon-rule-soft p-3">
                  <p className="mb-2 text-xs font-medium text-zon-muted">
                    Units we have already read the datasheet for
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {INVERTER_PRESETS.map(preset => {
                      const active = unit.brand === preset.brand && unit.model === preset.model
                      return (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset)}
                          aria-pressed={active}
                          className={`rounded-lg border px-3 py-1.5 text-left text-sm transition-colors ${
                            active
                              ? 'border-zon-gold bg-zon-gold text-zon-ink'
                              : 'border-zon-rule hover:border-zon-gold-light'
                          }`}
                        >
                          <span className="font-medium">{preset.model}</span>
                          <span className="ml-1.5 text-xs text-zon-muted">
                            {preset.brand} · {(preset.acContinuousW / 1000).toFixed(0)} kW
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-xs text-zon-muted">
                    Picking one fills every field below from the manufacturer&apos;s own manual,
                    so you can see what a completed set looks like — then check it against your
                    own copy. It is a short list; typing your own datasheet in is the normal path,
                    not the fallback.
                  </p>
                </div>
              )}

              <p className="text-xs text-zon-muted">
                Otherwise, copy them off the datasheet for the unit you have or are considering —
                the manufacturer&apos;s own, not a shop listing. Every one of them decides how
                your panels may be wired, and a transcription error here is how an inverter gets
                destroyed. Nothing is filled in by default, because a solar input window nobody
                chose is not a safe starting point. Each box lists the wording your datasheet is
                likely to use instead of ours; there is a full{' '}
                <Link href="/guides/strings-and-mppt#datasheet" className="text-zon-gold-deep hover:underline">
                  translation table in the guide
                </Link>.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="unit-brand" className="mb-1 block text-sm font-medium text-zon-ink">Brand</label>
                  <input
                    id="unit-brand" type="text" value={unit.brand}
                    onChange={e => set('brand', e.target.value)}
                    placeholder="EG4, Victron, Growatt…"
                    className="w-full rounded-lg border border-zon-rule px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                  />
                </div>
                <div>
                  <label htmlFor="unit-model" className="mb-1 block text-sm font-medium text-zon-ink">Model</label>
                  <input
                    id="unit-model" type="text" value={unit.model}
                    onChange={e => set('model', e.target.value)}
                    className="w-full rounded-lg border border-zon-rule px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <NumField
                  id="unit-ac-cont" label="Continuous AC output" unit="W"
                  value={unit.acContinuousW} onChange={v => set('acContinuousW', v)}
                  hint="What it carries all day."
                />
                <NumField
                  id="unit-ac-surge" label="Surge / peak output" unit="W"
                  value={unit.acSurgeW} onChange={v => set('acSurgeW', v)}
                  hint="Leave blank if the datasheet does not state one."
                />
              </div>

              <div role="group" aria-labelledby="unit-dc-label">
                <span id="unit-dc-label" className="mb-1 block text-sm font-medium text-zon-ink">
                  Battery voltage
                </span>
                <div className="flex flex-wrap gap-2">
                  {[12, 24, 48].map(v => (
                    <button
                      key={v} onClick={() => set('dcSystemVoltage', v)} aria-pressed={unit.dcSystemVoltage === v}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        unit.dcSystemVoltage === v
                          ? 'border-zon-gold bg-zon-gold text-zon-ink'
                          : 'border-zon-rule hover:border-zon-gold-light'
                      }`}
                    >
                      {v}V
                    </button>
                  ))}
                </div>
                <FieldHelp id="unit-dc-label" />
                {demand.continuousW > 0 && (
                  <p className="mt-1 text-xs text-zon-body">
                    At {Math.round(demand.continuousW).toLocaleString()} W continuous, a{' '}
                    {unit.dcSystemVoltage}V bank carries about{' '}
                    <span className="tabular-nums">
                      {Math.round(dcCurrentFor(demand.continuousW, unit.dcSystemVoltage))}A
                    </span>
                    {dcCurrentFor(demand.continuousW, unit.dcSystemVoltage) > DC_CURRENT_CEILING_A ? (
                      <>
                        {' '}— past the {DC_CURRENT_CEILING_A}A the DC main run is usually kept
                        under. At {voltageForPower}V it would be{' '}
                        <span className="tabular-nums">
                          {Math.round(dcCurrentFor(demand.continuousW, voltageForPower))}A
                        </span>
                        , which is the same power through half the cable.
                      </>
                    ) : (
                      <>
                        , comfortably under the {DC_CURRENT_CEILING_A}A the DC main run is
                        usually kept below. A higher battery voltage is never the problem —
                        only the current is.
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="border-t border-zon-rule pt-4">
                <p className="mb-1 text-sm font-semibold text-zon-ink">Solar input</p>
                <p className="mb-4 text-xs text-zon-muted">
                  These decide how your panels may be wired. Two of them are easy to confuse
                  and they are not the same thing: the <strong>maximum PV input voltage</strong>{' '}
                  is a damage limit, and the top of the <strong>MPPT window</strong> is where it
                  stops tracking well. If your datasheet truly gives only one number, put it in
                  both — but check first, because most print both, a row apart.
                </p>

                <div className="mb-4">
                  <NumField
                    id="unit-pv-max-v" label="Max PV input voltage" unit="V"
                    value={unit.pvMaxInputV} onChange={v => set('pvMaxInputV', v)}
                    hint="Absolute ceiling. Above it the unit is destroyed."
                  />
                </div>

                {/* One row on the datasheet, two boxes here — which is exactly
                    how the top number ends up unfilled. Presented as the range
                    it is printed as, with the two limits kept visibly apart
                    from the damage ceiling above. */}
                <fieldset className="mb-4 rounded-lg border border-zon-rule p-3">
                  <legend className="px-1 text-sm font-medium text-zon-ink">
                    MPPT operating voltage range
                  </legend>
                  <p className="mb-3 text-xs text-zon-muted">
                    Your datasheet prints this as a single range — &ldquo;125 Vdc–425 Vdc&rdquo;,
                    say. The first number goes in <em>from</em>, the second in <em>to</em>. Both
                    are lower than the maximum PV input voltage above, and that is normal.
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label htmlFor="unit-mppt-min" className="mb-1 block text-xs font-medium text-zon-body">
                        From
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="unit-mppt-min" type="number" inputMode="decimal"
                          value={unit.mpptMinV ?? ''}
                          onChange={e => set('mpptMinV', num(e.target.value))}
                          min="0"
                          className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-24 rounded-lg border border-zon-rule px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                        />
                        <span className="text-sm text-zon-muted">V</span>
                      </div>
                    </div>
                    <span aria-hidden="true" className="pb-2 text-zon-muted">–</span>
                    <div>
                      <label htmlFor="unit-mppt-max" className="mb-1 block text-xs font-medium text-zon-body">
                        To
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="unit-mppt-max" type="number" inputMode="decimal"
                          value={unit.mpptMaxV ?? ''}
                          onChange={e => set('mpptMaxV', num(e.target.value))}
                          min="0"
                          className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-24 rounded-lg border border-zon-rule px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                        />
                        <span className="text-sm text-zon-muted">V</span>
                      </div>
                    </div>
                    <p className="min-w-[12rem] flex-1 text-xs text-zon-muted">
                      Below the first it cannot track at all; above the second it clips or drops
                      out, but survives.
                    </p>
                  </div>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <NumField
                    id="unit-mppt-start" label="Start-up voltage" unit="V"
                    value={unit.mpptStartV} onChange={v => set('mpptStartV', v)}
                    hint="Optional. Often lower than the window bottom."
                  />
                  <NumField
                    id="unit-pv-power" label="Max PV input power" unit="W"
                    value={unit.pvMaxPowerW} onChange={v => set('pvMaxPowerW', v)}
                    hint="Total array watts the unit accepts."
                  />
                  <NumField
                    id="unit-pv-current" label="Max PV current per tracker" unit="A"
                    value={unit.pvMaxCurrentA} onChange={v => set('pvMaxCurrentA', v)}
                    hint="What limits how many strings go in parallel."
                  />
                  <NumField
                    id="unit-charge" label="Max battery charge current" unit="A"
                    value={unit.maxChargeCurrentA} onChange={v => set('maxChargeCurrentA', v)}
                    hint="Optional here; used when sizing battery cable."
                  />
                  <div>
                    <label htmlFor="unit-mppt-count" className="mb-1 block text-sm font-medium text-zon-ink">
                      Number of MPPTs
                    </label>
                    <input
                      id="unit-mppt-count" type="number" value={unit.mpptCount}
                      min="1" max="6"
                      onChange={e => set('mpptCount', Math.min(6, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-32 rounded-lg border border-zon-rule px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zon-gold-light"
                    />
                    <p className="mt-1 text-xs text-zon-muted">
                      Independent trackers. Each has its own window and current limit.
                    </p>
                  </div>
                </div>

                {windowInverted && (
                  <p className="mt-3 rounded-lg border border-zon-amber-tint bg-zon-amber-tint px-3 py-2 text-xs text-zon-body">
                    The bottom of the MPPT window is at or above the top. Check you have not
                    swapped them — the window is a range the string voltage has to sit inside.
                  </p>
                )}
                {ceilingBelowWindow && (
                  <p className="mt-3 rounded-lg border border-zon-amber-tint bg-zon-amber-tint px-3 py-2 text-xs text-zon-body">
                    The maximum PV input voltage is below the top of the MPPT window, which no
                    datasheet should say. The absolute maximum is always the higher of the two.
                  </p>
                )}

                {activePreset && (
                  <p className="mt-4 text-xs text-zon-muted">
                    These figures are from{' '}
                    <a
                      href={activePreset.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zon-gold-deep hover:underline"
                    >
                      {activePreset.brand}&apos;s own manual
                    </a>
                    . Check them against your copy before you buy anything — we can transcribe a
                    datasheet, but we cannot know which revision of the unit you have.
                  </p>
                )}

                <div className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
                  pvComplete
                    ? 'border-zon-green-tint bg-zon-green-tint text-zon-body'
                    : 'border-zon-rule bg-zon-rule-soft text-zon-muted'
                }`}>
                  {pvComplete
                    ? 'Solar input is complete — the array wiring step can size your strings against this unit.'
                    : `Still needed before the array can be wired: ${missing.length} field${missing.length === 1 ? '' : 's'}. Panel sizing at step 4 works without them; the wiring at step 5 does not.`}
                </div>
              </div>
            </CardContent>
          </Card>

          {!loadSummary && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-zon-muted">
                  These are the starter appliances, not yours — you have not been through the
                  load calculator yet.{' '}
                  <Link href="/calculators/load" className="text-zon-gold-deep hover:underline">
                    Build your own list at step 1
                  </Link>{' '}
                  and these figures become about your house.
                </p>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-zon-muted">
            Common continuous ratings on the market:{' '}
            {COMMON_INVERTER_SIZES.map(w => `${w.toLocaleString()}W`).join(' · ')}.
          </p>
        </div>
      </div>
    </CalculatorChrome>
  )
}
