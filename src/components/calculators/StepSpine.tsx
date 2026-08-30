'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  CALC_STEPS, TOTAL_STEPS, stepById, type CalcStep, type StepId,
} from '@/lib/calc-steps'
import {
  usePersistentState, LOAD_SUMMARY_KEY, BATTERY_SUMMARY_KEY, PANEL_SUMMARY_KEY,
  INVERTER_SUMMARY_KEY,
} from '@/lib/calc-storage'
import { cn } from '@/lib/utils'

/** One selectable line in the collapsed answer's sheet. */
export interface AnswerRow {
  id: string
  label: string
  value: string
  sub?: string
  selected?: boolean
  onSelect?: () => void
}

/**
 * What the strip shows once the full answer card has scrolled away. Small and
 * structured on purpose: the rich card stays on the page and is never
 * duplicated into the DOM twice, so there are no repeated ids and no second
 * copy to drift.
 */
export interface AnswerSummary {
  headline: string
  detail: string
  rows?: AnswerRow[]
}

/**
 * Which steps have produced a result, read from what each calculator already
 * publishes. Nothing new is stored for this — a step counts as done when its
 * summary exists, which is the same signal the calculators use to inherit each
 * other's numbers.
 *
 * Empty on the server and through hydration, so the rail renders its
 * not-yet-done state first and fills in. Deliberate: a tick that flickered off
 * would be worse than one that arrives a frame late.
 */
function useCompletedSteps(): Set<StepId> {
  const [load] = usePersistentState<unknown>(LOAD_SUMMARY_KEY, null)
  const [battery] = usePersistentState<unknown>(BATTERY_SUMMARY_KEY, null)
  const [inverter] = usePersistentState<unknown>(INVERTER_SUMMARY_KEY, null)
  const [panels] = usePersistentState<unknown>(PANEL_SUMMARY_KEY, null)

  const done = new Set<StepId>()
  if (load) done.add('load')
  if (battery) done.add('battery')
  if (inverter) done.add('inverter')
  if (panels) done.add('panels')
  return done
}

type StepState = 'done' | 'current' | 'todo' | 'unbuilt'

function stateOf(step: CalcStep, current: StepId, done: Set<StepId>): StepState {
  if (step.id === current) return 'current'
  if (step.href === null) return 'unbuilt'
  return done.has(step.id) ? 'done' : 'todo'
}

function Segment({ state }: { state: StepState }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'h-1 flex-1 rounded-full',
        state === 'done' && 'bg-zon-gold-deep',
        state === 'current' && 'bg-zon-gold',
        state === 'todo' && 'bg-zon-rule',
        // Dashes, not a fill: this step has no page behind it yet.
        state === 'unbuilt' && 'bg-[repeating-linear-gradient(90deg,var(--zon-rule)_0_4px,transparent_4px_7px)]',
      )}
    />
  )
}

function StepMarker({ step, state }: { step: CalcStep; state: StepState }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
        state === 'done' && 'bg-zon-green text-white',
        state === 'current' && 'bg-zon-gold text-zon-ink',
        state === 'todo' && 'text-zon-muted ring-1 ring-inset ring-zon-rule',
        state === 'unbuilt' && 'text-zon-muted/70 ring-1 ring-inset ring-zon-rule-soft',
      )}
    >
      {state === 'done' ? <Check className="h-3 w-3" strokeWidth={3.5} /> : step.n}
    </span>
  )
}

function SoonTag() {
  return (
    <span className="rounded-full border border-dashed border-zon-rule px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-zon-muted">
      soon
    </span>
  )
}

export default function StepSpine({
  current,
  answer,
  onJumpToAnswer,
}: {
  current: StepId
  /** Set only while the full answer card is off screen. */
  answer?: AnswerSummary | null
  onJumpToAnswer?: () => void
}) {
  const [sheet, setSheet] = useState<'steps' | 'answer' | null>(null)
  const done = useCompletedSteps()
  const step = stepById(current)

  const collapsed = answer != null
  const rows = answer?.rows ?? []

  function toggleAnswerSheet() {
    if (rows.length > 0) setSheet(s => (s === 'answer' ? null : 'answer'))
    else onJumpToAnswer?.()
  }

  return (
    <nav
      aria-label="Sizing steps"
      className="sticky top-16 z-40 border-b border-zon-rule bg-zon-cream/95 backdrop-blur supports-[backdrop-filter]:bg-zon-cream/80"
    >
      <div className="mx-auto max-w-5xl px-4">

        {/* Compact — phones and small tablets. One strip, two jobs: where you
            are in the chain, and (once it scrolls away) what the answer is. The
            row height is identical in both states so the bar never jumps. */}
        <div className="flex flex-col gap-[7px] py-2.5 lg:hidden">
          <div className="flex min-h-6 items-center justify-between gap-3">
            {collapsed ? (
              <>
                <button
                  type="button"
                  onClick={toggleAnswerSheet}
                  aria-expanded={rows.length > 0 ? sheet === 'answer' : undefined}
                  className="-my-1 -ml-1 flex min-w-0 items-baseline gap-2 rounded px-1 py-1 text-left"
                >
                  <span className="shrink-0 text-[19px] font-bold leading-6 tabular-nums text-zon-gold-deep">
                    {answer.headline}
                  </span>
                  <span className="truncate text-[11px] text-zon-body">{answer.detail}</span>
                  {rows.length > 0 && (
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 self-center text-zon-gold-deep transition-transform',
                        sheet === 'answer' && 'rotate-180',
                      )}
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSheet(s => (s === 'steps' ? null : 'steps'))}
                  aria-expanded={sheet === 'steps'}
                  aria-label={`Step ${step.n} of ${TOTAL_STEPS}: ${step.label}. Show all steps`}
                  className="-my-1 -mr-1 flex shrink-0 items-center gap-0.5 rounded px-1 py-1 text-xs font-semibold tabular-nums text-zon-muted"
                >
                  {step.n}/{TOTAL_STEPS}
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', sheet === 'steps' && 'rotate-180')} />
                </button>
              </>
            ) : (
              <>
                <p className="flex min-w-0 items-baseline gap-1.5">
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-zon-muted">
                    Step {step.n} of {TOTAL_STEPS}
                  </span>
                  <span className="truncate text-[13px] font-semibold text-zon-ink">{step.label}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setSheet(s => (s === 'steps' ? null : 'steps'))}
                  aria-expanded={sheet === 'steps'}
                  className="-my-1 -mr-1 flex shrink-0 items-center gap-0.5 rounded px-1 py-1 text-xs font-medium text-zon-gold-deep"
                >
                  All steps
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', sheet === 'steps' && 'rotate-180')} />
                </button>
              </>
            )}
          </div>
          <ol className="flex items-center gap-1.5">
            {CALC_STEPS.map(s => (
              <li key={s.id} className="flex flex-1">
                <Segment state={stateOf(s, current, done)} />
              </li>
            ))}
          </ol>
        </div>

        {/* Wide — every step named. There is room here to say what the chain is.
            The gaps are tight on purpose: at lg the rail has 992px to fit seven
            steps, and at gap-2.5 its intrinsic width was 992px exactly — no
            slack, so a slightly wider font or a browser zoom tipped it into a
            horizontal scrollbar. overflow-x-auto stays as a floor, not as the
            normal case. */}
        <ol className="hidden items-center gap-2 overflow-x-auto py-3 lg:flex">
          {CALC_STEPS.map((s, i) => {
            const state = stateOf(s, current, done)
            const body = (
              <span className="flex items-center gap-2 whitespace-nowrap">
                <StepMarker step={s} state={state} />
                <span
                  className={cn(
                    'text-[13px]',
                    state === 'current' && 'font-bold text-zon-ink',
                    state === 'done' && 'font-medium text-zon-body',
                    state === 'todo' && 'text-zon-body',
                    state === 'unbuilt' && 'text-zon-muted',
                  )}
                >
                  {s.short}
                </span>
                {state === 'unbuilt' && <SoonTag />}
              </span>
            )
            return (
              <li key={s.id} className={cn('flex items-center', i > 0 && 'min-w-0 flex-1 gap-2')}>
                {i > 0 && <span aria-hidden="true" className="h-px min-w-1 flex-1 bg-zon-rule" />}
                {s.href && state !== 'current' ? (
                  <Link href={s.href} className="rounded transition-opacity hover:opacity-70">
                    {body}
                  </Link>
                ) : (
                  <span aria-current={state === 'current' ? 'step' : undefined}>{body}</span>
                )}
              </li>
            )
          })}
        </ol>

        {/* The chain, explained rather than just listed. */}
        {sheet === 'steps' && (
          <ol className="border-t border-zon-rule py-2 lg:hidden">
            {CALC_STEPS.map(s => {
              const state = stateOf(s, current, done)
              const row = (
                <span className="flex items-start gap-3 py-2">
                  <StepMarker step={s} state={state} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-[13px]',
                          state === 'current' ? 'font-semibold text-zon-ink' : 'font-medium text-zon-body',
                          state === 'unbuilt' && 'font-normal text-zon-muted',
                        )}
                      >
                        {s.label}
                      </span>
                      {state === 'unbuilt' && <SoonTag />}
                    </span>
                    <span className="text-[11px] leading-4 text-zon-muted">{s.blurb}</span>
                  </span>
                </span>
              )
              return (
                <li key={s.id}>
                  {s.href && state !== 'current' ? (
                    <Link href={s.href} onClick={() => setSheet(null)} className="block">
                      {row}
                    </Link>
                  ) : (
                    <span aria-current={state === 'current' ? 'step' : undefined} className="block">
                      {row}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        {/* Change what you are sizing for without scrolling back up to the card. */}
        {sheet === 'answer' && rows.length > 0 && (
          <ul className="border-t border-zon-rule py-1.5 lg:hidden">
            {rows.map(r => {
              const inner = (
                <span className="flex min-h-11 items-center justify-between gap-3 py-1">
                  <span className="flex min-w-0 flex-col">
                    <span className={cn('text-[13px]', r.selected ? 'font-semibold text-zon-ink' : 'text-zon-body')}>
                      {r.label}
                    </span>
                    {r.sub && <span className="text-[11px] tabular-nums text-zon-muted">{r.sub}</span>}
                  </span>
                  <span className="shrink-0 text-[15px] font-bold tabular-nums text-zon-ink">{r.value}</span>
                </span>
              )
              return (
                <li key={r.id}>
                  {r.onSelect ? (
                    <button
                      type="button"
                      onClick={() => { r.onSelect?.(); setSheet(null) }}
                      aria-pressed={r.selected}
                      className={cn(
                        'block w-full rounded-lg px-2 text-left transition-colors',
                        r.selected && 'bg-zon-gold-tint ring-1 ring-zon-gold-light',
                      )}
                    >
                      {inner}
                    </button>
                  ) : (
                    <span className="block px-2">{inner}</span>
                  )}
                </li>
              )
            })}
            {onJumpToAnswer && (
              <li>
                <button
                  type="button"
                  onClick={() => { setSheet(null); onJumpToAnswer() }}
                  className="min-h-11 w-full px-2 text-left text-xs font-medium text-zon-gold-deep"
                >
                  Back to the full answer ↑
                </button>
              </li>
            )}
          </ul>
        )}

      </div>
    </nav>
  )
}
