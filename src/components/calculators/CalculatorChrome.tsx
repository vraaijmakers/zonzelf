'use client'

import Link from 'next/link'
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import CalculatorDisclaimer from '@/components/CalculatorDisclaimer'
import StepSpine, { type AnswerSummary } from '@/components/calculators/StepSpine'
import StepActions from '@/components/calculators/StepActions'
import { stepById, type StepId } from '@/lib/calc-steps'

interface AnchorApi {
  register: (el: HTMLElement | null) => void
  setVisible: (visible: boolean) => void
}

const AnchorContext = createContext<AnchorApi | null>(null)

/**
 * Wraps a step's capacity result. Its only job is to tell the chrome whether
 * the answer is currently on screen — when it is not, the sticky strip shows
 * the number instead of the step header.
 *
 * The rich card itself stays in the page and is never re-rendered into the
 * bar, so there is no second copy of it in the DOM to duplicate ids or drift
 * out of step. What the bar shows comes from the `answer` prop on the chrome.
 */
export function AnswerAnchor({ children }: { children: ReactNode }) {
  const api = useContext(AnchorContext)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !api) return
    api.register(el)

    // The navbar (64px) and the spine (~56px) sit over the top of the page, so
    // the card counts as gone only once it is behind them — otherwise the bar
    // appears while the card is still legible underneath.
    const io = new IntersectionObserver(
      ([entry]) => api.setVisible(entry.isIntersecting),
      { rootMargin: '-124px 0px 0px 0px', threshold: 0 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      api.register(null)
    }
  }, [api])

  return <div ref={ref}>{children}</div>
}

export default function CalculatorChrome({
  step,
  title,
  lede,
  note,
  answer,
  actionSummary,
  children,
}: {
  step: StepId
  title: string
  lede: string
  /** The smaller paragraph under the lede — scope caveats, links to guides. */
  note?: ReactNode
  /** Drives the sticky readout once the answer card scrolls away. */
  answer?: AnswerSummary
  /** Live readout for the action bar's desktop middle slot. */
  actionSummary?: ReactNode
  children: ReactNode
}) {
  const [answerVisible, setAnswerVisible] = useState(true)
  const anchorEl = useRef<HTMLElement | null>(null)

  const register = useCallback((el: HTMLElement | null) => { anchorEl.current = el }, [])
  // Stable identity — AnswerAnchor's effect depends on it, and a fresh object
  // every render would re-create the observer on every keystroke.
  const api = useMemo<AnchorApi>(() => ({ register, setVisible: setAnswerVisible }), [register])

  const jumpToAnswer = useCallback(() => {
    const el = anchorEl.current
    if (!el) return
    // Clear the two sticky bars overhead, plus a little air.
    const top = el.getBoundingClientRect().top + window.scrollY - 132
    window.scrollTo({ top, behavior: 'smooth' })
  }, [])

  return (
    <AnchorContext.Provider value={api}>
      <StepSpine
        current={step}
        answer={!answerVisible && answer ? answer : null}
        onJumpToAnswer={jumpToAnswer}
      />

      {/* pb clears the pinned action bar — content must never hide behind it. */}
      <div className="mx-auto max-w-5xl px-4 pb-28 pt-8">
        <header className="mb-6">
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-2 text-sm text-zon-muted">
            <Link href="/calculators" className="hover:underline">Calculators</Link>
            <span aria-hidden="true">›</span>
            <span className="text-zon-body">{stepById(step).label}</span>
          </nav>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-zon-ink md:text-3xl">{title}</h1>
          <p className="text-zon-body">{lede}</p>
          {note && <div className="mt-2 text-sm text-zon-muted">{note}</div>}
        </header>

        <CalculatorDisclaimer />

        {children}
      </div>

      <StepActions current={step} summary={actionSummary} />
    </AnchorContext.Provider>
  )
}
