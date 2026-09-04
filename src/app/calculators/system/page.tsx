'use client'

import Link from 'next/link'
import { AlertTriangle, Info, ClipboardList, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useLoadSummary, useBatterySummary, useInverterSummary, usePanelSummary, useArraySummary,
  useProtectionSummary,
} from '@/lib/calc-storage'
import {
  chainState, disagreements, assumptions, confidence, chainComplete,
  type Severity, type Sensitivity,
} from '@/lib/system-design'
import { stepById } from '@/lib/calc-steps'
import { usePersistentState } from '@/lib/calc-storage'
import { DEFAULT_TEMP_UNIT, type TempUnit } from '@/lib/temperature'
import CalculatorChrome from '@/components/calculators/CalculatorChrome'

/**
 * Step 7 — the whole chain at once.
 *
 * Not a summary page. The roadmap item is explicit about what it is for:
 * "four tools that each look authoritative and quietly disagree is the worst
 * configuration available", and this is "the only place the chain can say
 * 'this number depends on that assumption you made three steps ago'."
 *
 * So the order on the page is deliberate: DISAGREEMENTS first, because those
 * are the things no other page can see and the only ones that can stop a build.
 * Then the chain itself. Then the assumptions, ranked by how much they move
 * the answer rather than by which step they came from — a list in step order
 * teaches nothing about which one to go and check.
 */

const SEVERITY_STYLE: Record<Severity, { card: string; icon: string; word: string }> = {
  blocking: { card: 'border-zon-red', icon: 'text-zon-red', word: 'Blocking' },
  warning: { card: 'border-zon-amber', icon: 'text-zon-amber', word: 'Worth fixing' },
  note: { card: '', icon: 'text-zon-blue', word: 'Worth knowing' },
}

const SENSITIVITY_LABEL: Record<Sensitivity, string> = {
  high: 'moves the answer a lot',
  medium: 'moves the answer somewhat',
  low: 'minor',
}

export default function SystemPage() {
  const summaries = {
    load: useLoadSummary(),
    battery: useBatterySummary(),
    inverter: useInverterSummary(),
    panels: usePanelSummary(),
    array: useArraySummary(),
    protection: useProtectionSummary(),
  }

  // Same preference the array step writes, so temperatures read consistently
  // across the chain rather than reverting to Celsius here.
  const [unit] = usePersistentState<TempUnit>('zonzelf:tempUnit', DEFAULT_TEMP_UNIT)

  const steps = chainState(summaries)
  const conflicts = disagreements(summaries)
  const facts = assumptions(summaries, unit)
  const trust = confidence(summaries, unit)
  const complete = chainComplete(summaries)
  const anyDone = steps.some(s => s.done)

  const blocking = conflicts.filter(c => c.severity === 'blocking')

  return (
    <CalculatorChrome
      step="system"
      title="Your System"
      lede="Everything you have sized, in one place — and the things no single step could tell you. Each calculator is confident on its own terms; this page is where they have to agree with each other."
      note={
        <>
          Nothing here is a new calculation. It reads what the earlier steps published and looks
          for the places they disagree.
        </>
      }
    >
      {!anyDone ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-zon-body">
              Nothing to show yet — this page assembles what the other steps produce.{' '}
              <Link href="/calculators/load" className="text-zon-gold-deep hover:underline">
                Start with your loads
              </Link>{' '}
              and come back.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Disagreements first — the reason this page exists. */}
          {conflicts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-zon-ink">
                {blocking.length > 0
                  ? 'These steps disagree with each other'
                  : 'Worth resolving before you buy'}
              </h2>
              {conflicts.map(c => {
                const style = SEVERITY_STYLE[c.severity]
                return (
                  <Card key={c.id} className={style.card}>
                    <CardContent className="pt-4">
                      <div className="flex gap-3">
                        <AlertTriangle
                          className={`mt-0.5 h-5 w-5 shrink-0 ${style.icon}`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 space-y-2">
                          <p className="text-sm font-semibold text-zon-ink">
                            {c.title}
                            <span className="ml-2 text-xs font-normal uppercase tracking-wide text-zon-muted">
                              {style.word}
                            </span>
                          </p>
                          <p className="text-sm text-zon-body">{c.detail}</p>
                          <p className="text-sm text-zon-body">
                            <strong className="text-zon-ink">What to do.</strong> {c.resolution}
                          </p>
                          <p className="flex flex-wrap gap-3 pt-1 text-xs">
                            {c.steps.map(id => {
                              const step = stepById(id)
                              return step.href ? (
                                <Link
                                  key={id}
                                  href={step.href}
                                  className="text-zon-gold-deep hover:underline"
                                >
                                  Step {step.n}: {step.label} →
                                </Link>
                              ) : null
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </section>
          )}

          {/* The chain. */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-zon-ink">
              <ClipboardList className="h-4 w-4 text-zon-gold-deep" aria-hidden="true" />
              The chain so far
            </h2>
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-zon-rule-soft">
                  {steps.map(step => (
                    <li key={step.id} className="flex items-baseline gap-3 px-4 py-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                          step.done
                            ? 'bg-zon-gold text-zon-ink'
                            : 'bg-zon-rule-soft text-zon-muted'
                        }`}
                        aria-hidden="true"
                      >
                        {step.n}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-zon-ink">{step.label}</span>
                        <span className="block text-sm text-zon-muted">
                          {step.id === 'system'
                            ? 'You are here'
                            : step.headline ?? 'Not done yet'}
                        </span>
                      </span>
                      {step.href && !step.done && step.id !== 'system' && (
                        <Link
                          href={step.href}
                          className="shrink-0 text-xs text-zon-gold-deep hover:underline"
                        >
                          Do it →
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* The cable schedule — what to actually buy, per run. */}
          {summaries.protection && summaries.protection.runs.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-zon-ink">Cable schedule</h2>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">
                        The cable gauge chosen for each run, with its protection
                      </caption>
                      <thead>
                        <tr className="border-b border-zon-rule bg-zon-cream text-left text-zon-muted">
                          <th scope="col" className="px-4 py-2 font-medium">Run</th>
                          <th scope="col" className="px-3 py-2 text-right font-medium">Carries</th>
                          <th scope="col" className="px-3 py-2 text-right font-medium">Length</th>
                          <th scope="col" className="px-3 py-2 text-right font-medium">Gauge</th>
                          <th scope="col" className="px-3 py-2 text-right font-medium">Drop</th>
                          <th scope="col" className="px-4 py-2 font-medium">Protected by</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaries.protection.runs.map(r => (
                          <tr key={r.runId} className="border-b border-zon-rule-soft last:border-0">
                            <td className="px-4 py-2 text-zon-ink">{r.label}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-zon-body">
                              {r.amps}A at {r.volts}V
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-zon-body">
                              {r.oneWayFeet}ft
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-zon-ink">
                              {r.awgLabel} AWG
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-zon-body">
                              {r.dropPercent}%
                            </td>
                            <td className="px-4 py-2 text-zon-body">
                              {r.ocpdOptionsA.length > 0
                                ? `${r.ocpdOptionsA[0]}A${r.ocpdOptionsA.length > 1 ? ` (up to ${r.ocpdOptionsA[r.ocpdOptionsA.length - 1]}A)` : ''}`
                                : 'no standard device fits — see the step'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="border-t border-zon-rule px-4 py-3 text-xs text-zon-muted">
                    Lengths are what you entered, not measured for you. Every gauge here is a
                    choice you made from the set that passed both limits — copper only, and a
                    DC run needs a DC-rated device.
                  </p>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Confidence — qualitative, on purpose. */}
          <section>
            <Card className="bg-zon-cream">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-zon-ink">
                  How much to trust these numbers
                  <span className="ml-2 text-xs font-normal uppercase tracking-wide text-zon-muted">
                    {trust.level === 'wide'
                      ? 'wide band'
                      : trust.level === 'moderate'
                        ? 'moderate band'
                        : 'narrow band'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-zon-body">{trust.summary}</p>
                {trust.drivers.length > 0 && (
                  <ul className="ml-5 list-disc space-y-1 text-zon-body">
                    {trust.drivers.map(d => <li key={d}>{d}</li>)}
                  </ul>
                )}
                <p className="border-t border-zon-rule pt-2 text-xs text-zon-muted">
                  Deliberately a word rather than a percentage. A real interval would need error
                  distributions for peak sun at your site, your roof&apos;s soiling and your
                  household&apos;s behaviour — none of which exist here, so a number like
                  &ldquo;±20%&rdquo; would be invented. The reasons above are the useful part.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Assumptions, ranked by leverage. */}
          {facts.length > 0 && (
            <section>
              <h2 className="mb-1 text-lg font-semibold text-zon-ink">
                What these numbers rest on
              </h2>
              <p className="mb-3 text-sm text-zon-muted">
                Ranked by how much each one moves the answer, not by which step it came from.
                The ones marked <em>still at the default</em> are where a figure of your own
                would help most.
              </p>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <caption className="sr-only">
                        Every assumption behind the system, with where it was set and what it affects
                      </caption>
                      <thead>
                        <tr className="border-b border-zon-rule bg-zon-cream text-left text-zon-muted">
                          <th scope="col" className="px-4 py-2 font-medium">Assumption</th>
                          <th scope="col" className="px-4 py-2 font-medium">Set on</th>
                          <th scope="col" className="px-4 py-2 font-medium">What it changes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facts.map(a => {
                          const step = stepById(a.step)
                          return (
                            <tr key={a.id} className="border-b border-zon-rule-soft align-top last:border-0">
                              <td className="px-4 py-3">
                                <span className="block font-medium text-zon-ink">{a.label}</span>
                                <span className="block font-mono text-xs tabular-nums text-zon-body">
                                  {a.value}
                                </span>
                                {a.atDefault && (
                                  <span className="mt-1 inline-block rounded-full border border-zon-amber-tint bg-zon-amber-tint px-2 py-px text-[10px] text-zon-body">
                                    still at the default
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-zon-body">
                                {step.href ? (
                                  <Link href={step.href} className="text-zon-gold-deep hover:underline">
                                    Step {step.n}
                                  </Link>
                                ) : (
                                  <span>Step {step.n}</span>
                                )}
                                <span className="block text-xs text-zon-muted">{step.label}</span>
                              </td>
                              <td className="px-4 py-3 text-zon-body">
                                {a.affects}
                                <span className="mt-1 block text-xs text-zon-muted">
                                  {SENSITIVITY_LABEL[a.sensitivity]}
                                  {a.caveat ? ` · ${a.caveat}` : ''}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {complete && conflicts.length === 0 && (
            <Card className="border-zon-green-tint bg-zon-green-tint">
              <CardContent className="pt-4">
                <div className="flex gap-2 text-sm">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-zon-blue" aria-hidden="true" />
                  <p className="text-zon-body">
                    <strong className="text-zon-ink">Every step is done and nothing
                    contradicts.</strong> That is as far as this tool can take you — it does not
                    mean the design is right for your site. Have it checked by a licensed
                    electrician before you buy or build anything.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="flex items-center gap-2 text-sm text-zon-muted">
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            This page will grow: a printable bill of materials and a cost estimate are the
            obvious next additions, and neither exists yet.
          </p>
        </div>
      )}
    </CalculatorChrome>
  )
}
